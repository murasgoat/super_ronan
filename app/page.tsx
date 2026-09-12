"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GameHud } from "@/components/rpg/game-hud"
import { IntroCutscene } from "@/components/rpg/intro-cutscene"
import { PlayerSprite } from "@/components/rpg/player-sprite"
import { StageTransition } from "@/components/rpg/stage-transition"
import { usePlayerControls } from "@/hooks/use-player-controls"
import { INTRO_NPC, MAIN_OBJECTIVE, PARTY } from "@/lib/characters"
import { createStageManager, type StageId } from "@/lib/stage-manager"

type Phase = "intro" | "dialogue" | "playing"
const DIALOGUE_LINES = ["Vocês não são daqui, forasteiros... o Tabuleiro os trouxe através do véu do tempo.", "Um feiticeiro sombrio raptou a Princesa Elara e a aprisionou na Torre Carmesim.", "Libertem a princesa e o portal de volta ao seu mundo se abrirá."]

export default function Page() {
  const [phase, setPhase] = useState<Phase>("intro")
  const [line, setLine] = useState(0)
  const [stage, setStage] = useState<StageId>(1)
  const [transitionStage, setTransitionStage] = useState<StageId | null>(null)
  const manager = useRef(createStageManager())
  const [objectives, setObjectives] = useState(manager.current.getObjectives())
  const hero = PARTY[0]

  const advanceStage = useCallback((objective: string) => {
    if (!manager.current.complete(objective)) return
    setObjectives(manager.current.getObjectives())
    const next = manager.current.advance()
    if (next) {
      setTransitionStage(next)
      setStage(next)
      setPhase("playing")
    }
  }, [])

  const player = usePlayerControls(phase === "playing", () => {
    if (stage === 3) advanceStage("enemies")
  })

  const advanceDialogue = useCallback(() => {
    setLine((previous) => {
      if (previous >= DIALOGUE_LINES.length - 1) {
        advanceStage("dialogue")
        return previous
      }
      return previous + 1
    })
  }, [advanceStage])

  useEffect(() => {
    if (phase !== "dialogue") return
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "KeyE") {
        event.preventDefault()
        advanceDialogue()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, advanceDialogue])

  useEffect(() => {
    if (phase !== "playing" || stage !== 2) return
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyE") advanceStage("crystal")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, stage, advanceStage])

  if (phase === "intro") return <IntroCutscene onEnter={() => setPhase("dialogue")} />
  const inDialogue = phase === "dialogue"
  const objective = objectives[0]

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-stone-950">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/sprites/village-bg.png')", imageRendering: "pixelated" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
      {phase === "playing" && <PlayerSprite src={hero.image} name={hero.realName} state={player} />}
      <div className={inDialogue ? "absolute inset-0 cursor-pointer" : "absolute inset-0"} onClick={inDialogue ? advanceDialogue : undefined}>
        <GameHud
          showDialogue={inDialogue}
          player={{ name: hero.realName, avatarSrc: hero.image, level: stage, hp: { current: hero.hp, max: hero.hp }, mp: { current: hero.mp, max: hero.mp }, objective: MAIN_OBJECTIVE }}
          quest={{ title: `Nível ${stage}: ${manager.current.definition.title}`, objectives: [{ label: objective.label, current: objective.current, total: objective.total }] }}
          dialogue={{ npcName: INTRO_NPC.name, npcSpriteSrc: INTRO_NPC.image, text: DIALOGUE_LINES[line], continueHint: line >= DIALOGUE_LINES.length - 1 ? "Pressione ESPAÇO para começar..." : "Pressione ESPAÇO para continuar..." }}
        />
      </div>
      {phase === "playing" && <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 border-2 border-amber-600/70 bg-black/70 px-3 py-2"><p className="font-pixel-body text-center text-[15px] leading-tight text-amber-100">{stage === 2 ? <><span className="text-amber-400">E</span> coletar o cristal</> : <><span className="text-amber-400">WASD</span> mover · <span className="text-amber-400">J / Espaço</span> atacar</>}</p></div>}
      <StageTransition stage={transitionStage} onComplete={() => setTransitionStage(null)} />
    </main>
  )
}
