// Print a Telegram-style signed initData string for local browser development.
// Uses the same algorithm dlbot validates (apps/bot/app/webapp_auth.py):
//   secret = HMAC_SHA256(key="WebAppData", msg=bot_token)
//   hash   = hex(HMAC_SHA256(key=secret, msg=sorted "k=v" lines joined by "\n"))
//
// Usage (DEV bot token only, never production):
//   BOT_TOKEN=123:abc USER_ID=123456 npm run sign-init-data
// Put the output in .env.local as VITE_DEV_INIT_DATA=... (valid for MINIAPP_AUTH_MAX_AGE, 24 h).
import { createHmac } from 'node:crypto'

const token = process.env.BOT_TOKEN
if (!token) {
  console.error('Set BOT_TOKEN to your dev bot token.')
  process.exit(1)
}

const userId = Number(process.env.USER_ID || '1')
if (!Number.isInteger(userId) || userId <= 0) {
  console.error('USER_ID must be a positive integer (your Telegram user id).')
  process.exit(1)
}

const fields = {
  auth_date: String(Math.floor(Date.now() / 1000)),
  query_id: 'dev',
  user: JSON.stringify({
    id: userId,
    first_name: process.env.FIRST_NAME || 'Dev',
    username: 'dev',
  }),
}

const checkString = Object.keys(fields)
  .sort()
  .map((k) => `${k}=${fields[k]}`)
  .join('\n')
const secret = createHmac('sha256', 'WebAppData').update(token).digest()
const hash = createHmac('sha256', secret).update(checkString).digest('hex')

process.stdout.write(`${new URLSearchParams({ ...fields, hash }).toString()}\n`)
