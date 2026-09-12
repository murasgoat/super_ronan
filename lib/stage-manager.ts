export type StageId = 1 | 2 | 3

export type StageObjective = {
  id: string
  label: string
  current: number
  total: number
  completed: boolean
}

export type StageDefinition = {
  id: StageId
  title: string
  subtitle: string
  objectives: StageObjective[]
}

export const STAGES: Record<StageId, StageDefinition> = {
  1: {
    id: 1,
    title: "O Chamado do Tabuleiro",
    subtitle: "Converse com o Ancião do Vilarejo",
    objectives: [{ id: "dialogue", label: "Completar a conversa com o Ancião", current: 0, total: 1, completed: false }],
  },
  2: {
    id: 2,
    title: "O Cristal do Véu",
    subtitle: "Encontre o cristal e pressione E para coletá-lo",
    objectives: [{ id: "crystal", label: "Coletar o Cristal do Véu", current: 0, total: 1, completed: false }],
  },
  3: {
    id: 3,
    title: "A Torre Carmesim",
    subtitle: "Derrote os inimigos restantes",
    objectives: [{ id: "enemies", label: "Derrotar os inimigos", current: 0, total: 3, completed: false }],
  },
}

export class StageManager {
  private stage: StageId = 1
  private progress = new Map<string, number>()

  get currentStage() {
    return this.stage
  }

  get definition() {
    return STAGES[this.stage]
  }

  complete(objectiveId: string, amount = 1) {
    const objective = this.definition.objectives.find(({ id }) => id === objectiveId)
    if (!objective) return false
    const current = Math.min(objective.total, (this.progress.get(objectiveId) ?? 0) + amount)
    this.progress.set(objectiveId, current)
    return current >= objective.total
  }

  canAdvance() {
    return this.definition.objectives.every(({ id, total }) => (this.progress.get(id) ?? 0) >= total)
  }

  advance(): StageId | null {
    if (!this.canAdvance() || this.stage === 3) return null
    this.stage = (this.stage + 1) as StageId
    return this.stage
  }

  getObjectives() {
    return this.definition.objectives.map((objective) => {
      const current = this.progress.get(objective.id) ?? 0
      return { ...objective, current, completed: current >= objective.total }
    })
  }
}

export function createStageManager() {
  return new StageManager()
}
