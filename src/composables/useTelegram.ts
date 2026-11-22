import { reactive, readonly, ref } from 'vue'
import { BOT_USERNAME, DEV_INIT_DATA } from '@/config'
import type { WebApp } from '@/types/telegram'

/**
 * One wrapper around window.Telegram.WebApp for the whole app (module singleton).
 *
 * - Inside Telegram: initData is non-empty and every native control is used.
 * - `npm run dev` in a normal browser: a mock session (VITE_DEV_INIT_DATA or an unsigned stub),
 *   with in-page stand-ins for MainButton / BackButton (see DevControls in App.vue).
 * - Production build outside Telegram: `isTelegram` is false and App.vue shows "Open in Telegram".
 */

const webApp: WebApp | undefined =
  typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
const realInitData = webApp?.initData ?? ''

const isTelegram = realInitData.length > 0
const isDevMock = !isTelegram && import.meta.env.DEV

function unsignedMockInitData(): string {
  // Accepted by nothing: dlbot rejects it with E-AUTH. Use `npm run sign-init-data` for a real one.
  const user = JSON.stringify({ id: 1, first_name: 'Dev', username: 'dev' })
  const params = new URLSearchParams({
    user,
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: 'dev-mock',
  })
  return params.toString()
}

const initData = isTelegram
  ? realInitData
  : isDevMock
    ? DEV_INIT_DATA || unsignedMockInitData()
    : ''

function versionAtLeast(version: string): boolean {
  if (!isTelegram || !webApp) return false
  try {
    return webApp.isVersionAtLeast(version)
  } catch {
    return false
  }
}

const colorScheme = ref<'light' | 'dark'>('light')

function systemScheme(): 'light' | 'dark' {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(): void {
  colorScheme.value = isTelegram && webApp ? webApp.colorScheme : systemScheme()
  document.documentElement.dataset.theme = colorScheme.value
  if (!isTelegram || !webApp) return
  // The page background is secondary_bg_color (grouped-list look); cards use section_bg_color.
  try {
    if (versionAtLeast('6.1')) {
      webApp.setHeaderColor('secondary_bg_color')
      webApp.setBackgroundColor('secondary_bg_color')
    }
    if (versionAtLeast('7.10')) webApp.setBottomBarColor?.('secondary_bg_color')
  } catch {
    // Old clients reject keyword colors; their defaults are fine.
  }
  syncMainButton()
}

let initialised = false

function init(): void {
  if (initialised) return
  initialised = true
  applyTheme()
  if (isTelegram && webApp) {
    webApp.ready()
    webApp.expand()
    if (versionAtLeast('7.7')) webApp.disableVerticalSwipes?.()
    webApp.onEvent('themeChanged', applyTheme)
  } else {
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', applyTheme)
  }
}

// ------------------------------------------------------------------ MainButton

export interface MainButtonConfig {
  text: string
  onClick: () => void
  enabled?: boolean
  loading?: boolean
}

/** Mirror of the native button, rendered in-page while developing in a browser. */
const mainButtonState = reactive({ visible: false, text: '', enabled: true, loading: false })
let mainHandler: (() => void) | null = null

function onMainClick(): void {
  if (!mainButtonState.visible || !mainButtonState.enabled || mainButtonState.loading) return
  mainHandler?.()
}

function syncMainButton(): void {
  if (!isTelegram || !webApp) return
  const mb = webApp.MainButton
  const theme = webApp.themeParams
  const active = mainButtonState.enabled && !mainButtonState.loading
  if (!mainButtonState.visible) {
    mb.hideProgress()
    mb.hide()
    return
  }
  const dim = !mainButtonState.enabled
  mb.setParams({
    text: mainButtonState.text,
    is_visible: true,
    is_active: active,
    ...(dim
      ? { color: theme.hint_color ?? '#999999', text_color: theme.bg_color ?? '#ffffff' }
      : {
          ...(theme.button_color ? { color: theme.button_color } : {}),
          ...(theme.button_text_color ? { text_color: theme.button_text_color } : {}),
        }),
  })
  if (mainButtonState.loading) mb.showProgress(false)
  else mb.hideProgress()
}

let nativeMainBound: (() => void) | null = null

/** Show the bottom button with `config`, or hide it with null. Replaces any previous handler. */
function setMainButton(config: MainButtonConfig | null): void {
  mainHandler = config?.onClick ?? null
  mainButtonState.visible = config !== null
  mainButtonState.text = config?.text ?? ''
  mainButtonState.enabled = config?.enabled ?? true
  mainButtonState.loading = config?.loading ?? false
  if (isTelegram && webApp) {
    // Always offClick the old handler before binding, so a click never fires twice.
    if (nativeMainBound) webApp.MainButton.offClick(nativeMainBound)
    nativeMainBound = onMainClick
    webApp.MainButton.onClick(nativeMainBound)
  }
  syncMainButton()
}

// ------------------------------------------------------------------ BackButton

const backButtonState = reactive({ visible: false })
let backHandler: (() => void) | null = null
let nativeBackBound: (() => void) | null = null

function onBackClick(): void {
  backHandler?.()
}

/** Show the header back button calling `handler`, or hide it with null. */
function setBackButton(handler: (() => void) | null): void {
  backHandler = handler
  backButtonState.visible = handler !== null
  if (!isTelegram || !webApp || !versionAtLeast('6.1')) return
  const bb = webApp.BackButton
  if (nativeBackBound) bb.offClick(nativeBackBound)
  nativeBackBound = null
  if (handler) {
    nativeBackBound = onBackClick
    bb.onClick(nativeBackBound)
    bb.show()
  } else {
    bb.hide()
  }
}

// ------------------------------------------------------------------ Feedback & native actions

function haptic(kind: 'success' | 'error' | 'warning' | 'selection' | 'light'): void {
  if (!versionAtLeast('6.1') || !webApp) return
  try {
    const h = webApp.HapticFeedback
    if (kind === 'selection') h.selectionChanged()
    else if (kind === 'light') h.impactOccurred('light')
    else h.notificationOccurred(kind)
  } catch {
    // Haptics are best effort.
  }
}

export type SaveResult = 'started' | 'declined' | 'opened'

/** Save a file: native download sheet on Bot API 8.0+, otherwise open the link. */
function downloadFile(url: string, fileName: string): Promise<SaveResult> {
  if (isTelegram && webApp) {
    if (versionAtLeast('8.0') && typeof webApp.downloadFile === 'function') {
      const download = webApp.downloadFile.bind(webApp)
      return new Promise((resolve) => {
        try {
          download({ url, file_name: fileName }, (accepted) =>
            resolve(accepted ? 'started' : 'declined'),
          )
        } catch {
          webApp.openLink(url)
          resolve('opened')
        }
      })
    }
    webApp.openLink(url)
    return Promise.resolve('opened')
  }
  window.open(url, '_blank', 'noopener')
  return Promise.resolve('opened')
}

function confirm(message: string): Promise<boolean> {
  if (isTelegram && webApp && versionAtLeast('6.2')) {
    return new Promise((resolve) => webApp.showConfirm(message, (ok) => resolve(ok)))
  }
  return Promise.resolve(window.confirm(message))
}

/** Clipboard text, or null if neither the web API nor Telegram allows reading it. */
async function readClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText()
      if (text) return text
    }
  } catch {
    // Permission denied or unsupported in this webview: try Telegram's own API.
  }
  if (isTelegram && webApp && versionAtLeast('6.4') && webApp.readTextFromClipboard) {
    const read = webApp.readTextFromClipboard.bind(webApp)
    return new Promise((resolve) => {
      try {
        read((text) => resolve(text || null))
      } catch {
        resolve(null)
      }
    })
  }
  return null
}

function openBotChat(): void {
  if (!BOT_USERNAME) return
  const link = `https://t.me/${BOT_USERNAME}`
  if (isTelegram && webApp) webApp.openTelegramLink(link)
  else window.location.href = link
}

function openLink(url: string): void {
  if (isTelegram && webApp) webApp.openLink(url)
  else window.open(url, '_blank', 'noopener')
}

function close(): void {
  if (isTelegram && webApp) webApp.close()
}

const api = {
  isTelegram,
  isDevMock,
  initData,
  platform: webApp?.platform ?? 'unknown',
  colorScheme: readonly(colorScheme),
  mainButton: readonly(mainButtonState),
  backButton: readonly(backButtonState),
  init,
  versionAtLeast,
  setMainButton,
  setBackButton,
  /** Dev stand-ins call these. */
  clickMain: onMainClick,
  clickBack: onBackClick,
  haptic,
  downloadFile,
  confirm,
  readClipboard,
  openBotChat,
  openLink,
  close,
  hasBotLink: BOT_USERNAME.length > 0,
}

export type Telegram = typeof api

export function useTelegram(): Telegram {
  return api
}
