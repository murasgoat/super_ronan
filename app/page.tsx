"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CharacterSelect } from "@/components/rpg/character-select"
import { GameHud } from "@/components/rpg/game-hud"
import { IntroCutscene } from "@/components/rpg/intro-cutscene"
import { PlayerSprite } from "@/components/rpg/player-sprite"
import { StageTransition } from "@/components/rpg/stage-transition"
import { usePlayerControls } from "@/hooks/use-player-controls"
import { INTRO_NPC, MAIN_OBJECTIVE, PARTY } from "@/lib/characters"
import { createStageManager, type StageId } from "@/lib/stage-manager"
import { checkPlayerAttackRange } from "@/lib/enemy-ai"
import type { Enemy, Dragon, Projectile } from "@/lib/enemy-ai"
import { updateSoldier, updateDragon } from "@/lib/enemy-ai"

type Phase = "select" | "intro" | "dialogue" | "playing" | "clear"

const DIALOGUE_LINES = [
  "Vocês não são daqui, forasteiros... o Tabuleiro os trouxe através do véu do tempo.",
  "Um feiticeiro sombrio raptou a Princesa Elara e a aprisionou na Torre Carmesim.",
  "Atravessem o vilarejo e encontrem o Ancião. Ele conhece o caminho para o portal.",
]

const STAGE_BACKGROUNDS: Record<StageId, string> = {
  1: "/sprites/village-bg.png",
  2: "/sprites/village-bg.png",
  3: "/sprites/village-bg.png",
  4: "/sprites/village-bg.png",
  5: "/sprites/village-bg.png",
}

const ENEMY_SETS: Record<3 | 4 | 5, Enemy[]> = {
  3: [
    { id: 1, name: "Sentinela", hp: 2, maxHp: 2, x: -300, y: -80, vx: 0, vy: 0, actionTimer: 0 },
    { id: 2, name: "Sentinela", hp: 2, maxHp: 2, x: 200, y: -100, vx: 0, vy: 0, actionTimer: 0 },
    { id: 3, name: "Sentinela", hp: 2, maxHp: 2, x: -250, y: 60, vx: 0, vy: 0, actionTimer: 0 },
    { id: 4, name: "Sentinela", hp: 2, maxHp: 2, x: 280, y: 80, vx: 0, vy: 0, actionTimer: 0 },
  ],
  4: [
    { id: 1, name: "Guardião", hp: 3, maxHp: 3, x: -180, y: -120, vx: 0, vy: 0, actionTimer: 0 },
    { id: 2, name: "Guardião", hp: 3, maxHp: 3, x: 200, y: 100, vx: 0, vy: 0, actionTimer: 0 },
  ],
  5: [
    { id: 1, name: "Feiticeiro Sombrio", hp: 5, maxHp: 5, x: 0, y: 0, vx: 0, vy: 0, actionTimer: 0 },
  ],
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("select")
  const [line, setLine] = useState(0)
  const [hero, setHero] = useState(PARTY[0])
  const [stage, setStage] = useState<StageId>(1)
  const [transitionStage, setTransitionStage] = useState<StageId | null>(null)
  const [dragonHp, setDragonHp] = useState(8)
  const [dragonProjectiles, setDragonProjectiles] = useState<Projectile[]>([])
  const [crystalDropped, setCrystalDropped] = useState(false)
  const [crystalCollected, setCrystalCollected] = useState(false)
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [objectiveProgress, setObjectiveProgress] = useState(0)
  const [playerDamageFreeze, setPlayerDamageFreeze] = useState(0)
  const manager = useRef(createStageManager())
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef(0)

  const beginStage = useCallback((next: StageId) => {
    setStage(next)
    setObjectiveProgress(0)
    setDragonHp(8)
    setDragonProjectiles([])
    setCrystalDropped(false)
    setCrystalCollected(false)
    setPlayerDamageFreeze(0)
    setEnemies(
      next === 3 || next === 4 || next === 5
        ? ENEMY_SETS[next as 3 | 4 | 5].map((enemy) => ({ ...enemy, actionTimer: 0 }))
        : []
    )
    setTransitionStage(next)
    setPhase("playing")
  }, [])

  const completeObjective = useCallback(
    (id: string, amount = 1) => {
      if (!manager.current.complete(id, amount)) return
      setObjectiveProgress(manager.current.getObjectives()[0].current)
      const next = manager.current.advance()
      if (next) beginStage(next)
    },
    [beginStage]
  )

  const attack = useCallback(
    (playerX: number, playerY: number) => {
      if (stage === 2 && !crystalDropped && dragonHp > 0) {
        if (checkPlayerAttackRange(playerX, playerY, 0, 0)) {
          setDragonHp((current) => {
            const next = Math.max(0, current - 1)
            if (next === 0) setCrystalDropped(true)
            return next
          })
        }
        return
      }

      if ((stage === 3 || stage === 4 || stage === 5) && enemies.length > 0) {
        setEnemies((current) => {
          let updated = [...current]
          let damageDealt = false

          for (const enemy of updated) {
            if (enemy.hp > 0 && checkPlayerAttackRange(playerX, playerY, enemy.x, enemy.y)) {
              enemy.hp = Math.max(0, enemy.hp - 1)
              damageDealt = true
              break
            }
          }

          if (!damageDealt) return current

          const defeated = updated.filter((enemy) => enemy.hp <= 0).length
          if (stage === 3) {
            setObjectiveProgress(defeated)
            if (updated.every((enemy) => enemy.hp <= 0)) {
              manager.current.complete("enemies", 4)
            }
          } else if (stage === 4) {
            setObjectiveProgress(defeated)
            if (updated.every((enemy) => enemy.hp <= 0)) {
              completeObjective("final-enemies", 1)
            }
          } else if (stage === 5) {
            if (updated[0]?.hp <= 0) {
              completeObjective("shadow-mage", 1)
            }
          }

          return updated
        })
      }
    },
    [completeObjective, crystalDropped, dragonHp, enemies.length, stage]
  )

  const player = usePlayerControls(phase === "playing", () => attack(player.x, player.y), stage, hero.speed)

  const interact = useCallback(() => {
    if (stage === 1 && player.x > 360) completeObjective("elder")
    if (stage === 2 && crystalDropped && player.x > 0) {
      setCrystalCollected(true)
      completeObjective("crystal")
    }
  }, [completeObjective, crystalDropped, player.x, stage])

  useEffect(() => {
    if (phase !== "playing") return
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyE") interact()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [interact, phase])

  // Game loop para IA e dinâmica dos inimigos
  useEffect(() => {
    if (phase !== "playing" || (stage !== 2 && stage !== 3 && stage !== 4 && stage !== 5)) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      return
    }

    const tick = () => {
      const now = performance.now()
      if (now - lastUpdateRef.current < 50) return
      lastUpdateRef.current = now

      if (stage === 2 && dragonHp > 0) {
        const dragon: Dragon = {
          id: 99,
          name: "Dragão",
          hp: dragonHp,
          maxHp: 8,
          x: 0,
          y: 0,
          projectiles: dragonProjectiles,
          actionTimer: 0,
        }
        if (dragon) {
          const result = updateDragon(
            {
              ...dragon,
              hp: dragonHp,
              maxHp: 8,
              projectiles: dragonProjectiles,
              actionTimer: 0,
            },
            player.x,
            player.y,
            now
          )
          setDragonProjectiles(result.projectiles.slice(0, 5))
        }
      }

      if ((stage === 3 || stage === 4 || stage === 5) && enemies.length > 0) {
        setEnemies((current) =>
          current.map((enemy) => {
            if (enemy.hp <= 0) return enemy

            const ai = updateSoldier(enemy, player.x, player.y)
            return {
              ...enemy,
              x: Math.max(-420, Math.min(420, enemy.x + ai.vx)),
              y: Math.max(-200, Math.min(200, enemy.y + ai.vy)),
              vx: ai.vx,
              vy: ai.vy,
              attacking: ai.attacking,
            }
          })
        )
      }

      // Dano ao jogador por projéteis do dragão
      if (stage === 2 && dragonProjectiles.length > 0) {
        for (const proj of dragonProjectiles) {
          const dist = Math.sqrt(proj.x ** 2 + proj.y ** 2)
          if (dist < 30 && now - playerDamageFreeze > 500) {
            setPlayerDamageFreeze(now)
            hero.hp = Math.max(0, hero.hp - 1)
            if (hero.hp <= 0) setPhase("clear")
            break
          }
        }
      }

      // Dano ao jogador por contato com inimigos
      if ((stage === 3 || stage === 4 || stage === 5) && enemies.length > 0 && now - playerDamageFreeze > 500) {
        for (const enemy of enemies) {
          if (enemy.hp > 0 && enemy.attacking) {
            const dist = Math.sqrt((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2)
            if (dist < 50) {
              setPlayerDamageFreeze(now)
              hero.hp = Math.max(0, hero.hp - 1)
              if (hero.hp <= 0) setPhase("clear")
              break
            }
          }
        }
      }
    }

    gameLoopRef.current = setInterval(tick, 50) as NodeJS.Timeout
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [phase, stage, player.x, player.y, dragonHp, dragonProjectiles, enemies, playerDamageFreeze])

  const objective = useMemo(() => manager.current.getObjectives()[0], [stage, objectiveProgress])
  const livingEnemies = enemies.filter((enemy) => enemy.hp > 0).length
  const isDoorOpen = stage === 3 && livingEnemies === 0
  const isFinalDoorOpen = stage === 4 && livingEnemies === 0
  const isFinalVictory = stage === 5 && livingEnemies === 0 && manager.current.canAdvance()

  if (phase === "select") {
    return <CharacterSelect characters={PARTY} onSelect={(selected) => { setHero({ ...selected }); setPhase("intro") }} />
  }

  if (phase === "intro") return <IntroCutscene onEnter={() => setPhase("dialogue")} />
  if (phase === "clear" || isFinalVictory)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-950 p-6 text-center text-amber-50">
        <section className="max-w-xl border-4 border-amber-500 bg-stone-900 p-10 shadow-[8px_8px_0_#160d08]">
          <p className="font-pixel text-xs uppercase tracking-[0.25em] text-amber-400">A aventura terminou</p>
          <h1 className="mt-5 font-pixel text-3xl leading-relaxed text-amber-100">GAME CLEAR</h1>
          <p className="mt-5 font-pixel-body text-2xl leading-relaxed text-stone-200">
            {hero.hp <= 0 ? "Você foi derrotado... A aventura terminou." : "A Princesa Elara foi libertada e o portal para casa está aberto."}
          </p>
          <button
            className="mt-8 border-2 border-amber-400 px-5 py-3 font-pixel-body text-xl text-amber-100 hover:bg-amber-400 hover:text-stone-950"
            onClick={() => window.location.reload()}
          >
            Jogar novamente
          </button>
        </section>
      </main>
    )

  const inDialogue = phase === "dialogue"
  const background = STAGE_BACKGROUNDS[stage]
  const dragonDefeated = stage === 2 && dragonHp === 0

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-stone-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${background}')`, imageRendering: "pixelated" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-stone-950/35" aria-hidden="true" />
      <div className="absolute inset-x-0 top-1/2 mx-auto h-px max-w-5xl bg-amber-200/10" aria-hidden="true" />

      {stage === 1 && (
        <div className="absolute right-12 top-1/2 z-10 -translate-y-1/2 text-center">
          <img src="/sprites/elder-npc.png" alt="Ancião" className="pixelated h-24 w-20" />
          <p className="font-pixel-body text-xl text-amber-100">Ancião</p>
        </div>
      )}

      {stage === 2 && !dragonDefeated && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
          <img src="/sprites/dragon-boss.png" alt="Dragão" className="pixelated h-32 w-32" />
          <div className="mt-4 h-3 w-48 border border-stone-950 bg-stone-900">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${(dragonHp / 8) * 100}%` }} />
          </div>
          <p className="mt-1 font-pixel-body text-xl text-red-100">
            Dragão · {dragonHp}/8
          </p>
        </div>
      )}

      {dragonProjectiles.map((proj) => (
        <div
          key={proj.id}
          className="absolute z-[6] h-3 w-3 rounded-full bg-red-500 shadow-lg"
          style={{ left: `calc(50% + ${proj.x}px)`, top: `calc(50% + ${proj.y}px)`, pointerEvents: "none" }}
          aria-hidden="true"
        />
      ))}

      {stage === 2 && dragonDefeated && !crystalCollected && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center">
          <img src="/sprites/veil-crystal.png" alt="Cristal" className="pixelated h-16 w-16 animate-blink" />
          <p className="font-pixel-body text-xl text-cyan-100">Cristal do Véu</p>
        </div>
      )}

      {(stage === 3 || stage === 4 || stage === 5) &&
        enemies.map(
          (enemy) =>
            enemy.hp > 0 && (
              <div
                key={enemy.id}
                className="absolute z-[6] -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ left: `calc(50% + ${enemy.x}px)`, top: `calc(50% + ${enemy.y}px)` }}
              >
                <img
                  src={stage === 5 ? "/sprites/final-warden.png" : "/sprites/soldier-enemy.png"}
                  alt={enemy.name}
                  className="pixelated h-16 w-16"
                />
                <div className="mt-1 h-2 w-16 bg-stone-900">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                  />
                </div>
              </div>
            )
        )}

      {(stage === 3 || stage === 4 || stage === 5) && (
        <div
          className={`absolute right-5 top-1/2 z-10 -translate-y-1/2 border-4 p-4 text-center ${
            isDoorOpen || isFinalDoorOpen || stage === 5 ? "border-amber-400 bg-amber-900/80" : "border-stone-700 bg-stone-950/80"
          }`}
        >
          <div className="text-4xl">{isDoorOpen || isFinalDoorOpen ? "▱" : stage === 5 ? "✹" : "▣"}</div>
          <p className="font-pixel-body text-lg text-amber-100">
            {stage === 5 ? (livingEnemies === 0 ? "Portal Final" : "Chefe Final") : isDoorOpen || isFinalDoorOpen ? "Porta aberta" : "Porta trancada"}
          </p>
        </div>
      )}

      {phase === "playing" && <PlayerSprite src={hero.image} name={hero.realName} state={player} />}
      <div
        className={inDialogue ? "absolute inset-0 cursor-pointer" : "absolute inset-0"}
        onClick={
          inDialogue
            ? () => setLine((current) => (current >= DIALOGUE_LINES.length - 1 ? current : current + 1))
            : undefined
        }
      >
        <GameHud
          showDialogue={inDialogue}
          player={{
            name: hero.realName,
            avatarSrc: hero.image,
            level: stage,
            hp: { current: hero.hp, max: hero.hp },
            mp: { current: hero.mp, max: hero.mp },
            objective: MAIN_OBJECTIVE,
          }}
          quest={{
            title: `Nível ${stage}: ${manager.current.definition.title}`,
            objectives: [{ label: objective.label, current: objective.current, total: objective.total }],
          }}
          dialogue={{
            npcName: INTRO_NPC.name,
            npcSpriteSrc: INTRO_NPC.image,
            text: DIALOGUE_LINES[line],
            continueHint:
              line >= DIALOGUE_LINES.length - 1 ? "Atravesse o mapa e pressione E junto ao Ancião" : "Pressione ESPAÇO para continuar",
          }}
        />
      </div>

      {phase === "dialogue" && line >= DIALOGUE_LINES.length - 1 && (
        <button
          className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 border-2 border-amber-400 bg-stone-950/90 px-4 py-2 font-pixel-body text-xl text-amber-100"
          onClick={() => setPhase("playing")}
        >
          Começar travessia
        </button>
      )}

      {phase === "playing" && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 border-2 border-amber-600/70 bg-stone-950/85 px-3 py-2">
          <p className="font-pixel-body text-center text-[15px] leading-tight text-amber-100">
            {stage === 1 ? (
              <>
                <span className="text-amber-400">WASD</span> atravesse o mapa · <span className="text-amber-400">E</span> falar com o Ancião
              </>
            ) : stage === 2 ? (
              <>
                <span className="text-amber-400">J / Espaço</span> atacar · derrote o Dragão
                {dragonDefeated ? " · E coletar o cristal" : ""}
              </>
            ) : stage === 5 ? (
              <>
                <span className="text-amber-400">J / Espaço</span> atacar · derrote o Feiticeiro Sombrio
              </>
            ) : (
              <>
                <span className="text-amber-400">J / Espaço</span> atacar · {stage === 3 ? "abra a porta ao derrotar todos" : "derrote os guardiões"}
              </>
            )}
          </p>
        </div>
      )}

      {(stage === 3 || stage === 4) && (isDoorOpen || isFinalDoorOpen) && (
        <button
          className="absolute right-5 top-[62%] z-30 border-2 border-amber-400 bg-amber-900 px-3 py-2 font-pixel-body text-xl text-amber-100"
          onClick={() => completeObjective(stage === 3 ? "enemies" : "final-enemies")}
        >
          Entrar na porta
        </button>
      )}

      {phase === "playing" && (
        <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2 border-2 border-stone-700 bg-stone-950/85 px-4 py-2 font-pixel-body text-xl text-amber-100">
          Inimigos restantes: {livingEnemies}/{enemies.length || (stage === 2 ? 1 : 0)} · HP: {hero.hp}/{hero.hp}
        </div>
      )}

      <StageTransition stage={transitionStage} onComplete={() => setTransitionStage(null)} />
    </main>
  )
}
