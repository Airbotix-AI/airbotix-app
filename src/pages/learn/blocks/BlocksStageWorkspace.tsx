import type { PointerEvent as ReactPointerEvent, Ref } from 'react'
import { Image as ImageIcon } from 'lucide-react'

import { CharacterVisual } from './CharacterVisual'
import { FadeScroller } from './FadeScroller'
import { StoryCoachPanel } from './StoryCoachPanel'
import { ZoneTag } from './ZoneTag'
import { READONLY_EDIT_DISABLED } from './blocksStudioChrome'
import {
  GRID_H,
  GRID_W,
  MAX_PAGES,
  type BlocksProject,
  type Character,
  type Page,
} from './blocksModel'
import { useBlocksStore } from './blocksStore'
import type { CharacterPerformance } from './characterPerformance'
import type { StoryCoachCue, StoryMission } from './curriculumGuides'
import { startState, type SpriteState } from './interpreter'
import { sceneId } from './library'
import { sfx } from './sounds'
import { speechBubbleStyle } from './spriteLayout'
import './tinyStarAssetIntegration.css'
import {
  TINY_STAR_BELL_STILL_ASSET,
  TINY_STAR_BELL_SWING_ASSET,
  TINY_STAR_BELL_TOWER_ID,
  TINY_STAR_FINALE_RINGER_ID,
  isTinyStarBellPageId,
} from './tinyStarBellTower'

interface BlocksStageWorkspaceProps {
  page: Page
  project: BlocksProject
  selectedChar: Character
  readOnly: boolean
  openFriendPicker: () => void
  stageRef: Ref<HTMLDivElement>
  completionScene: string | null
  stageVisualScene: string
  lockedStageTargetGx?: number
  openScenePicker: () => void
  storyMission?: StoryMission
  missionOpen: boolean
  visibleCoachCue: StoryCoachCue
  running: boolean
  go: () => void
  runStates: Map<string, { st: SpriteState; dur: number }> | null
  says: Map<string, string>
  bellSwinging: boolean
  dragging: string | null
  onSpriteDown: (event: ReactPointerEvent, id: string) => void
  onSpriteMove: (event: ReactPointerEvent, id: string) => void
  onSpriteUp: (id: string) => void
  missionCompleted: boolean
  isA6Finale: boolean
  characterPerformances: Map<string, CharacterPerformance>
}

export function BlocksStageWorkspace({
  page,
  project,
  selectedChar,
  readOnly,
  openFriendPicker,
  stageRef,
  completionScene,
  stageVisualScene,
  lockedStageTargetGx,
  openScenePicker,
  storyMission,
  missionOpen,
  visibleCoachCue,
  running,
  go,
  runStates,
  says,
  bellSwinging,
  dragging,
  onSpriteDown,
  onSpriteMove,
  onSpriteUp,
  missionCompleted,
  isA6Finale,
  characterPerformances,
}: BlocksStageWorkspaceProps) {
  return (
    <section className="bsx-middle">
      <aside className="bsx-railbox" style={{ gridArea: 'chars' }} aria-label="Characters">
        <FadeScroller className="bsx-railscroll">
          <ZoneTag zone="chars" emoji="🐱" label="Characters" />
          {page.characters.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`char-thumb-${c.id}`}
              onClick={() => useBlocksStore.getState().selectChar(c.id)}
              className="bsx-press relative grid aspect-square w-full max-w-[72px] place-items-center rounded-2xl text-[30px]"
              style={
                c.id === selectedChar?.id
                  ? { boxShadow: '0 0 0 4px #5DAEFF, 0 4px 0 var(--bsx-border)' }
                  : undefined
              }
              title={c.name}
            >
              <CharacterVisual
                character={c}
                className={c.asset ? 'bsx-character-asset-thumb' : undefined}
              />
              {c.id === selectedChar?.id &&
                page.characters.length > 1 &&
                !(c.id === TINY_STAR_BELL_TOWER_ID && isTinyStarBellPageId(page.id)) && (
                <span
                  role="button"
                  data-testid={`remove-character-${c.id}`}
                  aria-disabled={readOnly || undefined}
                  className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
                  title={`Remove ${c.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (readOnly) return
                    sfx.trash()
                    useBlocksStore.getState().removeCharacter(c.id)
                  }}
                >
                  ✕
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            data-testid="add-character"
            onClick={openFriendPicker}
            disabled={readOnly}
            aria-disabled={readOnly || undefined}
            className={`grid aspect-square w-full max-w-[72px] place-items-center rounded-2xl border-2 border-dashed border-brand-sky/50 text-[26px] text-brand-sky${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
            title="Add a character"
          >
            ＋
          </button>
        </FadeScroller>
      </aside>

      <div className="flex min-h-0 flex-col gap-2" style={{ gridArea: 'stage' }}>
        <div
          ref={stageRef}
          data-testid="blocks-stage"
          data-scene={sceneId(page.background)}
          data-story-scene-state={completionScene ? 'resolved' : 'before'}
          data-story-scene-visual={stageVisualScene}
          data-story-target-gx={lockedStageTargetGx}
          className="bsx-stage min-h-[180px] flex-1"
          aria-label="Stage"
        >
          <div className="bsx-grid" />
          <div className="bsx-deco bsx-deco-a" />
          <div className="bsx-deco bsx-deco-b" />
          <div className="bsx-deco bsx-deco-c" />
          <div className="bsx-hill" />
          <button
            type="button"
            data-testid="scene-btn"
            className={`bsx-scene-btn${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
            title="Change the background"
            disabled={readOnly}
            aria-disabled={readOnly || undefined}
            onClick={() => {
              if (readOnly) return
              sfx.tap()
              openScenePicker()
            }}
          >
            <ImageIcon size={20} />
          </button>
          <ZoneTag zone="stage" emoji="🎬" label="Stage" />
          {storyMission && !missionOpen && (
            <StoryCoachPanel
              mission={storyMission}
              cue={visibleCoachCue}
              running={running}
              onGo={go}
            />
          )}
          {page.characters.map((c) => {
            const run = runStates?.get(c.id)
            const st = run?.st ?? startState(c)
            const dur = run?.dur ?? 0
            const say = says.get(c.id)
            const isBellTower =
              c.id === TINY_STAR_BELL_TOWER_ID && isTinyStarBellPageId(page.id)
            return (
              <div key={c.id}>
                {say && (
                  <div
                    className="bsx-say"
                    data-testid={`speech-bubble-${c.id}`}
                    style={speechBubbleStyle(st, Boolean(c.asset))}
                  >
                    {say}
                  </div>
                )}
                <div
                  data-testid={`sprite-${c.id}`}
                  data-character-id={c.id}
                  data-gx={st.gx}
                  data-gy={st.gy}
                  data-bell-state={
                    isBellTower ? (bellSwinging ? 'swing' : 'still') : undefined
                  }
                  className={`bsx-sprite${dragging === c.id ? ' dragging' : ''}`}
                  onPointerDown={(e) => onSpriteDown(e, c.id)}
                  onPointerMove={(e) => onSpriteMove(e, c.id)}
                  onPointerUp={() => onSpriteUp(c.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    left: `${((st.gx + 0.5) / GRID_W) * 100}%`,
                    top: `${((st.gy + 0.5) / GRID_H) * 100}%`,
                    zIndex: c.id === selectedChar?.id ? 2 : 1,
                    fontSize: 'clamp(40px,5.5vw,64px)',
                    opacity: st.visible ? 1 : 0.12,
                    transform: `translate(-50%,-50%) rotate(${st.rot}deg) scale(${st.size})`,
                    transition:
                      dur > 0
                        ? `left ${dur}ms ease, top ${dur}ms ease, transform ${dur}ms ease, opacity ${dur}ms ease`
                        : 'none',
                  }}
                  title={
                    isBellTower
                      ? `${c.name} — fixed story target`
                      : `${c.name} — drag to move, tap to run 👆, drag to the bin to remove`
                  }
                >
                  {isBellTower ? (
                    <img
                      alt=""
                      aria-hidden="true"
                      className="bsx-character-asset"
                      data-testid="morning-bell-visual"
                      draggable={false}
                      src={
                        bellSwinging ? TINY_STAR_BELL_SWING_ASSET : TINY_STAR_BELL_STILL_ASSET
                      }
                    />
                  ) : (
                    <CharacterVisual
                      character={c}
                      className={c.asset ? 'bsx-character-asset' : undefined}
                      performance={
                        missionCompleted &&
                        (storyMission?.hero.asset === c.asset ||
                          (isA6Finale && c.id === TINY_STAR_FINALE_RINGER_ID))
                          ? 'success'
                          : characterPerformances.get(c.id)
                      }
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <aside className="bsx-railbox" style={{ gridArea: 'pages' }} aria-label="Pages">
        <FadeScroller className="bsx-railscroll">
          <ZoneTag zone="pages" emoji="📖" label="Pages" />
          {project.pages.map((p, i) => (
            <div key={p.id} className="relative w-full max-w-[96px]">
              <button
                type="button"
                data-testid={`page-thumb-${i}`}
                onClick={() => {
                  sfx.page()
                  useBlocksStore.getState().selectPage(p.id)
                }}
                className={`bsx-press bsx-stage bsx-pagethumb${p.id === page.id ? ' sel' : ''}`}
                data-scene={sceneId(p.background)}
                style={{ aspectRatio: '4/3' }}
                title={`Page ${i + 1}`}
              >
                <span className="bsx-hill" />
                <span className="bsx-pagethumb-n">{i + 1}</span>
                <span className="bsx-pagethumb-emoji">{p.characters[0]?.emoji ?? '🧩'}</span>
              </button>
              {project.pages.length > 1 && (
                <button
                  type="button"
                  data-testid={`remove-page-${i}`}
                  disabled={readOnly}
                  aria-disabled={readOnly || undefined}
                  className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brand-coral text-[11px] font-bold text-white shadow${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
                  title={`Remove page ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (readOnly) return
                    sfx.trash()
                    useBlocksStore.getState().removePage(p.id)
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {project.pages.length < MAX_PAGES && (
            <button
              type="button"
              data-testid="add-page"
              onClick={() => {
                if (readOnly) return
                sfx.add()
                useBlocksStore.getState().addPage()
              }}
              disabled={readOnly}
              aria-disabled={readOnly || undefined}
              className={`grid w-full max-w-[96px] place-items-center rounded-xl border-2 border-dashed border-brand-coral/50 text-[22px] text-brand-coral${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
              style={{ aspectRatio: '4/3' }}
              title="Add a page"
            >
              ＋
            </button>
          )}
        </FadeScroller>
      </aside>
    </section>
  )
}
