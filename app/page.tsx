"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GameHud } from "@/components/rpg/game-hud"
import { IntroCutscene } from "@/components/rpg/intro-cutscene"
import { PlayerSprite } from "@/components/rpg/player-sprite"
import { StageTransition } from "@/components/rpg/stage-transition"
import { usePlayerControls } from "@/hooks/use-player-controls"
import { INTRO_NPC, MAIN_OBJECTIVE, PARTY } from "@/lib/characters"
import { createStageManager, type StageId } from "@/lib/stage-manager"

type Phase = "intro" | "dialogue" | "playing" | "clear"
type Enemy = { id: number; name: string; hp: number; maxHp: number; x: number; y: number }

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
}
const ENEMY_SETS: Record<3 | 4, Enemy[]> = {
  3: [
    { id: 1, name: "Sentinela", hp: 2, maxHp: 2, x: 18, y: 35 },
    { id: 2, name: "Sentinela", hp: 2, maxHp: 2, x: 42, y: 58 },
    { id: 3, name: "Sentinela", hp: 2, maxHp: 2, x: 66, y: 32 },
    { id: 4, name: "Sentinela", hp: 2, maxHp: 2, x: 82, y: 62 },
  ],
  4: [
    { id: 1, name: "Guardião", hp: 3, maxHp: 3, x: 24, y: 38 },
    { id: 2, name: "Guardião", hp: 3, maxHp: 3, x: 54, y: 62 },
    { id: 3, name: "Guardião", hp: 3, maxHp: 3, x: 78, y: 36 },
  ],
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("intro")
  const [line, setLine] = useState(0)
  const [stage, setStage] = useState<StageId>(1)
  const [transitionStage, setTransitionStage] = useState<StageId | null>(null)
  const [dragonHp, setDragonHp] = useState(8)
  const [crystalDropped, setCrystalDropped] = useState(false)
  const [crystalCollected, setCrystalCollected] = useState(false)
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [objectiveProgress, setObjectiveProgress] = useState(0)
  const manager = useRef(createStageManager())
  const hero = PARTY[0]

  const beginStage = useCallback((next: StageId) => {
    setStage(next)
    setObjectiveProgress(0)
    setDragonHp(8)
    setCrystalDropped(false)
    setCrystalCollected(false)
    setEnemies(next === 3 || next === 4 ? ENEMY_SETS[next].map((enemy) => ({ ...enemy })) : [])
    setTransitionStage(next)
    setPhase("playing")
  }, [])

  const completeObjective = useCallback((id: string, amount = 1) => {
    if (!manager.current.complete(id, amount)) return
    setObjectiveProgress(manager.current.getObjectives()[0].current)
    const next = manager.current.advance()
    if (next) beginStage(next)
  }, [beginStage])

  const attack = useCallback(() => {
    if (stage === 2 && !crystalDropped) {
      setDragonHp((current) => {
        const next = Math.max(0, current - 1)
        if (next === 0) {
          setCrystalDropped(true)
        }
        return next
      })
      return
    }
    if (stage === 3 || stage === 4) {
      setEnemies((current) => {
        const target = current.find((enemy) => enemy.hp > 0)
        if (!target) return current
        const updated = current.map((enemy) => enemy.id === target.id ? { ...enemy, hp: enemy.hp - 1 } : enemy)
        const defeated = updated.filter((enemy) => enemy.hp <= 0).length
        if (defeated > 0) setObjectiveProgress(defeated)
        if (updated.every((enemy) => enemy.hp <= 0)) {
          if (stage === 3) {
            manager.current.complete("enemies", 4)
            setObjectiveProgress(4)
          } else {
            completeObjective("final-enemies", 1)
          }
        }
        return updated
      })
    }
  }, [completeObjective, crystalDropped, stage])

  const player = usePlayerControls(phase === "playing", attack)

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

  const objective = useMemo(() => manager.current.getObjectives()[0], [stage, objectiveProgress])
  const livingEnemies = enemies.filter((enemy) => enemy.hp > 0).length
  const isDoorOpen = stage === 3 && livingEnemies === 0
  const isFinalVictory = stage === 4 && livingEnemies === 0 && manager.current.canAdvance()

  if (phase === "intro") return <IntroCutscene onEnter={() => setPhase("dialogue")} />
  if (phase === "clear" || isFinalVictory) return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-950 p-6 text-center text-amber-50">
      <section className="max-w-xl border-4 border-amber-500 bg-stone-900 p-10 shadow-[8px_8px_0_#160d08]">
        <p className="font-pixel text-xs uppercase tracking-[0.25em] text-amber-400">A aventura terminou</p>
        <h1 className="mt-5 font-pixel text-3xl leading-relaxed text-amber-100">GAME CLEAR</h1>
        <p className="mt-5 font-pixel-body text-2xl leading-relaxed text-stone-200">A Princesa Elara foi libertada e o portal para casa está aberto.</p>
        <button className="mt-8 border-2 border-amber-400 px-5 py-3 font-pixel-body text-xl text-amber-100 hover:bg-amber-400 hover:text-stone-950" onClick={() => window.location.reload()}>Jogar novamente</button>
      </section>
    </main>
  )

  const inDialogue = phase === "dialogue"
  const background = STAGE_BACKGROUNDS[stage]
  const dragonDefeated = stage === 2 && dragonHp === 0

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-stone-950">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${background}')`, imageRendering: "pixelated" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-stone-950/35" aria-hidden="true" />
      <div className="absolute inset-x-0 top-1/2 mx-auto h-px max-w-5xl bg-amber-200/10" aria-hidden="true" />

      {stage === 1 && <div className="absolute left-[calc(50%+360px)] top-1/2 z-10 -translate-y-1/2 text-center"><div className="animate-blink text-3xl text-amber-300">◆</div><p className="font-pixel-body text-xl text-amber-100">Ancião</p></div>}
      {stage === 2 && !dragonDefeated && <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center"><div className="mx-auto h-28 w-36 border-4 border-red-950 bg-red-700/80 shadow-[0_0_0_8px_#3b1111]"><span className="font-pixel-body text-6xl text-red-100">D</span></div><div className="mt-4 h-3 w-48 border border-stone-950 bg-stone-900"><div className="h-full bg-red-500 transition-all" style={{ width: `${(dragonHp / 8) * 100}%` }} /></div><p className="mt-1 font-pixel-body text-xl text-red-100">Dragão · {dragonHp}/8</p></div>}
      {stage === 2 && dragonDefeated && !crystalCollected && <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-center"><div className="animate-blink text-5xl text-cyan-300">✦</div><p className="font-pixel-body text-xl text-cyan-100">Cristal do Véu</p></div>}
      {(stage === 3 || stage === 4) && enemies.map((enemy) => enemy.hp > 0 && <div key={enemy.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${enemy.x}%`, top: `${enemy.y}%` }}><div className="mx-auto h-14 w-14 border-4 border-stone-950 bg-emerald-800"><span className="font-pixel-body text-4xl text-emerald-100">{stage === 4 ? "G" : "S"}</span></div><div className="mt-1 h-2 w-16 bg-stone-900"><div className="h-full bg-emerald-400" style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} /></div></div>)}
      {(stage === 3 || stage === 4) && <div className={`absolute right-5 top-1/2 z-10 -translate-y-1/2 border-4 p-4 text-center ${isDoorOpen || stage === 4 ? "border-amber-400 bg-amber-900/80" : "border-stone-700 bg-stone-950/80"}`}><div className="text-4xl">{stage === 4 ? "✹" : isDoorOpen ? "▱" : "▣"}</div><p className="font-pixel-body text-lg text-amber-100">{stage === 4 ? "Núcleo final" : isDoorOpen ? "Porta aberta" : "Porta trancada"}</p></div>}

      {phase === "playing" && <PlayerSprite src={hero.image} name={hero.realName} state={player} />}
      <div className={inDialogue ? "absolute inset-0 cursor-pointer" : "absolute inset-0"} onClick={inDialogue ? () => setLine((current) => current >= DIALOGUE_LINES.length - 1 ? current : current + 1) : undefined}>
        <GameHud
          showDialogue={inDialogue}
          player={{ name: hero.realName, avatarSrc: hero.image, level: stage, hp: { current: hero.hp, max: hero.hp }, mp: { current: hero.mp, max: hero.mp }, objective: MAIN_OBJECTIVE }}
          quest={{ title: `Nível ${stage}: ${manager.current.definition.title}`, objectives: [{ label: objective.label, current: objective.current, total: objective.total }] }}
          dialogue={{ npcName: INTRO_NPC.name, npcSpriteSrc: INTRO_NPC.image, text: DIALOGUE_LINES[line], continueHint: line >= DIALOGUE_LINES.length - 1 ? "Atravesse o mapa e pressione E junto ao Ancião" : "Pressione ESPAÇO para continuar" }}
        />
      </div>
      {phase === "dialogue" && line >= DIALOGUE_LINES.length - 1 && <button className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 border-2 border-amber-400 bg-stone-950/90 px-4 py-2 font-pixel-body text-xl text-amber-100" onClick={() => setPhase("playing")}>Começar travessia</button>}
      {phase === "playing" && <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 border-2 border-amber-600/70 bg-stone-950/85 px-3 py-2"><p className="font-pixel-body text-center text-[15px] leading-tight text-amber-100">{stage === 1 ? <><span className="text-amber-400">WASD</span> atravesse o mapa · <span className="text-amber-400">E</span> falar com o Ancião</> : stage === 2 ? <><span className="text-amber-400">J / Espaço</span> atacar · derrote o Dragão{dragonDefeated ? " · E coletar o cristal" : ""}</> : <><span className="text-amber-400">J / Espaço</span> atacar · {stage === 3 ? "abra a porta ao derrotar todos" : "derrote a guarda final"}</>}</p></div>}
      {stage === 3 && isDoorOpen && <button className="absolute right-5 top-[62%] z-30 border-2 border-amber-400 bg-amber-900 px-3 py-2 font-pixel-body text-xl text-amber-100" onClick={() => completeObjective("enemies")}>Entrar na porta</button>}
      <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2 border-2 border-stone-700 bg-stone-950/85 px-4 py-2 font-pixel-body text-xl text-amber-100">Inimigos restantes: {livingEnemies}/{enemies.length || (stage === 2 ? 1 : 0)}</div>
      <StageTransition stage={transitionStage} onComplete={() => setTransitionStage(null)} />
    </main>
  )
}
