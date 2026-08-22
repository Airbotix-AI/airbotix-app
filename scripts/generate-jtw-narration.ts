import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  JOURNEY_WEST_NARRATIONS,
  type JourneyWestNarration,
} from '../src/pages/learn/blocks/story-parts/journeyWestNarration'

const VOICE_ID = 'XEQBC9sleaE3f5ff82UR'
const VOICE_NAME = 'Charlotte - Podcasts & Lifestyle'
const MODEL_ID = 'eleven_multilingual_v2'
const OUTPUT_FORMAT = 'mp3_44100_128'
const API_KEY = process.env.ELEVENLABS_API_KEY
const AUDIO_ROOT = path.resolve('public/story-blocks/journey-to-the-west/audio/en-AU')
const MIRROR_ROOT = process.argv[2] ? path.resolve(process.argv[2]) : null

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
        language_code: 'en',
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
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    { encoding: 'utf8' },
  )
  return Number(Number(value.trim()).toFixed(3))
}

function seasonFor(partId: string): 's1' | 's2' {
  return partId.startsWith('jtw-s1-') ? 's1' : 's2'
}

async function produce(index: number, narration: JourneyWestNarration): Promise<TrackRecord> {
  const season = seasonFor(narration.partId)
  const file = `${narration.partId}-v02.mp3`
  const relativeFile = `${season}/${file}`
  const directory = path.join(AUDIO_ROOT, season)
  const destination = path.join(directory, file)
  await mkdir(directory, { recursive: true })

  let existing = false
  try {
    existing = (await stat(destination)).size > 1000
  } catch {
    existing = false
  }

  if (!existing) await writeFile(destination, await synthesize(narration.text))

  const audio = await readFile(destination)
  if (MIRROR_ROOT) {
    const mirrorDirectory = path.join(MIRROR_ROOT, season)
    await mkdir(mirrorDirectory, { recursive: true })
    await writeFile(path.join(mirrorDirectory, file), audio)
  }
  process.stdout.write(
    `[${index + 1}/${JOURNEY_WEST_NARRATIONS.length}] ${narration.partId}${existing ? ' reused' : ' generated'}\n`,
  )
  return {
    partId: narration.partId,
    title: narration.title,
    file: relativeFile,
    bytes: audio.byteLength,
    durationSeconds: durationSeconds(destination),
    sha256: createHash('sha256').update(audio).digest('hex'),
    textSha256: createHash('sha256').update(narration.text).digest('hex'),
  }
}

await mkdir(AUDIO_ROOT, { recursive: true })
if (MIRROR_ROOT) await mkdir(MIRROR_ROOT, { recursive: true })

const tracks: TrackRecord[] = []
const worker = async (offset: number) => {
  for (let index = offset; index < JOURNEY_WEST_NARRATIONS.length; index += 3) {
    tracks[index] = await produce(index, JOURNEY_WEST_NARRATIONS[index])
  }
}
await Promise.all([worker(0), worker(1), worker(2)])

const manifest = {
  schemaVersion: 2,
  collection: 'journey-to-the-west-s1-s2',
  locale: 'en-AU',
  generatedAt: new Date().toISOString(),
  provider: 'ElevenLabs',
  voice: { id: VOICE_ID, name: VOICE_NAME, language: 'en', accent: 'australian' },
  model: MODEL_ID,
  outputFormat: OUTPUT_FORMAT,
  voiceSettings: {
    stability: 0.58,
    similarityBoost: 0.78,
    style: 0.18,
    useSpeakerBoost: true,
  },
  trackCount: tracks.length,
  seasons: { s1: tracks.filter((track) => track.partId.startsWith('jtw-s1-')).length, s2: tracks.filter((track) => track.partId.startsWith('jtw-s2-')).length },
  tracks,
}
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`
await writeFile(path.join(AUDIO_ROOT, 'narration-manifest.json'), manifestJson)
if (MIRROR_ROOT) await writeFile(path.join(MIRROR_ROOT, 'narration-manifest.json'), manifestJson)

process.stdout.write(`Completed ${tracks.length} fixed English narration tracks.\n`)
