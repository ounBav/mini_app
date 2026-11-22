// The subset of https://core.telegram.org/bots/webapps used by this app.

export interface ThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  bottom_bar_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  section_separator_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
}

export interface BottomButtonParams {
  text?: string
  color?: string
  text_color?: string
  is_active?: boolean
  is_visible?: boolean
  has_shine_effect?: boolean
}

export interface BottomButton {
  readonly isVisible: boolean
  readonly isActive: boolean
  readonly isProgressVisible: boolean
  setText(text: string): BottomButton
  onClick(cb: () => void): BottomButton
  offClick(cb: () => void): BottomButton
  show(): BottomButton
  hide(): BottomButton
  enable(): BottomButton
  disable(): BottomButton
  showProgress(leaveActive?: boolean): BottomButton
  hideProgress(): BottomButton
  setParams(params: BottomButtonParams): BottomButton
}

export interface BackButton {
  readonly isVisible: boolean
  onClick(cb: () => void): BackButton
  offClick(cb: () => void): BackButton
  show(): BackButton
  hide(): BackButton
}

export interface HapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): HapticFeedback
  notificationOccurred(type: 'error' | 'success' | 'warning'): HapticFeedback
  selectionChanged(): HapticFeedback
}

export interface DownloadFileParams {
  url: string
  file_name: string
}

export type WebAppEvent = 'themeChanged' | 'viewportChanged' | 'activated' | 'deactivated'

export interface WebApp {
  readonly initData: string
  readonly initDataUnsafe: { user?: { id: number; first_name?: string; username?: string } }
  readonly version: string
  readonly platform: string
  readonly colorScheme: 'light' | 'dark'
  readonly themeParams: ThemeParams
  readonly isExpanded: boolean
  readonly MainButton: BottomButton
  readonly BackButton: BackButton
  readonly HapticFeedback: HapticFeedback
  isVersionAtLeast(version: string): boolean
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor?(color: string): void
  ready(): void
  expand(): void
  close(): void
  disableVerticalSwipes?(): void
  onEvent(event: WebAppEvent, cb: () => void): void
  offEvent(event: WebAppEvent, cb: () => void): void
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink(url: string): void
  showConfirm(message: string, cb?: (ok: boolean) => void): void
  readTextFromClipboard?(cb?: (text: string | null) => void): void
  downloadFile?(params: DownloadFileParams, cb?: (accepted: boolean) => void): void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp }
  }
}
