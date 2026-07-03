const ADJECTIVES = [
  'Preciso', 'Léxico', 'Ágil', 'Sutil', 'Nobre', 'Sereno', 'Vívido', 'Cauteloso',
  'Radiante', 'Astuto', 'Gentil', 'Robusto', 'Elegante', 'Curioso', 'Discreto',
  'Vibrante', 'Tranquilo', 'Ousado', 'Fiel', 'Esperto', 'Alegre', 'Calmo',
  'Brilhante', 'Destemido', 'Amável', 'Zeloso', 'Sábio', 'Veloz', 'Leal', 'Rústico',
]

const COLORS = [
  'Turquesa', 'Bege', 'Bronze', 'Índigo', 'Âmbar', 'Coral', 'Esmeralda', 'Lavanda',
  'Escarlate', 'Safira', 'Marfim', 'Púrpura', 'Ocre', 'Jade', 'Cobre', 'Carmim',
  'Grafite', 'Violeta', 'Ciano', 'Magenta', 'Pêssego', 'Verde-musgo', 'Azul-céu', 'Vinho',
]

const ANIMALS = [
  'Tucano', 'Arara', 'Pinguim', 'Jaguar', 'Lontra', 'Coruja', 'Raposa', 'Tatu',
  'Golfinho', 'Falcão', 'Sabiá', 'Onça', 'Tamanduá', 'Capivara', 'Bugio', 'Quati',
  'Gralha', 'Cervo', 'Gavião', 'Andorinha', 'Perereca', 'Cágado', 'Beija-flor', 'Marreco',
  'Peixe-boi', 'Ariranha', 'Mico', 'Preá', 'Sagui', 'Colibri',
]

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Pseudônimo determinístico estilo "Animal Cor Adjetivo" a partir de id/email */
export function pseudonym(seed: string): string {
  const h = hashSeed(seed)
  const animal = ANIMALS[h % ANIMALS.length]
  const color = COLORS[(h >>> 8) % COLORS.length]
  const adjective = ADJECTIVES[(h >>> 16) % ADJECTIVES.length]
  return `${animal} ${color} ${adjective}`
}

export function pseudonymInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/**
 * Paleta de avatares — cores de destaque fora da paleta de "states"
 * (verde/vermelho/amarelo/laranja/azul), para não confundir com status.
 */
export const AVATAR_COLOR_KEYS = ['purple', 'sky', 'pink', 'teal'] as const

export type AvatarColorKey = (typeof AVATAR_COLOR_KEYS)[number]

/** Cor determinística do avatar a partir de id/email/nome */
export function pseudonymColor(seed: string): AvatarColorKey {
  const h = hashSeed(seed)
  return AVATAR_COLOR_KEYS[(h >>> 4) % AVATAR_COLOR_KEYS.length]
}

/** Admin fixo da sidebar */
export const ADMIN_PSEUDONYM = pseudonym('mainnet-admin-marcus')
