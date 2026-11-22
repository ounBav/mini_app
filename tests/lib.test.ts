import { describe, expect, it } from 'vitest'
import { codeFromResponse } from '@/api/client'
import { describeError, isDailyLimit } from '@/lib/errors'
import {
  defaultQuality,
  formatBytes,
  formatDuration,
  formatWait,
  lowerQuality,
  percent,
  retryDelay,
} from '@/lib/format'
import { checkLink, DEFAULT_PLATFORMS, extractUrl } from '@/lib/url'

describe('url', () => {
  it('extracts a link from share text and trims punctuation', () => {
    expect(extractUrl('Watch this! https://vm.tiktok.com/ZM123/).')).toBe(
      'https://vm.tiktok.com/ZM123/',
    )
    expect(extractUrl('no link here')).toBeNull()
  })

  it('detects allow-listed platforms only', () => {
    expect(checkLink('https://youtu.be/abc', DEFAULT_PLATFORMS)).toEqual({
      state: 'ok',
      url: 'https://youtu.be/abc',
      platform: 'youtube',
    })
    expect(checkLink('https://fb.watch/x', DEFAULT_PLATFORMS).state).toBe('ok')
    expect(checkLink('https://vimeo.com/1', DEFAULT_PLATFORMS).state).toBe('unsupported')
    expect(checkLink('hello', DEFAULT_PLATFORMS).state).toBe('invalid')
    expect(checkLink('  ', DEFAULT_PLATFORMS).state).toBe('empty')
  })
})

describe('format', () => {
  it('formats durations, sizes and waits', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3725)).toBe('1:02:05')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB')
    expect(formatWait(42)).toBe('42s')
    expect(formatWait(125)).toBe('2:05')
  })

  it('picks qualities', () => {
    expect(defaultQuality([360, 480, 720, 1080])).toBe(720)
    expect(defaultQuality([1080])).toBe(1080)
    expect(defaultQuality([])).toBeNull()
    expect(lowerQuality([360, 480, 720], 720)).toBe(480)
    expect(lowerQuality([360, 480, 720], 360)).toBeNull()
  })

  it('clamps percent and backs off', () => {
    expect(percent(0.456)).toBe(45)
    expect(percent(1.2)).toBe(100)
    expect(percent(null)).toBeNull()
    expect(retryDelay(1)).toBe(1500)
    expect(retryDelay(3)).toBe(6000)
    expect(retryDelay(10)).toBe(12000)
  })
})

describe('errors', () => {
  const ctx = { maxMb: 50, format: 'video' as const, quality: 720 as const }

  it('maps server error bodies to codes', () => {
    expect(codeFromResponse(422, { detail: { code: 'E-PRIVATE' } })).toBe('E-PRIVATE')
    expect(codeFromResponse(422, { detail: [{ loc: ['body', 'url'] }] })).toBe('E-UNSUPPORTED')
    expect(codeFromResponse(401, null)).toBe('E-AUTH')
    expect(codeFromResponse(502, null)).toBe('E-SERVER')
  })

  it('gives specific messages', () => {
    expect(describeError('E-TOOBIG', ctx).message).toContain('720p')
    expect(describeError('E-TOOBIG', { ...ctx, format: 'audio', quality: null }).message).toContain(
      'audio',
    )
    expect(describeError('E-RATELIMIT', ctx, { retryAfter: 30 }).message).toContain('30s')
    expect(describeError('E-RATELIMIT', ctx, { retryAfter: 40_000 }).title).toBe(
      'Daily limit reached',
    )
    expect(describeError('E-TOOLONG', ctx, { maxDuration: 1800 }).message).toContain('30 min')
    expect(describeError('E-WHATEVER', ctx).title).toBe("Couldn't download this")
    expect(isDailyLimit(59)).toBe(false)
  })
})
