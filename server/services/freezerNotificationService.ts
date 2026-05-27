import { eq, and, lt, gte } from 'drizzle-orm'
import { db } from '../database'
import { freezerItems, freezers, appSettings } from '../database/schema'
import { sendNtfy } from './notificationService'
import { getSettings } from './settingsService'

interface ExpirySnapshot {
  approachingItemIds: number[]
  expiredItemIds: number[]
}

interface AuditSuppressionState {
  [freezerId: string]: string // ISO timestamp of last notification sent
}

const SNAPSHOT_KEY = 'freezerExpiryLastSnapshot'
const SUPPRESSION_KEY = 'freezerAuditOverdueSuppressionState'
const SUPPRESSION_WINDOW_DAYS = 7

function clickUrl(siteBaseUrl: string, path: string): string | undefined {
  if (!siteBaseUrl) return undefined
  return `${siteBaseUrl.replace(/\/+$/, '')}${path}`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

async function readInternalKey<T>(key: string, defaultVal: T): Promise<T> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key))
  if (rows.length === 0) return defaultVal
  try { return JSON.parse(rows[0]!.value) as T }
  catch { return defaultVal }
}

async function writeInternalKey(key: string, value: unknown): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(value) } })
}

export function buildExpiryMessage(
  newlyApproaching: Array<{ name: string }>,
  newlyExpired: Array<{ name: string }>,
): string | null {
  if (newlyApproaching.length === 0 && newlyExpired.length === 0) return null
  const parts: string[] = []
  if (newlyApproaching.length > 0) {
    const n = newlyApproaching.length
    parts.push(`${n} item${n > 1 ? 's' : ''} entering the approaching window: ${newlyApproaching.map(r => r.name).join(', ')}`)
  }
  if (newlyExpired.length > 0) {
    const n = newlyExpired.length
    parts.push(`${n} item${n > 1 ? 's' : ''} past toss-by: ${newlyExpired.map(r => r.name).join(', ')}`)
  }
  return `❄ ${parts.join(' · ')}`
}

export function buildAuditOverdueMessage(freezerName: string, daysSince: number): string {
  return `❄ ${freezerName} hasn't been audited in ${daysSince} day${daysSince !== 1 ? 's' : ''}.`
}

export function buildWeeklyDigestMessage(
  active: number,
  approaching: number,
  expired: number,
  oldestFreezerName: string | null,
  oldestAuditDays: number | null,
): string {
  const auditLine = oldestFreezerName !== null && oldestAuditDays !== null
    ? `Last audited: ${oldestFreezerName} ${oldestAuditDays} day${oldestAuditDays !== 1 ? 's' : ''} ago.`
    : 'No freezers.'
  return `❄ Freezer summary: ${active} active · ${approaching} approaching · ${expired} expired. ${auditLine}`
}

export async function runExpiryCheck(): Promise<void> {
  const settings = await getSettings()
  if (!settings.freezerNotificationsEnabled || !settings.ntfyTopic) {
    console.log('[freezerNotifications] disabled — skipping expiry check')
    return
  }

  const today = todayStr()
  const approachingCutoff = addDays(today, settings.freezerApproachingWindowDays)

  const snapshot = await readInternalKey<ExpirySnapshot>(SNAPSHOT_KEY, {
    approachingItemIds: [],
    expiredItemIds: [],
  })

  const [approachingRows, expiredRows] = await Promise.all([
    db.select({ id: freezerItems.id, name: freezerItems.name })
      .from(freezerItems)
      .where(and(
        eq(freezerItems.status, 'active'),
        gte(freezerItems.tossByDate, today),
        lt(freezerItems.tossByDate, approachingCutoff),
      )),
    db.select({ id: freezerItems.id, name: freezerItems.name })
      .from(freezerItems)
      .where(and(
        eq(freezerItems.status, 'active'),
        lt(freezerItems.tossByDate, today),
      )),
  ])

  const prevApproachingIds = new Set(snapshot.approachingItemIds)
  const prevExpiredIds = new Set(snapshot.expiredItemIds)

  const newlyApproaching = approachingRows.filter(r => !prevApproachingIds.has(r.id))
  const newlyExpired = expiredRows.filter(r => !prevExpiredIds.has(r.id))

  const message = buildExpiryMessage(newlyApproaching, newlyExpired)

  let sent = true
  if (message !== null) {
    sent = await sendNtfy({
      title: 'Freezer alert',
      message,
      priority: 3,
      click: clickUrl(settings.siteBaseUrl, '/freezer'),
      tags: ['snowflake'],
    })
  }

  if (sent) {
    await writeInternalKey(SNAPSHOT_KEY, {
      approachingItemIds: approachingRows.map(r => r.id),
      expiredItemIds: expiredRows.map(r => r.id),
    })
  }
}

export async function runAuditOverdueCheck(): Promise<void> {
  const settings = await getSettings()
  if (!settings.freezerNotificationsEnabled || !settings.ntfyTopic) return

  const now = new Date()
  const overdueMs = settings.freezerAuditOverdueDays * 24 * 60 * 60 * 1000
  const suppressionMs = SUPPRESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000

  const allFreezers = await db.select().from(freezers)
  const suppression = await readInternalKey<AuditSuppressionState>(SUPPRESSION_KEY, {})
  let suppressionUpdated = false

  for (const freezer of allFreezers) {
    const referenceMs = freezer.lastAuditedAt
      ? new Date(freezer.lastAuditedAt).getTime()
      : new Date(freezer.createdAt).getTime()

    const elapsedMs = now.getTime() - referenceMs
    if (elapsedMs < overdueMs) continue

    const daysSince = Math.floor(elapsedMs / (24 * 60 * 60 * 1000))

    const lastSent = suppression[String(freezer.id)]
    if (lastSent && now.getTime() - new Date(lastSent).getTime() < suppressionMs) continue

    const sent = await sendNtfy({
      title: 'Freezer audit overdue',
      message: buildAuditOverdueMessage(freezer.name, daysSince),
      priority: 3,
      click: clickUrl(settings.siteBaseUrl, `/freezer/${freezer.id}/audit`),
      tags: ['snowflake'],
    })

    if (sent) {
      suppression[String(freezer.id)] = now.toISOString()
      suppressionUpdated = true
    }
  }

  if (suppressionUpdated) {
    await writeInternalKey(SUPPRESSION_KEY, suppression)
  }
}

export async function runWeeklyDigest(): Promise<void> {
  const settings = await getSettings()
  if (!settings.freezerNotificationsEnabled || !settings.ntfyTopic) return

  const today = todayStr()
  const approachingCutoff = addDays(today, settings.freezerApproachingWindowDays)
  const now = new Date()

  const [activeRows, approachingRows, expiredRows, allFreezers] = await Promise.all([
    db.select({ id: freezerItems.id }).from(freezerItems).where(eq(freezerItems.status, 'active')),
    db.select({ id: freezerItems.id }).from(freezerItems).where(and(
      eq(freezerItems.status, 'active'),
      gte(freezerItems.tossByDate, today),
      lt(freezerItems.tossByDate, approachingCutoff),
    )),
    db.select({ id: freezerItems.id }).from(freezerItems).where(and(
      eq(freezerItems.status, 'active'),
      lt(freezerItems.tossByDate, today),
    )),
    db.select().from(freezers),
  ])

  let oldestDays = -1
  let oldestName: string | null = null
  for (const freezer of allFreezers) {
    const refMs = freezer.lastAuditedAt
      ? new Date(freezer.lastAuditedAt).getTime()
      : new Date(freezer.createdAt).getTime()
    const days = Math.floor((now.getTime() - refMs) / (24 * 60 * 60 * 1000))
    if (days > oldestDays) {
      oldestDays = days
      oldestName = freezer.name
    }
  }

  await sendNtfy({
    title: 'Freezer weekly digest',
    message: buildWeeklyDigestMessage(
      activeRows.length,
      approachingRows.length,
      expiredRows.length,
      oldestName,
      oldestDays >= 0 ? oldestDays : null,
    ),
    priority: 3,
    click: clickUrl(settings.siteBaseUrl, '/freezer'),
    tags: ['snowflake'],
  })
}
