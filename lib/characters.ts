export type CharacterClass = "Paladino" | "Tank" | "Mago" | "Sacerdote"

export interface GameCharacter {
  id: string
  /** Nome real do amigo no mundo real */
  realName: string
  /** Classe/persona dentro do mundo medieval */
  className: CharacterClass
  /**
   * URL do sprite/avatar. Troque livremente por qualquer caminho em /public
   * ou por uma URL externa. Ex: "/sprites/party/paladino.jpeg"
   */
  image: string
  hp: number
  mp: number
  /** Cor de destaque (usada na moldura e nas barras) */
  accent: string
  /**
   * Como as imagens são folhas de sprite (model sheets), este enquadramento
   * foca a "pose herói" (o personagem grande central) ao renderizar no jogo.
   * `scale` = zoom (ex.: 2.6), `position` = object-position CSS.
   */
  heroFrame?: { scale: number; position: string }
}

/**
 * Elenco dos amigos que foram sugados para dentro do jogo.
 * Para adicionar, remover ou trocar um personagem, basta editar este array.
 * O primeiro item é tratado como o personagem principal (jogador).
 */
export const PARTY: GameCharacter[] = [
  {
    id: "paladino",
    realName: "Murilo",
    className: "Paladino",
    image: "/sprites/party/paladino.jpeg",
    hp: 140,
    mp: 50,
    accent: "#e8c56a",
    heroFrame: { scale: 3.1, position: "52% 62%" },
  },
  {
    id: "tank",
    realName: "Ping",
    className: "Tank",
    image: "/sprites/party/barbaro.jpeg",
    hp: 120,
    mp: 30,
    accent: "#9aa4ad",
  },
  {
    id: "mago",
    realName: "Arthur",
    className: "Mago",
    image: "/sprites/party/mago.jpeg",
    hp: 110,
    mp: 90,
    accent: "#a879d6",
  },
  {
    id: "sacerdote",
    realName: "Leandro",
    className: "Sacerdote",
    image: "/sprites/party/sacerdote.jpeg",
    hp: 40,
    mp: 80,
    accent: "#5fd08a",
  },
]

/** NPC que aparece na caixa de diálogo. Troque a imagem à vontade. */
export const INTRO_NPC = {
  name: "Ancião do Vilarejo",
  image: "/sprites/elder-npc.png",
}

export const STORY_TEXT =
  "De uma noite de jogatina no mundo real para um reino medieval. Salve a Princesa para voltar para casa."

export const MAIN_OBJECTIVE = "Salvar a Princesa"
