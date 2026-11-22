// Brand colors for Telegram's native chrome (header, background, MainButton), which cannot read
// CSS variables. Keep in sync with the --c-* values in src/style.css.
export const BRAND = {
  primary: '#DB2777',
  primaryFg: '#FFFFFF',
  light: { canvas: '#FFF6FA', dimButton: '#F6D5E5', dimText: '#B07A97' },
  dark: { canvas: '#13070F', dimButton: '#3A1A2E', dimText: '#9C7A8E' },
} as const

/** <meta name="theme-color"> so the browser/OS chrome matches outside Telegram too. */
export function setMetaThemeColor(color: string): void {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}
