import type {
  CancelResponse,
  DiscardResponse,
  ScanRequest,
  ScanResponse,
  SendVideosResponse,
  CreateDownloadRequest,
  CreateDownloadResponse,
  HealthResponse,
  InfoResponse,
  Job,
  JobList,
  MeResponse,
} from '@/types/api'
import { apiUrl, request } from './client'

/** yt-dlp may take up to 30 s server-side to read a link (downloader.PROBE_TIMEOUT). */
const INFO_TIMEOUT_MS = 40_000

export function getHealth(timeoutMs = 10_000, signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('GET', '/health', { auth: false, timeoutMs, signal })
}

export function getMe(timeoutMs?: number): Promise<MeResponse> {
  return request<MeResponse>('GET', '/api/me', { timeoutMs })
}

export function getInfo(url: string, signal?: AbortSignal): Promise<InfoResponse> {
  return request<InfoResponse>('POST', '/api/info', {
    body: { url },
    timeoutMs: INFO_TIMEOUT_MS,
    signal,
  })
}

export function createDownload(body: CreateDownloadRequest): Promise<CreateDownloadResponse> {
  return request<CreateDownloadResponse>('POST', '/api/downloads', { body })
}

export function listDownloads(): Promise<JobList> {
  return request<JobList>('GET', '/api/downloads')
}

export function getDownload(id: string, signal?: AbortSignal): Promise<Job> {
  return request<Job>('GET', `/api/downloads/${encodeURIComponent(id)}`, { signal })
}

export function cancelDownload(id: string): Promise<CancelResponse> {
  return request<CancelResponse>('POST', `/api/downloads/${encodeURIComponent(id)}/cancel`)
}

/** Public, unauthenticated file link (Telegram's downloadFile cannot send headers). */
export function fileUrl(downloadPath: string): string {
  return apiUrl(downloadPath)
}

/** Listing a profile pages through TikTok's API (up to ~90 s server-side, profiles.SCAN_TIMEOUT). */
const SCAN_TIMEOUT_MS = 100_000

export function scanProfile(body: ScanRequest, signal?: AbortSignal): Promise<ScanResponse> {
  return request<ScanResponse>('POST', '/api/tiktok/scan', {
    body,
    timeoutMs: SCAN_TIMEOUT_MS,
    signal,
  })
}

export function sendProfileVideos(scanId: string, videoIds: string[]): Promise<SendVideosResponse> {
  return request<SendVideosResponse>(
    'POST',
    `/api/tiktok/scan/${encodeURIComponent(scanId)}/send`,
    { body: { video_ids: videoIds }, timeoutMs: 30_000 },
  )
}

/** Tell the server to forget the listing now. keepalive: it is sent while the page closes. */
export function discardScan(keepalive = false): Promise<DiscardResponse> {
  return request<DiscardResponse>('POST', '/api/tiktok/scan/discard', {
    keepalive,
    timeoutMs: 5_000,
  })
}
