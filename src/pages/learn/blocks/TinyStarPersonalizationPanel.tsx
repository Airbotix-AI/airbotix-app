import type { Character } from './blocksModel'
import { useBlocksStore } from './blocksStore'
import {
  TINY_STAR_A2_LEFT_BACKGROUND,
  TINY_STAR_A2_RIGHT_BACKGROUND,
  TINY_STAR_BREAKFAST_CART_ASSET,
  TINY_STAR_BREAKFAST_CART_ID,
  TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE,
  TINY_STAR_DELIVERY_DISTANCES,
  TINY_STAR_DELIVERY_PARCELS,
} from './tinyStarStageTargets'
import {
  TINY_STAR_BELL_CAST,
  TINY_STAR_FINALE_RINGER_ID,
} from './tinyStarBellTower'
import {
  TINY_STAR_DUET_CAST,
  TINY_STAR_DUET_FIRST_ID,
  TINY_STAR_DUET_SECOND_ID,
} from './tinyStarDuet'

interface TinyStarPersonalizationPanelProps {
  isA2PersonalShip: boolean
  isA3PersonalShip: boolean
  isA4PersonalShip: boolean
  isA5PersonalShip: boolean
  isA6Finale: boolean
  selectedHomeGx: number | undefined
  selectedDeliveryDistance: number | undefined
  selectedChar: Character
  deliveryCart?: Character
  duetFirst?: Character
  duetSecond?: Character
  finaleRinger?: Character
}

export function TinyStarPersonalizationPanel({
  isA2PersonalShip,
  isA3PersonalShip,
  isA4PersonalShip,
  isA5PersonalShip,
  isA6Finale,
  selectedHomeGx,
  selectedDeliveryDistance,
  selectedChar,
  deliveryCart,
  duetFirst,
  duetSecond,
  finaleRinger,
}: TinyStarPersonalizationPanelProps) {
  return (
    <>
      {isA2PersonalShip && (
        <div className="bsx-home-picker" data-testid="a2-s-endpoint-picker">
          <div className="bsx-home-picker-title">
            <span aria-hidden>⭐</span>
            <div>
              <strong>Choose my home star</strong>
              <small>Pick where Tuan Tuan should land</small>
            </div>
          </div>
          <div className="bsx-home-choices" role="group" aria-label="Choose my home star">
            <button
              type="button"
              data-testid="a2-s-endpoint-left"
              className={`bsx-home-choice${selectedHomeGx === 6 ? ' selected' : ''}`}
              aria-pressed={selectedHomeGx === 6}
              onClick={() => useBlocksStore.getState().setBackground(TINY_STAR_A2_LEFT_BACKGROUND)}
            >
              <span aria-hidden>⬅️</span>
              <strong>Left home</strong>
              <span className="bsx-home-star" aria-hidden>
                ⭐
              </span>
            </button>
            <button
              type="button"
              data-testid="a2-s-endpoint-right"
              className={`bsx-home-choice${selectedHomeGx === 10 ? ' selected' : ''}`}
              aria-pressed={selectedHomeGx === 10}
              onClick={() => useBlocksStore.getState().setBackground(TINY_STAR_A2_RIGHT_BACKGROUND)}
            >
              <span className="bsx-home-star" aria-hidden>
                ⭐
              </span>
              <strong>Right home</strong>
              <span aria-hidden>➡️</span>
            </button>
          </div>
        </div>
      )}

      {isA3PersonalShip && (
        <div className="bsx-home-picker" data-testid="a3-s-character-picker">
          <div className="bsx-home-picker-title"><span aria-hidden>✨</span><div><strong>Choose my secret friend</strong><small>This changes the saved character, not the blocks</small></div></div>
          <div className="bsx-home-choices" role="group" aria-label="Choose my secret friend">
            {[
              ['Dot Dot', '🐱', '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png'],
              ['Tuan Tuan', '🐻', '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png'],
              ['Lumilo', '⭐', '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png'],
            ].map(([name, emoji, asset]) => (
              <button key={name} type="button" data-testid={`a3-s-character-${name.toLowerCase().replaceAll(' ', '-')}`}
                className={`bsx-home-choice${selectedChar.asset === asset ? ' selected' : ''}`}
                aria-pressed={selectedChar.asset === asset}
                onClick={() => useBlocksStore.getState().setCharacterIdentity('dot-dot', name, emoji, asset)}>
                <img src={asset} alt="" className="bsx-character-asset-thumb" /><strong>{name}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {isA4PersonalShip && (
        <div className="bsx-home-picker bsx-delivery-picker" data-testid="a4-s-delivery-picker">
          <div className="bsx-home-picker-title">
            <span aria-hidden>📦</span>
            <div>
              <strong>Choose my delivery stop</strong>
              <small>Then match the Right number to it</small>
            </div>
          </div>
          <div className="bsx-home-choices" role="group" aria-label="Choose my delivery stop">
            {TINY_STAR_DELIVERY_DISTANCES.map((distance) => {
              const selected = selectedDeliveryDistance === distance
              return (
                <button
                  key={distance}
                  type="button"
                  data-testid={`a4-s-stop-${distance}`}
                  className={`bsx-home-choice${selected ? ' selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() =>
                    useBlocksStore
                      .getState()
                      .setBackground(TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[distance])
                  }
                >
                  <span aria-hidden>➡️</span>
                  <strong>
                    {distance} {distance === 1 ? 'space' : 'spaces'}
                  </strong>
                </button>
              )
            })}
          </div>
          <div className="bsx-home-choices" role="group" aria-label="Choose what I deliver">
            {TINY_STAR_DELIVERY_PARCELS.map((parcel) => {
              const selected = deliveryCart?.name === parcel.name
              return (
                <button
                  key={parcel.id}
                  type="button"
                  data-testid={`a4-s-parcel-${parcel.id}`}
                  className={`bsx-home-choice${selected ? ' selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() =>
                    useBlocksStore
                      .getState()
                      .setCharacterIdentity(
                        TINY_STAR_BREAKFAST_CART_ID,
                        parcel.name,
                        parcel.emoji,
                        TINY_STAR_BREAKFAST_CART_ASSET,
                      )
                  }
                >
                  <span aria-hidden>{parcel.emoji}</span>
                  <strong>{parcel.label}</strong>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isA5PersonalShip && (
        <div className="bsx-home-picker bsx-cast-picker" data-testid="a5-s-cast-picker">
          <div className="bsx-home-picker-title">
            <span aria-hidden>⭐🐻🐱</span>
            <div>
              <strong>Choose my two friends</strong>
              <small>The first one greets; the second one waits</small>
            </div>
          </div>
          {(
            [
              { slot: 'first', charId: TINY_STAR_DUET_FIRST_ID, actor: duetFirst, label: 'Who greets first' },
              { slot: 'second', charId: TINY_STAR_DUET_SECOND_ID, actor: duetSecond, label: 'Who waits, then greets' },
            ] as const
          ).map((row) => (
            <div key={row.slot} className="bsx-home-choices" role="group" aria-label={row.label}>
              {TINY_STAR_DUET_CAST.map((friend) => {
                const selected = row.actor?.asset === friend.asset
                return (
                  <button
                    key={friend.id}
                    type="button"
                    data-testid={`a5-s-${row.slot}-${friend.id}`}
                    className={`bsx-home-choice${selected ? ' selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() =>
                      useBlocksStore
                        .getState()
                        .setCharacterIdentity(row.charId, friend.name, friend.emoji, friend.asset)
                    }
                  >
                    <img src={friend.asset} alt="" className="bsx-character-asset-thumb" />
                    <strong>{friend.name}</strong>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {isA6Finale && (
        <div className="bsx-home-picker bsx-cast-picker" data-testid="a6-s-cast-picker">
          <div className="bsx-home-picker-title">
            <span aria-hidden>🔔</span>
            <div>
              <strong>Who rings the bell?</strong>
              <small>Choose the friend who brings the morning light back</small>
            </div>
          </div>
          <div className="bsx-home-choices" role="group" aria-label="Who rings the bell">
            {TINY_STAR_BELL_CAST.map((friend) => {
              const selected = finaleRinger?.asset === friend.asset
              return (
                <button
                  key={friend.id}
                  type="button"
                  data-testid={`a6-s-ringer-${friend.id}`}
                  className={`bsx-home-choice${selected ? ' selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() =>
                    useBlocksStore
                      .getState()
                      .setCharacterIdentity(
                        TINY_STAR_FINALE_RINGER_ID,
                        friend.name,
                        friend.emoji,
                        friend.asset,
                      )
                  }
                >
                  <img src={friend.asset} alt="" className="bsx-character-asset-thumb" />
                  <strong>{friend.name}</strong>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
