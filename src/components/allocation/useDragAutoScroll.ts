import { useEffect, type RefObject } from 'react'

type Options = {
  active: boolean
  boardRef: RefObject<HTMLElement | null>
  laneBodyRefs: RefObject<Map<string, HTMLElement>>
}

const EDGE = 64
const SPEED = 14

export function useDragAutoScroll({ active, boardRef, laneBodyRefs }: Options) {
  useEffect(() => {
    if (!active) return

    function onMove(e: PointerEvent) {
      const y = e.clientY

      const board = boardRef.current
      if (board) {
        const rect = board.getBoundingClientRect()
        if (y < rect.top + EDGE) board.scrollTop -= SPEED
        else if (y > rect.bottom - EDGE) board.scrollTop += SPEED
      }

      laneBodyRefs.current?.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (y < rect.top + EDGE && y > rect.top - 48) el.scrollTop -= SPEED
        else if (y > rect.bottom - EDGE && y < rect.bottom + 48) el.scrollTop += SPEED
      })
    }

    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [active, boardRef, laneBodyRefs])
}
