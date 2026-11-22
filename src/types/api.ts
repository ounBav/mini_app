// Mirrors apps/bot/app/api.py in dlbot (the source of truth). Field names are the wire names.

export type Platform = 'youtube' | 'tiktok' | 'facebook'
export type MediaFormat = 'video' | 'audio'
/** downloader.QUALITY_LADDER: the short side of the frame. */
export type Quality = 360 | 480 | 720 | 1080
export type Delivery = 'chat' | 'device'

/** Live stages (worker progress) + final states. "received" is the raw request-log value. */
export type JobStatus =
  | 'received'
  | 'queued'
  | 'downloading'
  | 'retrying'
  | 'processing'
  | 'uploading'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'expired'

export const FINAL_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>([
  'done',
  'failed',
  'cancelled',
  'expired',
])

/** Codes the server sends in `{"detail": {"code": ...}}`. */
export type ServerErrorCode =
  | 'E-AUTH'
  | 'E-BANNED'
  | 'E-UNSUPPORTED'
  | 'E-PRIVATE'
  | 'E-TOOBIG'
  | 'E-FAILED'
  | 'E-RATELIMIT'
  | 'E-BUSY'
  | 'E-NOCHAT'
  | 'E-FINISHED'
  | 'E-NOTFOUND'
  | 'E-GONE'
  | 'E-LIVE'
  | 'E-PLAYLIST'
  | 'E-TOOLONG'
  | 'E-BLOCKED'
  | 'E-GEO'
  | 'E-UNAVAILABLE'
  // TikTok profile tab (POST /api/tiktok/*)
  | 'E-USERNAME'
  | 'E-PROFILE'
  | 'E-NOVIDEOS'
  | 'E-SCANGONE'
  | 'E-TOOMANY'
  | 'E-QUOTA'
/** Codes produced by the client (transport problems, expired jobs). */
export type ClientErrorCode =
  | 'E-NETWORK'
  | 'E-TIMEOUT'
  | 'E-SERVER'
  | 'E-EXPIRED'
  /** The API is reachable but does not allow this page's origin (CORS). */
  | 'E-CORS'
  /** The API URL in the build is missing or points at the wrong server. */
  | 'E-CONFIG'
export type ErrorCode = ServerErrorCode | ClientErrorCode

/** `detail` object of an error response (HTTPException(detail={...}) in api.py). */
export interface ApiErrorDetail {
  code: string
  /** E-RATELIMIT: seconds until the window resets. */
  retry_after?: number
  /** E-BUSY: id of the job that is already running. */
  id?: string
  /** /info E-TOOLONG: the server's MAX_DURATION_SEC (null when unlimited). */
  max_duration?: number | null
  /** E-QUOTA: downloads left today (fewer than the batch asked for). */
  remaining?: number
  /** E-TOOMANY: most videos one batch may send. */
  max?: number
}

export interface PlatformInfo {
  key: Platform
  label: string
  hosts: string[]
}

/** GET /api/me */
export interface MeResponse {
  user: { id: number; first_name: string; username: string | null }
  usage_today: number
  limit_per_day: number
  limit_per_minute: number
  max_upload_mb: number
  platforms: PlatformInfo[]
  terms_url: string | null
  qualities: Quality[]
  file_ttl_min: number
  /** TikTok profile tab: "All" lists at most this many videos. Absent on older servers. */
  profile_max_videos?: number
  /** TikTok profile tab: most videos one batch may send. */
  profile_max_send?: number
}

/** POST /api/info body (InfoIn). */
export interface InfoRequest {
  url: string
}

/** POST /api/info response. */
export interface InfoResponse {
  url: string
  platform: Platform
  title: string
  uploader: string
  duration: number
  thumbnail: string | null
  has_video: boolean
  qualities: Quality[]
}

/** POST /api/downloads body (DownloadIn). */
export interface CreateDownloadRequest {
  url: string
  format: MediaFormat
  quality?: Quality | null
  delivery?: Delivery
}

/** POST /api/downloads response. `cached` only happens for chat delivery. */
export type CreateDownloadResponse =
  { id: string; status: 'queued'; cached: false } | { id: null; status: 'done'; cached: true }

export interface JobFile {
  name: string
  /** Bytes. */
  size: number
  /** Server path, e.g. /api/files/<token>. Prefix with the API base URL. */
  download_path: string
  /** ISO 8601 (UTC). */
  expires_at: string
}

/** GET /api/downloads/{id} (api._job_view). */
export interface Job {
  id: string
  url: string
  platform: Platform
  format: MediaFormat
  status: JobStatus
  error_code: string | null
  title: string | null
  created_at: string
  delivery: Delivery
  quality: number | null
  /** 0-1 while downloading, 1 when done, null when unknown. */
  progress: number | null
  /** Only for done + device delivery, while the link is valid. */
  file: JobFile | null
}

/** GET /api/downloads */
export interface JobList {
  items: Job[]
}

/** POST /api/downloads/{id}/cancel */
export interface CancelResponse {
  id: string
  status: 'cancelling'
}

/** POST /api/tiktok/scan body (ScanIn). "all" is capped by the server's PROFILE_MAX_VIDEOS. */
export type ProfileLimit = 10 | 50 | 100 | 'all'

export interface ScanRequest {
  username: string
  limit: ProfileLimit
}

/** One listed video (api._video_view). */
export interface ProfileVideo {
  id: string
  url: string
  title: string
  /** Seconds; 0 when unknown (e.g. photo posts). */
  duration: number
  thumbnail: string | null
  /** Epoch seconds. */
  timestamp: number | null
  view_count: number | null
}

/** POST /api/tiktok/scan response. The server keeps it once, until send/discard/expiry. */
export interface ScanResponse {
  scan_id: string
  username: string
  nickname: string | null
  limit: ProfileLimit
  count: number
  /** "All" stopped at the server cap: the profile may have more videos. */
  truncated: boolean
  max_send: number
  expires_at: string
  videos: ProfileVideo[]
}

/** POST /api/tiktok/scan/{scan_id}/send body. */
export interface SendVideosRequest {
  video_ids: string[]
}

export interface BatchItem {
  video_id: string
  /** Job id to follow via GET /api/downloads; null when served from the bot's cache. */
  id: string | null
  status: 'queued' | 'done' | 'failed'
}

/** POST /api/tiktok/scan/{scan_id}/send response. */
export interface SendVideosResponse {
  username: string
  items: BatchItem[]
  queued: number
}

/** POST /api/tiktok/scan/discard */
export interface DiscardResponse {
  discarded: boolean
}

/** GET /health */
export interface HealthResponse {
  ok: boolean
  status: 'ok' | 'degraded'
  uptime_sec: number
  polling: boolean
  last_update_at: string | null
  workers: boolean
  queued: number
  ffmpeg: boolean
  yt_dlp: string
}
