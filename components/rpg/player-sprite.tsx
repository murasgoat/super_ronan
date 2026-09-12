"use client"

import { memo } from "react"
import type { PlayerState } from "@/hooks/use-player-controls"

export interface PlayerSpriteProps {
  src: string
  name?: string
  state: PlayerState
  frame?: { scale?: number; position?: string }
}

function PlayerSpriteComponent({ src, name = "Herói", state, frame = { scale: 1, position: "center" } }: PlayerSpriteProps) {
  const { x, y, facing, action, jumping, attacking } = state
  const flip = facing === "left" ? -1 : 1
  const jumpOffset = jumping ? -46 : 0
  const animation = action === "walk" ? "sprite-walk" : "sprite-idle"

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5]" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, transition: "transform 60ms linear" }} aria-label={`${name} (${action})`} role="img">
      <div className="absolute left-1/2 top-full h-3 w-16 -translate-x-1/2 rounded-[50%] bg-black/45" style={{ transform: `translateX(-50%) scaleX(${jumping ? 0.7 : 1})` }} aria-hidden="true" />
      <div className={animation} style={{ transform: `translateY(${jumpOffset}px) scaleX(${flip})` }}>
        <div className="relative h-28 w-24 overflow-hidden" style={{ transform: `scale(${frame.scale ?? 1})` }}>
          {attacking && <span className="absolute -right-3 top-1/2 z-10 h-16 w-16 -translate-y-1/2 rounded-full bg-amber-300/70 blur-md" aria-hidden="true" />}
          <div className="sprite-sheet pixelated h-full w-full" style={{ backgroundImage: `url(${src || "/sprites/hero-avatar.png"})`, backgroundPosition: frame.position ?? "center" }} aria-hidden="true" />
        </div>
      </div>
      {(attacking || jumping) && <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap"><span className="font-pixel text-[8px] text-amber-200" style={{ textShadow: "1px 1px 0 #000" }}>{attacking ? "ATAQUE!" : "PULO!"}</span></div>}
    </div>
  )
}

export const PlayerSprite = memo(PlayerSpriteComponent)
PlayerSprite.displayName = "PlayerSprite"
