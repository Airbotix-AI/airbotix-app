import { getJourneyWestS2SceneModel } from './journeyWestS2SceneModel'

export function JourneyWestS2Scene({ partId, resolved }: { partId: string; resolved: boolean }) {
  const scene = getJourneyWestS2SceneModel(partId, resolved)
  return (
    <figure
      className="overflow-hidden rounded-3xl border border-brand-sunshine/40 bg-canvas-pure shadow-sm"
      data-testid={`${partId}-scene`}
      data-scene-state={resolved ? 'resolved' : 'before'}
    >
      <div className="relative aspect-video overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover" src={scene.background} alt="" aria-hidden="true" />
        {scene.actors.map((actor) => (
          <img
            key={actor.alt}
            className="absolute bottom-[2%] max-h-[78%] object-contain drop-shadow-lg"
            style={{ left: `${actor.left}%`, width: `${actor.width}%` }}
            src={actor.asset}
            alt={actor.alt}
          />
        ))}
        {scene.props.map((item) => (
          <img
            key={item.alt}
            className="absolute bottom-[5%] max-h-[30%] object-contain drop-shadow-md"
            style={{ left: `${item.left}%`, width: `${item.width}%` }}
            src={item.asset}
            alt={item.alt}
          />
        ))}
      </div>
      <figcaption className="px-4 py-3 text-[13px] font-semibold text-ink-soft">
        第 {scene.chapter} 章 · Part {scene.part} · {resolved ? '程序结果已和故事证据对齐' : '先观察场景，再读故事证据'}
      </figcaption>
    </figure>
  )
}
