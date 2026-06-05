import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

const DB_PATH = path.join(process.cwd(), 'showfinder.db')
let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  migrate(_db)
  return _db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, display_name TEXT,
      lastfm_username TEXT UNIQUE, lastfm_session_key TEXT, lastfm_display_name TEXT,
      scrobble_count INTEGER, time_format TEXT DEFAULT '12h',
      last_location_city TEXT, last_location_region TEXT, last_location_lat REAL, last_location_lng REAL,
      created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_artists (
      user_id TEXT NOT NULL, name TEXT NOT NULL, mbid TEXT, added_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, name)
    );
    CREATE TABLE IF NOT EXISTS show_cache (
      cache_key TEXT PRIMARY KEY, shows_json TEXT NOT NULL,
      artist_list TEXT NOT NULL, location TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_show_cache_created ON show_cache(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `)
  const cols = (db.prepare("PRAGMA table_info(users)").all() as any[]).map(r => r.name)
  const add = (col: string, def: string) => { if (!cols.includes(col)) db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`) }
  add('email','TEXT UNIQUE'); add('password_hash','TEXT'); add('display_name','TEXT')
  add('last_location_city','TEXT'); add('last_location_region','TEXT')
  add('last_location_lat','REAL'); add('last_location_lng','REAL')
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export function buildCacheKey(artistNames: string[], city: string, hubIds: string[]): string {
  const normalized = [...artistNames].sort().join(',') + city + [...hubIds].sort().join(',')
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32)
}

export function getCachedShows(cacheKey: string): any[] | null {
  try {
    const row = getDb().prepare('SELECT shows_json FROM show_cache WHERE cache_key = ? AND created_at > ?')
      .get(cacheKey, Date.now() - CACHE_TTL_MS) as any
    return row ? JSON.parse(row.shows_json) : null
  } catch { return null }
}

export function setCachedShows(cacheKey: string, shows: any[], artistNames: string[], city: string) {
  try {
    const db = getDb()
    db.prepare('INSERT OR REPLACE INTO show_cache (cache_key, shows_json, artist_list, location, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(cacheKey, JSON.stringify(shows), artistNames.join(', '), city, Date.now())
    db.prepare('DELETE FROM show_cache WHERE cache_key NOT IN (SELECT cache_key FROM show_cache ORDER BY created_at DESC LIMIT 500)').run()
  } catch (err) { console.error('[db] Cache write failed:', err) }
}

export interface DbUser {
  id: string; email?: string; displayName?: string; lastfmUsername?: string
  lastfmSessionKey?: string; lastfmDisplayName?: string; scrobbleCount?: number
  timeFormat: '12h' | '24h'
  lastLocation?: { city: string; region: string; lat: number; lng: number }
  createdAt: number; lastSeen: number
}

function rowToUser(row: any): DbUser {
  return {
    id: row.id, email: row.email ?? undefined, displayName: row.display_name ?? row.lastfm_display_name ?? undefined,
    lastfmUsername: row.lastfm_username ?? undefined, lastfmSessionKey: row.lastfm_session_key ?? undefined,
    lastfmDisplayName: row.lastfm_display_name ?? undefined, scrobbleCount: row.scrobble_count ?? undefined,
    timeFormat: row.time_format ?? '12h',
    lastLocation: row.last_location_city ? { city: row.last_location_city, region: row.last_location_region ?? '', lat: row.last_location_lat, lng: row.last_location_lng } : undefined,
    createdAt: row.created_at, lastSeen: row.last_seen,
  }
}

export function getUserById(id: string): DbUser | null {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as any
  return row ? rowToUser(row) : null
}
export function getUserByEmail(email: string): DbUser | null {
  const row = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any
  return row ? rowToUser(row) : null
}
export function getPasswordHashByEmail(email: string): { id: string; hash: string } | null {
  const row = getDb().prepare('SELECT id, password_hash FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any
  if (!row?.password_hash) return null
  return { id: row.id, hash: row.password_hash }
}
export function createUserWithPassword(email: string, passwordHash: string, displayName: string): DbUser {
  const id = crypto.randomUUID(); const now = Date.now()
  getDb().prepare('INSERT INTO users (id, email, password_hash, display_name, time_format, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase().trim(), passwordHash, displayName, '12h', now, now)
  return getUserById(id)!
}
export function upsertUser(data: { lastfmUsername: string; lastfmSessionKey: string; lastfmDisplayName: string; scrobbleCount?: number; existingUserId?: string }): DbUser {
  const db = getDb(); const now = Date.now()
  const existing = data.existingUserId ? getUserById(data.existingUserId) : (db.prepare('SELECT id FROM users WHERE lastfm_username = ?').get(data.lastfmUsername) as any)
  const id = existing?.id ?? crypto.randomUUID()
  db.prepare(`INSERT INTO users (id, lastfm_username, lastfm_session_key, lastfm_display_name, scrobble_count, time_format, created_at, last_seen) VALUES (?, ?, ?, ?, ?, '12h', ?, ?) ON CONFLICT(id) DO UPDATE SET lastfm_username=excluded.lastfm_username, lastfm_session_key=excluded.lastfm_session_key, lastfm_display_name=excluded.lastfm_display_name, scrobble_count=excluded.scrobble_count, last_seen=excluded.last_seen`)
    .run(id, data.lastfmUsername, data.lastfmSessionKey, data.lastfmDisplayName, data.scrobbleCount ?? null, now, now)
  return getUserById(id)!
}
export function updateUserPreferences(userId: string, prefs: { timeFormat?: '12h' | '24h' }) {
  if (prefs.timeFormat) getDb().prepare('UPDATE users SET time_format = ? WHERE id = ?').run(prefs.timeFormat, userId)
}
export function updateUserLocation(userId: string, city: string, region: string, lat: number, lng: number) {
  getDb().prepare('UPDATE users SET last_location_city=?, last_location_region=?, last_location_lat=?, last_location_lng=? WHERE id = ?').run(city, region, lat, lng, userId)
}
export function touchUser(userId: string) {
  getDb().prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), userId)
}
export function getSavedArtists(userId: string): { name: string; mbid?: string; addedAt: number }[] {
  return (getDb().prepare('SELECT name, mbid, added_at FROM user_artists WHERE user_id = ? ORDER BY added_at ASC').all(userId) as any[])
    .map(r => ({ name: r.name, mbid: r.mbid ?? undefined, addedAt: r.added_at }))
}
export function addSavedArtist(userId: string, name: string, mbid?: string) {
  getDb().prepare('INSERT OR IGNORE INTO user_artists (user_id, name, mbid, added_at) VALUES (?, ?, ?, ?)').run(userId, name, mbid ?? null, Date.now())
}
export function removeSavedArtist(userId: string, name: string) {
  getDb().prepare('DELETE FROM user_artists WHERE user_id = ? AND name = ?').run(userId, name)
}
