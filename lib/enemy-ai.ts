import { distance } from "./collision"

export interface Enemy {
  id: number
  name: string
  hp: number
  maxHp: number
  x: number
  y: number
  vx?: number
  vy?: number
  actionTimer?: number
  attacking?: boolean
}

export interface Dragon extends Enemy {
  projectiles: Projectile[]
  actionTimer: number
}

export interface Projectile {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
}

const SOLDIER_SPEED = 1.5
const SOLDIER_CHASE_RANGE = 120
const SOLDIER_ATTACK_RANGE = 35
const DRAGON_SPEED = 0.8
const DRAGON_CHASE_RANGE = 150
const DRAGON_ATTACK_RANGE = 100
const ATTACK_COOLDOWN = 1200

export function updateSoldier(
  soldier: Enemy,
  playerX: number,
  playerY: number
): { vx: number; vy: number; attacking: boolean } {
  const dx = playerX - soldier.x
  const dy = playerY - soldier.y
  const dist = distance(soldier.x, soldier.y, playerX, playerY)

  if (dist < SOLDIER_CHASE_RANGE) {
    const angle = Math.atan2(dy, dx)
    return {
      vx: Math.cos(angle) * SOLDIER_SPEED,
      vy: Math.sin(angle) * SOLDIER_SPEED,
      attacking: dist < SOLDIER_ATTACK_RANGE,
    }
  }

  return { vx: 0, vy: 0, attacking: false }
}

export function updateDragon(
  dragon: Dragon,
  playerX: number,
  playerY: number,
  now: number
): {
  vx: number
  vy: number
  attacking: boolean
  projectiles: Projectile[]
} {
  const dx = playerX - dragon.x
  const dy = playerY - dragon.y
  const dist = distance(dragon.x, dragon.y, playerX, playerY)

  let vx = 0
  let vy = 0
  let attacking = false
  let projectiles = [...(dragon.projectiles || [])]

  if (dist < DRAGON_CHASE_RANGE) {
    const angle = Math.atan2(dy, dx)
    vx = Math.cos(angle) * DRAGON_SPEED * (dist < DRAGON_ATTACK_RANGE ? 0 : 1)
    vy = Math.sin(angle) * DRAGON_SPEED * (dist < DRAGON_ATTACK_RANGE ? 0 : 1)

    if (dist < DRAGON_ATTACK_RANGE && (!dragon.actionTimer || now - dragon.actionTimer > ATTACK_COOLDOWN)) {
      attacking = true
      dragon.actionTimer = now

      const projSpeed = 2
      projectiles.push({
        id: Math.random(),
        x: dragon.x,
        y: dragon.y,
        vx: Math.cos(angle) * projSpeed,
        vy: Math.sin(angle) * projSpeed,
        active: true,
      })
    }
  }

  projectiles = projectiles
    .map((proj) => ({ ...proj, x: proj.x + proj.vx, y: proj.y + proj.vy }))
    .filter((proj) => Math.abs(proj.x) < 500 && Math.abs(proj.y) < 300)

  return { vx, vy, attacking, projectiles }
}

export function checkEnemyAttackRange(
  enemyX: number,
  enemyY: number,
  playerX: number,
  playerY: number,
  isBoss: boolean = false
): boolean {
  const dist = distance(enemyX, enemyY, playerX, playerY)
  return isBoss ? dist < DRAGON_ATTACK_RANGE : dist < SOLDIER_ATTACK_RANGE
}

export function checkPlayerAttackRange(
  playerX: number,
  playerY: number,
  targetX: number,
  targetY: number
): boolean {
  const PLAYER_ATTACK_RANGE = 40
  const dist = distance(playerX, playerY, targetX, targetY)
  return dist < PLAYER_ATTACK_RANGE
}
