export type AppMode = 'studio' | 'store'

export const APP_MODE_STORAGE_KEY = 'mainnet-app-mode'

export const STUDIO_HOME = '/dashboard'
export const STORE_HOME = '/store'

export function modeFromPathname(pathname: string): AppMode {
  return pathname.startsWith('/store') ? 'store' : 'studio'
}

export function isStoreProductPath(pathname: string): boolean {
  return pathname.startsWith('/store/insta2figma')
}

export function homeForMode(mode: AppMode): string {
  return mode === 'store' ? STORE_HOME : STUDIO_HOME
}
