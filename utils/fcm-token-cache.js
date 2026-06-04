const FCMRecord = require('../models/FCM')
const cache = new Map() // clerkId → { token, ts }
const TTL   = 5 * 60 * 1000

 async function getFCMToken(clerkId) {
  const hit = cache.get(clerkId)
  if (hit && Date.now() - hit.ts < TTL) return hit.token

  const record = await FCMRecord.findOne({ clerkId })
  if (record?.token) cache.set(clerkId, { token: record.token, ts: Date.now() })
  return record?.token ?? null
}

const  invalidateFCMToken = (clerkId) => cache.delete(clerkId)
module.exports = {getFCMToken, invalidateFCMToken}