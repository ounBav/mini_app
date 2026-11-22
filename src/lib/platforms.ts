import type { Platform } from '@/types/api'

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
}

export const PLATFORM_ORDER: Platform[] = ['youtube', 'tiktok', 'facebook']
