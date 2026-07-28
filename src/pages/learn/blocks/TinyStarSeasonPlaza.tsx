import { TINY_STAR_CHARACTER_CHOICES, TINY_STAR_PLAZA_ASSETS } from './tinyStarAssets'
import './tinyStarAssetIntegration.css'

interface TinyStarSeasonPlazaProps {
  completedCount: number
  sceneCount: number
  seasonComplete: boolean
}

const CHAPTER_COUNT = 6

function completedChapterCount(completedCount: number, sceneCount: number) {
  if (sceneCount <= 0) return 0
  return Math.min(CHAPTER_COUNT, Math.floor(completedCount / (sceneCount / CHAPTER_COUNT)))
}

export function TinyStarSeasonPlaza({
  completedCount,
  sceneCount,
  seasonComplete,
}: TinyStarSeasonPlazaProps) {
  const litStars = seasonComplete ? CHAPTER_COUNT : completedChapterCount(completedCount, sceneCount)
  const [lumilo, tuanTuan, dotDot] = TINY_STAR_CHARACTER_CHOICES

  return (
    <div
      className="tsv-world-sky tsv-season-plaza"
      data-testid="story-world-cast"
      data-progress-stars={litStars}
      aria-hidden="true"
    >
      <img
        className="tsv-season-plaza-bg"
        src={seasonComplete ? TINY_STAR_PLAZA_ASSETS.complete : TINY_STAR_PLAZA_ASSETS.progress}
        alt=""
        draggable={false}
      />
      {!seasonComplete && litStars > 0 && (
        <div className="tsv-season-plaza-stars" data-testid="story-world-progress-stars">
          {Array.from({ length: litStars }, (_, index) => (
            <span className="tsv-season-plaza-star" key={index}>
              ★
            </span>
          ))}
        </div>
      )}
      <img
        src={seasonComplete ? lumilo.previewAssets.at(-1) : lumilo.asset}
        alt=""
        data-avatar={lumilo.name}
        className="tsv-world-character tsv-world-lumi bsx-lumilo"
        draggable={false}
      />
      <img
        src={seasonComplete ? dotDot.previewAssets.at(-1) : dotDot.asset}
        alt=""
        data-avatar={dotDot.name}
        className="tsv-world-character tsv-world-dot bsx-dot-dot"
        draggable={false}
      />
      <img
        src={seasonComplete ? tuanTuan.previewAssets.at(-1) : tuanTuan.asset}
        alt=""
        data-avatar={tuanTuan.name}
        className="tsv-world-character tsv-world-tuan bsx-tuan"
        draggable={false}
      />
    </div>
  )
}
