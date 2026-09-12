"use client"

import { useEffect, useState } from "react"

export function StageTransition({ stage, onComplete }: { stage: number | null; onComplete: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!stage) return
    setVisible(true)
    const timer = window.setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [stage, onComplete])

  if (!stage) return null
  return (
    <div className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-stone-950 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`} aria-live="polite">
      <div className="text-center">
        <p className="font-pixel text-[10px] uppercase tracking-[0.3em] text-amber-300">Fase desbloqueada</p>
        <p className="mt-3 font-pixel text-xl text-amber-50">Nível {stage}</p>
      </div>
    </div>
  )
}
