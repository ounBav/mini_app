// All Mini App copy. Wording and error meanings mirror dlbot's messages.py and the original
// apps/miniapp/src/strings.js, so the chat and the app say the same thing.

export const S = {
  appTitle: 'Media Downloader',
  tagline: 'Save videos and audio from YouTube, TikTok and Facebook',
  usage: (used: number, limit: number) => `${used}/${limit} today`,
  usageSuffix: 'today',

  // Paste link
  heroTitle: 'Paste a link,',
  heroAccent: 'get the file.',
  heroBody: 'MP4 up to 1080p or MP3, saved straight to your phone.',
  steps: ['Link', 'Format', 'Download', 'Save'],
  stepsLabel: 'Steps',
  linkLabel: 'Video link',
  linkPlaceholder: 'Paste a TikTok, YouTube or Facebook link',
  paste: 'Paste',
  clear: 'Clear link',
  detected: (label: string) => `${label} link detected`,
  notSupported: "This site isn't supported",
  noLink: "That doesn't look like a link",
  pasteHint: 'Long-press the field and choose Paste.',
  supported: 'Works with',
  continue: 'Continue',
  readingLink: 'Reading the link…',

  // Preview
  formatLabel: 'Format',
  video: 'Video',
  audio: 'Audio',
  videoHint: 'MP4',
  audioHint: 'MP3 · 128 kbps',
  qualityLabel: 'Quality',
  noVideoTrack: 'This link has no video track, so only audio is available.',
  sizeHint: (mb: number) => `Files up to ${mb} MB.`,
  downloadVideo: (q: number | null) => (q ? `Download MP4 · ${q}p` : 'Download MP4'),
  downloadAudio: 'Download MP3',
  thumbnailAlt: (title: string) => `Thumbnail: ${title}`,
  by: (uploader: string) => uploader,

  // Progress
  stage: {
    received: 'Waiting in the queue…',
    queued: 'Waiting in the queue…',
    downloading: 'Downloading…',
    retrying: 'A temporary problem occurred. Retrying…',
    processing: 'Converting…',
    uploading: 'Preparing your file…',
    cancelling: 'Cancelling…',
    done: 'Done',
    failed: 'Failed',
    cancelled: 'Cancelled',
    expired: 'Timed out',
  },
  downloadingPct: (pct: number) => `Downloading… ${pct}%`,
  reconnecting: 'Connection lost. Reconnecting…',
  keepOpen: 'You can keep using Telegram. Come back here to save the file.',
  cancel: 'Cancel',
  cancelConfirm: 'Cancel this download?',
  cancelled: 'Download cancelled.',

  // Done
  readyTitle: 'Your file is ready',
  sentTitle: 'Sent to your chat',
  sentBody: 'Open the chat with the bot to watch or save it.',
  saveToDevice: 'Save to device',
  saveToFiles: 'Save to Files',
  saveToGallery: 'Save to Gallery',
  preparingGallery: 'Preparing for Gallery…',
  galleryShareHint: 'In the share sheet, tap “Save Video”.',
  galleryFailed: "Couldn't open the share sheet. Saving to Files instead.",
  galleryPrepareFailed: "Couldn't prepare the video for Gallery. Use Save to Files instead.",
  sendToChatGallery: 'Save to Gallery via chat',
  galleryChatHint: 'The bot sends the video to your chat. Open it and tap ⋯ → Save to Gallery.',
  chatGalleryNext: 'Open the chat, tap the video, then ⋯ → Save to Gallery.',
  saveStarted: 'Download started. Check your downloads.',
  saveDeclined: 'Download was not started.',
  expiresIn: (time: string) => `The link expires in ${time}. Save the file before then.`,
  expired: 'The link has expired.',
  another: 'Download another',
  openChat: 'Open chat',

  // Mode tabs
  modesLabel: 'Download from',
  modeLink: 'Link',
  modeProfile: 'TikTok profile',

  // TikTok profile tab
  profileHeroTitle: 'Pick from a profile,',
  profileHeroAccent: 'send to Telegram.',
  profileHeroBody:
    'Enter a TikTok username, choose how many videos to list, then pick the ones you want.',
  usernameLabel: 'TikTok username',
  usernamePlaceholder: '@username',
  usernameInvalid: 'Use letters, numbers, "_" or "." (like @abc)',
  clearUsername: 'Clear username',
  limitLabel: 'Videos to list',
  limitOption: (limit: number | 'all') => (limit === 'all' ? 'All' : `Last ${limit}`),
  limitAllHint: (max: number) => `“All” lists up to ${max} of the latest videos.`,
  search: 'Search',
  searching: (username: string) => `Listing @${username}’s videos…`,
  searchingHint: 'Large profiles can take up to a minute.',
  profileCount: (count: number) => `${count} video${count === 1 ? '' : 's'}`,
  profileTruncated: 'Showing the latest ones only.',
  selectedCount: (n: number, max: number) => `${n}/${max} selected`,
  selectAll: (max: number) => `Select ${max}`,
  selectNone: 'Clear',
  selectLimit: (max: number) => `You can send up to ${max} videos at a time.`,
  selectVideo: (title: string) => `Select video: ${title}`,
  untitled: 'Untitled video',
  sendToTelegram: (n: number) => (n ? `Send ${n} to Telegram` : 'Select videos to send'),
  oneTimeHint: "This list is kept only until you send or close the app. It isn't saved.",
  newSearch: 'New search',
  batchTitle: 'Sending to your chat',
  batchDoneTitle: 'All done',
  batchBody: 'The bot sends each video to your chat. You can close the app.',
  batchSummary: (done: number, total: number, failed: number) =>
    failed ? `${done} of ${total} sent · ${failed} failed` : `${done} of ${total} sent`,
  batchItem: {
    queued: 'Waiting',
    working: 'Downloading…',
    done: 'Sent',
    failed: 'Failed',
  },
  listCleared: 'List cleared.',

  // Error screen
  errorTitle: "Couldn't download this",
  tryAgain: 'Try again',
  tryAgainIn: (wait: string) => `Try again in ${wait}`,
  tryLower: (q: number) => `Try ${q}p`,
  tryAudio: 'Try audio instead',
  anotherLink: 'Try another link',
  back: 'Back',

  // Wake-up
  wakeTitle: 'Waking up the server…',
  wakeBody: 'The server sleeps when nobody uses it. This can take up to a minute.',
  wakeElapsed: (s: number) => `${s}s`,
  offlineTitle: "Can't reach the server",
  offlineBody: 'The server did not answer. Check your connection and try again.',

  blockedTitle: 'Server blocked this app',
  blockedBody:
    "The server is online but doesn't allow this app's address yet. Please tell the bot admin.",
  blockedAdmin: (origin: string) =>
    `Admin: add ${origin} to MINIAPP_URL or CORS_ORIGINS on the dlbot server, then restart it.`,
  configTitle: 'App not set up',
  configBody: "This app isn't connected to its server correctly. Please tell the bot admin.",
  configAdmin: (problem: string) =>
    problem === 'insecure'
      ? 'Admin: VITE_API_BASE_URL must use https://. Fix it and rebuild the app.'
      : 'Admin: set VITE_API_BASE_URL to the dlbot server URL and rebuild the app.',

  // Full-screen states
  outsideTitle: 'Open this in Telegram',
  outsideBody: 'This app runs inside Telegram. Open the bot and tap the Download button.',
  openInTelegram: 'Open in Telegram',
  authTitle: 'Session expired',
  authBody: 'Close the app and open it again from the bot.',
  bannedTitle: 'Access restricted',
  bannedBody: 'Your access to this bot has been restricted. Contact the administrator.',
  close: 'Close',
  devMock: 'Dev mode: mock Telegram session',

  footer: 'Download only content you have the right to use.',
  terms: 'Terms of use',
} as const

export type StageKey = keyof typeof S.stage
