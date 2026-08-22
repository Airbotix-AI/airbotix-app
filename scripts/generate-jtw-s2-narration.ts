import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { JOURNEY_WEST_S2_NARRATIONS } from '../src/pages/learn/blocks/story-parts/journeyWestS2Narration'

const VOICE_ID = 'W8lBaQb9YIoddhxfQNLP'
const VOICE_NAME = 'Siqi Liu'
const MODEL_ID = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'
const API_KEY = process.env.ELEVENLABS_API_KEY
const APP_AUDIO_DIRECTORY = path.resolve('public/story-blocks/journey-to-the-west/audio/s2')
const MIRROR_DIRECTORY = process.argv[2] ? path.resolve(process.argv[2]) : null

if (!API_KEY) throw new Error('ELEVENLABS_API_KEY is required')

interface TrackRecord {
  partId: string
  title: string
  file: string
  bytes: number
  durationSeconds: number
  sha256: string
  textSha256: string
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function synthesize(text: string, attempt = 1): Promise<Buffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`,
    {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.58,
          similarity_boost: 0.78,
          style: 0.18,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!response.ok) {
    const message = await response.text()
    if (attempt < 4 && (response.status === 429 || response.status >= 500)) {
      await delay(1500 * attempt)
      return synthesize(text, attempt + 1)
    }
    throw new Error(`ElevenLabs ${response.status}: ${message.slice(0, 300)}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

function durationSeconds(filePath: string): number {
  const value = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' },
  )
  return Number(Number(value.trim()).toFixed(3))
}

async function produce(index: number): Promise<TrackRecord> {
  const narration = JOURNEY_WEST_S2_NARRATIONS[index]
  const file = `${narration.partId}-v01.mp3`
  const destination = path.join(APP_AUDIO_DIRECTORY, file)
  let existing = false

  try {
    existing = (await stat(destination)).size > 1000
  } catch {
    existing = false
  }

  if (!existing) {
    const audio = await synthesize(narration.text)
    await writeFile(destination, audio)
  }

  const audio = await readFile(destination)
  if (MIRROR_DIRECTORY) await writeFile(path.join(MIRROR_DIRECTORY, file), audio)
  process.stdout.write(`[${index + 1}/48] ${narration.partId}${existing ? ' reused' : ' generated'}\n`)
  return {
    partId: narration.partId,
    title: narration.title,
    file,
    bytes: audio.byteLength,
    durationSeconds: durationSeconds(destination),
    sha256: createHash('sha256').update(audio).digest('hex'),
    textSha256: createHash('sha256').update(narration.text).digest('hex'),
  }
}

await mkdir(APP_AUDIO_DIRECTORY, { recursive: true })
if (MIRROR_DIRECTORY) await mkdir(MIRROR_DIRECTORY, { recursive: true })

const tracks: TrackRecord[] = []
const worker = async (offset: number) => {
  for (let index = offset; index < JOURNEY_WEST_S2_NARRATIONS.length; index += 3) {
    tracks[index] = await produce(index)
  }
}
await Promise.all([worker(0), worker(1), worker(2)])

const manifest = {
  schemaVersion: 1,
  season: 'journey-to-the-west-s2',
  generatedAt: new Date().toISOString(),
  provider: 'ElevenLabs',
  voice: { id: VOICE_ID, name: VOICE_NAME, locale: 'zh-CN' },
  model: MODEL_ID,
  outputFormat: OUTPUT_FORMAT,
  voiceSettings: { stability: 0.58, similarityBoost: 0.78, style: 0.18, useSpeakerBoost: true },
  trackCount: tracks.length,
  tracks,
}
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`
await writeFile(path.join(APP_AUDIO_DIRECTORY, 'narration-manifest.json'), manifestJson)
if (MIRROR_DIRECTORY) await writeFile(path.join(MIRROR_DIRECTORY, 'narration-manifest.json'), manifestJson)

process.stdout.write(`Completed ${tracks.length} formal narration tracks.\n`)
