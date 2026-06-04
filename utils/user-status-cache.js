// The server already knows who's connected. Stop asking the DB.
const statusMap = new Map() // userId → 'online' | 'away'

export const setUserStatus  = (userId, status) =>
  status === 'offline' ? statusMap.delete(userId) : statusMap.set(userId, status)

export const getUserStatus  = (userId) => statusMap.get(userId) ?? 'offline'