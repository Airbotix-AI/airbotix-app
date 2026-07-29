import { useCallback, useEffect, useRef, useState } from 'react'

import { TINY_STAR_BELL_SWING_MS } from './tinyStarBellTower'

export function useTinyStarBellVisual() {
  const [bellSwinging, setBellSwinging] = useState(false)
  const bellSwingTimerRef = useRef<number | undefined>(undefined)

  const resetBellVisual = useCallback(() => {
    window.clearTimeout(bellSwingTimerRef.current)
    bellSwingTimerRef.current = undefined
    setBellSwinging(false)
  }, [])

  const swingBell = useCallback(() => {
    window.clearTimeout(bellSwingTimerRef.current)
    setBellSwinging(true)
    bellSwingTimerRef.current = window.setTimeout(() => {
      bellSwingTimerRef.current = undefined
      setBellSwinging(false)
    }, TINY_STAR_BELL_SWING_MS)
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(bellSwingTimerRef.current)
    },
    [],
  )

  return { bellSwinging, resetBellVisual, swingBell }
}
