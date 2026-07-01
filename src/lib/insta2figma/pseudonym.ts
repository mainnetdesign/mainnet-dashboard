const FIRST = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro',
  'Rafaela', 'Samuel', 'Tatiana', 'Vitor', 'Yasmin', 'Zeca', 'Amanda', 'Caio',
  'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena', 'Igor',
]

const MIDDLE = [
  'Maria', 'José', 'Luiz', 'Paulo', 'Ana', 'João', 'Pedro', 'Antonio',
  'Francisco', 'Carlos', 'Miguel', 'Rafael', 'Gabriel', 'Lucas', 'Felipe',
  'Rodrigo', 'Marcos', 'André', 'Ricardo', 'Fernando', 'Roberto', 'Eduardo',
  'Daniel', 'Matheus', 'Leonardo', 'Guilherme', 'Bruno', 'Diego', 'Thiago', 'Renato',
]

const LAST = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha',
  'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado',
  'Mendes', 'Freitas',
]

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Pseudônimo determinístico de 3 nomes a partir de id/email */
export function pseudonym(seed: string): string {
  const h = hashSeed(seed)
  const first = FIRST[h % FIRST.length]
  const middle = MIDDLE[(h >>> 8) % MIDDLE.length]
  const last = LAST[(h >>> 16) % LAST.length]
  return `${first} ${middle} ${last}`
}

export function pseudonymInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Admin fixo da sidebar */
export const ADMIN_PSEUDONYM = pseudonym('mainnet-admin-marcus')
