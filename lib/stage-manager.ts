export type StageId = 1 | 2 | 3 | 4

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
  objectiveId: string
  objectiveLabel: string
  total: number
}

export const STAGES: Record<StageId, StageDefinition> = {
  1: { id: 1, title: "A Travessia do Vilarejo", subtitle: "Atravesse o mapa e converse com o Ancião", objectiveId: "elder", objectiveLabel: "Alcançar o Ancião do Vilarejo", total: 1 },
  2: { id: 2, title: "O Dragão do Véu", subtitle: "Derrote o Dragão e colete o cristal que ele deixar cair", objectiveId: "crystal", objectiveLabel: "Derrotar o Dragão e coletar o Cristal", total: 1 },
  3: { id: 3, title: "A Torre Carmesim", subtitle: "Derrote todos os inimigos e abra a porta", objectiveId: "enemies", objectiveLabel: "Derrotar todos os inimigos", total: 4 },
  4: { id: 4, title: "A Masmorra Final", subtitle: "Supere a última guarda e conclua a aventura", objectiveId: "final-enemies", objectiveLabel: "Concluir o confronto final", total: 3 },
}

export class StageManager {
  private stage: StageId = 1
  private progress = new Map<string, number>()

  get currentStage() { return this.stage }
  get definition() { return STAGES[this.stage] }

  complete(objectiveId: string, amount = 1) {
    if (objectiveId !== this.definition.objectiveId) return false
    const current = Math.min(this.definition.total, (this.progress.get(objectiveId) ?? 0) + amount)
    this.progress.set(objectiveId, current)
    return current >= this.definition.total
  }

  canAdvance() {
    return (this.progress.get(this.definition.objectiveId) ?? 0) >= this.definition.total
  }

  advance(): StageId | null {
    if (!this.canAdvance() || this.stage === 4) return null
    this.stage = (this.stage + 1) as StageId
    return this.stage
  }

  getObjectives(): StageObjective[] {
    const definition = this.definition
    const current = this.progress.get(definition.objectiveId) ?? 0
    return [{ id: definition.objectiveId, label: definition.objectiveLabel, current, total: definition.total, completed: current >= definition.total }]
  }
}

export function createStageManager() { return new StageManager() }
