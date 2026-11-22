// "Save to Gallery" helpers.
//
// Telegram's WebApp.downloadFile saves into Downloads / Files, never into the photo gallery.
// Where the webview supports sharing files (Web Share API Level 2, e.g. iOS WKWebView), the
// system share sheet offers "Save Video", which writes to Photos. Elsewhere (Android WebView,
// Telegram Desktop) the app sends the video to the bot chat instead, where Telegram's own
// "Save to Gallery" works.

const MIME: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
}

export function mimeFor(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return MIME[ext] ?? 'application/octet-stream'
}

/** True when this webview can hand a video file to the system share sheet. */
export function canShareFiles(): boolean {
  try {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      return false
    }
    const probe = new File([new Uint8Array(1)], 'probe.mp4', { type: 'video/mp4' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/** Download the finished file into memory so the share sheet can open on the next tap. */
export async function fetchAsFile(
  url: string,
  fileName: string,
  signal: AbortSignal,
): Promise<File> {
  const resp = await fetch(url, { cache: 'no-store', signal })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const header = (resp.headers.get('Content-Type') ?? '').split(';')[0]?.trim() ?? ''
  const type = header && header !== 'application/octet-stream' ? header : mimeFor(fileName)
  return new File([await resp.arrayBuffer()], fileName, { type })
}
