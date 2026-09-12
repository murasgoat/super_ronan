"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { canMove } from "@/lib/collision"

export type Facing = "up" | "down" | "left" | "right"
export type PlayerAction = "idle" | "walk" | "attack" | "jump"

export interface PlayerState {
  x: number
  y: number
  facing: Facing
  action: PlayerAction
  jumping: boolean
  attacking: boolean
}

const SPEED = 5 // pixels por frame
const ATTACK_MS = 320
const JUMP_MS = 520

/**
 * Mapeamento de teclas:
 *  - W / A / S / D  -> movimento (cima, esquerda, baixo, direita)
 *  - J / Espaço     -> ataque
 *  - K / Shift       -> pulo
 * Todas as quatro setas também movem o personagem.
 */
export function usePlayerControls(enabled: boolean, onAttack?: () => void, stage: number = 1, speed: number = SPEED) {
  const [state, setState] = useState<PlayerState>({
    x: 0,
    y: 0,
    facing: "down",
    action: "idle",
    jumping: false,
    attacking: false,
  })

  const keys = useRef<Set<string>>(new Set())
  const attackUntil = useRef(0)
  const jumpUntil = useRef(0)
  const raf = useRef<number | null>(null)

  const triggerAttack = useCallback(() => {
    attackUntil.current = performance.now() + ATTACK_MS
    onAttack?.()
  }, [onAttack])

  const triggerJump = useCallback(() => {
    if (performance.now() < jumpUntil.current) return
    jumpUntil.current = performance.now() + JUMP_MS
  }, [])

  useEffect(() => {
    if (!enabled) return

    const down = (e: KeyboardEvent) => {
      const code = e.code
      // Impede rolagem da página com Espaço/setas.
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        e.preventDefault()
      }

      if (code === "KeyJ" || code === "Space") {
        triggerAttack()
        return
      }
      if (code === "KeyK" || code === "ShiftLeft" || code === "ShiftRight") {
        triggerJump()
        return
      }
      keys.current.add(code)
    }

    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code)
    }

    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [enabled, triggerAttack, triggerJump])

  useEffect(() => {
    const spawnX = stage === 1 ? -360 : -220
    setState((current) => ({ ...current, x: spawnX, y: 0, facing: "right" }))
  }, [stage])

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      setState((prev) => {
        const held = keys.current
        let dx = 0
        let dy = 0
        let facing = prev.facing

        if (held.has("KeyA") || held.has("ArrowLeft")) {
          dx -= speed
          facing = "left"
        }
        if (held.has("KeyD") || held.has("ArrowRight")) {
          dx += speed
          facing = "right"
        }
        if (held.has("KeyW")) {
          dy -= speed
          facing = "up"
        }
        if (held.has("KeyS") || held.has("ArrowDown")) {
          dy += speed
          facing = "down"
        }

        const now = performance.now()
        const attacking = now < attackUntil.current
        const jumping = now < jumpUntil.current
        const moving = dx !== 0 || dy !== 0

        // Aplica colisão
        let nx = prev.x + dx
        let ny = prev.y + dy
        
        if (!canMove(nx, ny, 24, 28, stage)) {
          nx = prev.x
          ny = prev.y
        }

        let action: PlayerAction = "idle"
        if (attacking) action = "attack"
        else if (jumping) action = "jump"
        else if (moving) action = "walk"

        return { x: nx, y: ny, facing, action, jumping, attacking }
      })
      raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [enabled, stage])

  return state
}
