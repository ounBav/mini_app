import type { ErrorCode, MediaFormat, Quality } from '@/types/api'
import { formatWait } from './format'

export interface ErrorContext {
  maxMb: number
  format: MediaFormat
  quality: Quality | null
}

export interface ErrorView {
  title: string
  message: string
}

/** A button on the error screen. */
export interface ErrorAction {
  label: string
  run: () => void
  enabled?: boolean
}

/** A minute-window rate limit resets within 60 s; anything longer is the daily quota. */
export function isDailyLimit(retryAfter: number): boolean {
  return retryAfter > 60
}

/**
 * Friendly, specific text for every code dlbot can return (api.py, downloader.py) plus the
 * client's own transport codes. Unknown codes fall back to E-FAILED.
 */
export function describeError(
  code: ErrorCode | string,
  ctx: ErrorContext,
  extra: { retryAfter?: number; maxDuration?: number | null } = {},
): ErrorView {
  const retryAfter = extra.retryAfter ?? 0
  switch (code) {
    case 'E-UNSUPPORTED':
      return {
        title: "Can't read this link",
        message: 'I support public TikTok, YouTube and Facebook videos.',
      }
    case 'E-PRIVATE':
      return {
        title: 'Private video',
        message: "This video is private or needs a login, so I can't download it.",
      }
    case 'E-TOOBIG':
      return {
        title: 'File too large',
        message:
          ctx.format === 'video' && ctx.quality
            ? `At ${ctx.quality}p the file is over ${ctx.maxMb} MB. Pick a lower quality or Audio.`
            : ctx.format === 'video'
              ? `That file is over ${ctx.maxMb} MB. Try the Audio option instead.`
              : `Even the audio is over ${ctx.maxMb} MB, so it can't be downloaded.`,
      }
    case 'E-RATELIMIT':
      return isDailyLimit(retryAfter)
        ? {
            title: 'Daily limit reached',
            message: "You've reached today's limit. Please try again tomorrow.",
          }
        : {
            title: 'Slow down a little',
            message: `Too many requests. Try again in ${formatWait(retryAfter)}.`,
          }
    case 'E-BUSY':
      return {
        title: 'Already downloading',
        message: 'You already have a download running. Wait for it to finish.',
      }
    case 'E-LIVE':
      return {
        title: 'Live stream',
        message: "Live streams and premieres can't be downloaded. Try again after it ends.",
      }
    case 'E-PLAYLIST':
      return {
        title: 'Playlist link',
        message: "That's a playlist. Send a link to a single video.",
      }
    case 'E-TOOLONG':
      return {
        title: 'Video too long',
        message: extra.maxDuration
          ? `Videos longer than ${Math.round(extra.maxDuration / 60)} min aren't supported.`
          : 'This video is too long for the downloader.',
      }
    case 'E-BLOCKED':
      return {
        title: 'Temporarily blocked',
        message: 'YouTube is blocking our server right now. Please try again later.',
      }
    case 'E-GEO':
      return {
        title: 'Not available here',
        message: "This video isn't available in the server's region.",
      }
    case 'E-UNAVAILABLE':
      return { title: 'Video unavailable', message: "This video was removed or isn't available." }
    case 'E-GONE':
      return {
        title: 'Link expired',
        message: 'The download link has expired. Download the file again.',
      }
    case 'E-EXPIRED':
      return {
        title: 'Timed out',
        message: 'This download took too long and was dropped. Please try again.',
      }
    case 'E-NOTFOUND':
      return { title: 'Not found', message: 'That download no longer exists.' }
    case 'E-FINISHED':
      return { title: 'Already finished', message: 'This download has already finished.' }
    case 'E-NOCHAT':
      return {
        title: 'Start the bot first',
        message: 'Start a chat with the bot first (tap Start), then try again.',
      }
    case 'E-NETWORK':
      return {
        title: 'No connection',
        message: "Can't reach the server. Check your connection and try again.",
      }
    case 'E-TIMEOUT':
      return {
        title: 'Server is slow',
        message: 'The server took too long to answer. Please try again.',
      }
    case 'E-SERVER':
      return {
        title: 'Server error',
        message: 'The server had a problem. Please try again in a moment.',
      }
    case 'E-AUTH':
      return { title: 'Session expired', message: 'Close the app and open it again from the bot.' }
    case 'E-BANNED':
      return {
        title: 'Access restricted',
        message: 'Your access to this bot has been restricted. Contact the administrator.',
      }
    default:
      return {
        title: "Couldn't download this",
        message: 'Something went wrong on my side. Please try again later.',
      }
  }
}

/** Codes where the same request may succeed if repeated. */
export function isRetryable(code: ErrorCode | string): boolean {
  return [
    'E-FAILED',
    'E-NETWORK',
    'E-TIMEOUT',
    'E-SERVER',
    'E-BLOCKED',
    'E-EXPIRED',
    'E-RATELIMIT',
    'E-GONE',
    'E-NOCHAT', // succeeds once the user taps Start in the bot chat
  ].includes(code)
}
