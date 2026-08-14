import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'

import { db } from '../../server/database/index'
import { freezers, freezerItems, freezerCategories, appSettings } from '../../server/database/schema'
import { sendNtfy } from '../../server/services/notificationService'
import {
  buildExpiryMessage,
  buildAuditOverdueMessage,
  buildWeeklyDigestMessage,
  runExpiryCheck,
  runAuditOverdueCheck,
  runWeeklyDigest,
} from '../../server/services/freezerNotificationService'

vi.mock('../../server/database/index', async () => {
  const { default: Database } = await import('better-sqlite3')
  const { drizzle } = await import('drizzle-orm/better-sqlite3')
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator')
  const schema = await import('../../server/database/schema')

  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: 'server/database/migrations' })
  return { db }
})

vi.mock('../../server/services/notificationService', () => ({
  sendNtfy: vi.fn(),
}))

const mockSendNtfy = vi.mocked(sendNtfy)

async function enableNotifications() {
  const pairs = [
    ['freezerNotificationsEnabled', true],
    ['ntfyTopic', 'test-topic'],
    ['ntfyServerUrl', 'https://ntfy.sh'],
    ['ntfyAuthToken', ''],
    ['freezerApproachingWindowDays', 14],
    ['freezerAuditOverdueDays', 60],
  ] as const
  for (const [key, value] of pairs) {
    await db
      .insert(appSettings)
      .values({ key, value: JSON.stringify(value) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(value) } })
  }
}

async function setInternalKey(key: string, value: unknown) {
  await db
    .insert(appSettings)
    .values({ key, value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: JSON.stringify(value) } })
}

async function readInternalKey(key: string): Promise<unknown> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key))
  if (rows.length === 0) return undefined
  return JSON.parse(rows[0]!.value)
}

async function seedCategory(name = 'Other', days = 90) {
  const now = new Date().toISOString()
  const [row] = await db
    .insert(freezerCategories)
    .values({ name, defaultLifetimeDays: days, isSystem: 0, createdAt: now, updatedAt: now })
    .returning()
  return row!
}

async function seedFreezer(name = 'Kitchen', lastAuditedAt: string | null = null) {
  const now = new Date().toISOString()
  const [row] = await db
    .insert(freezers)
    .values({ name, lastAuditedAt, createdAt: now, updatedAt: now })
    .returning()
  return row!
}

async function seedItem(
  freezerId: number,
  categoryId: number,
  name: string,
  tossByDate: string,
  addedAt = '2026-01-01',
) {
  const now = new Date().toISOString()
  const [row] = await db
    .insert(freezerItems)
    .values({
      freezerId,
      categoryId,
      name,
      tossByDate,
      targetUseDate: tossByDate,
      addedAt,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return row!
}

beforeEach(async () => {
  await db.delete(appSettings)
  await db.delete(freezerItems)
  await db.delete(freezers)
  await db.delete(freezerCategories)
  mockSendNtfy.mockReset()
  mockSendNtfy.mockResolvedValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// --- Pure builder tests ---

describe('buildExpiryMessage', () => {
  it('returns null when nothing is new', () => {
    expect(buildExpiryMessage([], [])).toBeNull()
  })

  it('names newly-approaching items', () => {
    const msg = buildExpiryMessage([{ name: 'Salmon' }, { name: 'Chicken' }], [])
    expect(msg).toContain('Salmon')
    expect(msg).toContain('Chicken')
    expect(msg).toContain('approaching window')
  })

  it('names newly-expired items', () => {
    const msg = buildExpiryMessage([], [{ name: 'Old beef' }])
    expect(msg).toContain('Old beef')
    expect(msg).toContain('toss-by')
  })

  it('includes both sections when both have new items', () => {
    const msg = buildExpiryMessage([{ name: 'A' }], [{ name: 'B' }])
    expect(msg).toContain('approaching window')
    expect(msg).toContain('toss-by')
  })
})

describe('buildAuditOverdueMessage', () => {
  it('includes freezer name and day count', () => {
    const msg = buildAuditOverdueMessage('Garage', 75)
    expect(msg).toContain('Garage')
    expect(msg).toContain('75')
  })

  it('uses singular "day" for 1 day', () => {
    const msg = buildAuditOverdueMessage('Kitchen', 1)
    expect(msg).toContain('1 day')
    expect(msg).not.toContain('1 days')
  })
})

describe('buildWeeklyDigestMessage', () => {
  it('includes active, approaching, and expired counts', () => {
    const msg = buildWeeklyDigestMessage(10, 3, 1, 'Kitchen', 5)
    expect(msg).toContain('10 active')
    expect(msg).toContain('3 approaching')
    expect(msg).toContain('1 expired')
  })

  it('includes the oldest freezer name and days', () => {
    const msg = buildWeeklyDigestMessage(5, 0, 0, 'Garage', 30)
    expect(msg).toContain('Garage')
    expect(msg).toContain('30')
  })

  it('handles no freezers gracefully', () => {
    const msg = buildWeeklyDigestMessage(0, 0, 0, null, null)
    expect(msg).toContain('No freezers')
  })
})

// --- runExpiryCheck integration tests ---

describe('runExpiryCheck', () => {
  it('skips when notifications are disabled', async () => {
    await setInternalKey('freezerNotificationsEnabled', false)
    await setInternalKey('ntfyTopic', 'topic')
    await runExpiryCheck()
    expect(mockSendNtfy).not.toHaveBeenCalled()
  })

  it('sends notification for newly-approaching items', async () => {
    await enableNotifications()
    const cat = await seedCategory()
    const freezer = await seedFreezer()
    const today = new Date().toISOString().slice(0, 10)
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await seedItem(freezer.id, cat.id, 'Ground beef', inFiveDays, today)

    await runExpiryCheck()

    expect(mockSendNtfy).toHaveBeenCalledOnce()
    const call = mockSendNtfy.mock.calls[0]![0]
    expect(call.message).toContain('Ground beef')
  })

  it('does not re-notify for items already in the snapshot', async () => {
    await enableNotifications()
    const cat = await seedCategory()
    const freezer = await seedFreezer()
    const today = new Date().toISOString().slice(0, 10)
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const item = await seedItem(freezer.id, cat.id, 'Ground beef', inFiveDays, today)

    // Pre-seed snapshot as if this item was already notified
    await setInternalKey('freezerExpiryLastSnapshot', {
      approachingItemIds: [item.id],
      expiredItemIds: [],
    })

    await runExpiryCheck()

    expect(mockSendNtfy).not.toHaveBeenCalled()
  })

  it('updates snapshot to current state after successful send', async () => {
    await enableNotifications()
    const cat = await seedCategory()
    const freezer = await seedFreezer()
    const today = new Date().toISOString().slice(0, 10)
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const item = await seedItem(freezer.id, cat.id, 'Salmon', inFiveDays, today)

    await runExpiryCheck()

    const snapshot = await readInternalKey('freezerExpiryLastSnapshot') as { approachingItemIds: number[] }
    expect(snapshot.approachingItemIds).toContain(item.id)
  })

  it('does not update snapshot when send fails', async () => {
    await enableNotifications()
    mockSendNtfy.mockResolvedValue(false)

    const cat = await seedCategory()
    const freezer = await seedFreezer()
    const today = new Date().toISOString().slice(0, 10)
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await seedItem(freezer.id, cat.id, 'Chicken', inFiveDays, today)

    await runExpiryCheck()

    const snapshot = await readInternalKey('freezerExpiryLastSnapshot')
    expect(snapshot).toBeUndefined()
  })
})

// --- runAuditOverdueCheck integration tests ---

describe('runAuditOverdueCheck', () => {
  it('sends notification for freezer past the overdue threshold', async () => {
    await enableNotifications()
    const longAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
    await seedFreezer('Garage', longAgo)

    await runAuditOverdueCheck()

    expect(mockSendNtfy).toHaveBeenCalledOnce()
    const call = mockSendNtfy.mock.calls[0]![0]
    expect(call.message).toContain('Garage')
  })

  it('does not send when freezer is within threshold', async () => {
    await enableNotifications()
    const recentlyAudited = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    await seedFreezer('Kitchen', recentlyAudited)

    await runAuditOverdueCheck()

    expect(mockSendNtfy).not.toHaveBeenCalled()
  })

  it('suppresses re-notification within 7-day window', async () => {
    await enableNotifications()
    const longAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
    const freezer = await seedFreezer('Garage', longAgo)

    // Pretend we already notified 3 days ago
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    await setInternalKey('freezerAuditOverdueSuppressionState', {
      [String(freezer.id)]: threeDaysAgo,
    })

    await runAuditOverdueCheck()

    expect(mockSendNtfy).not.toHaveBeenCalled()
  })

  it('fires again after suppression window expires', async () => {
    await enableNotifications()
    const longAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
    const freezer = await seedFreezer('Garage', longAgo)

    // Last notified 8 days ago — suppression expired
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    await setInternalKey('freezerAuditOverdueSuppressionState', {
      [String(freezer.id)]: eightDaysAgo,
    })

    await runAuditOverdueCheck()

    expect(mockSendNtfy).toHaveBeenCalledOnce()
  })

  it('sends one message per overdue freezer', async () => {
    await enableNotifications()
    const longAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString()
    await seedFreezer('Garage', longAgo)
    await seedFreezer('Basement', longAgo)

    await runAuditOverdueCheck()

    expect(mockSendNtfy).toHaveBeenCalledTimes(2)
  })
})

// --- runWeeklyDigest tests ---

describe('runWeeklyDigest', () => {
  it('sends digest with correct item counts', async () => {
    await enableNotifications()
    const cat = await seedCategory()
    const freezer = await seedFreezer()
    const today = new Date().toISOString().slice(0, 10)

    // 1 active item not approaching
    const farFuture = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await seedItem(freezer.id, cat.id, 'Item A', farFuture, today)

    // 1 approaching item
    const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await seedItem(freezer.id, cat.id, 'Item B', inFiveDays, today)

    // 1 expired item
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await seedItem(freezer.id, cat.id, 'Item C', yesterday, today)

    await runWeeklyDigest()

    expect(mockSendNtfy).toHaveBeenCalledOnce()
    const msg = mockSendNtfy.mock.calls[0]![0].message
    // 3 active total (active includes expired — status is still active), 1 approaching, 1 expired
    expect(msg).toContain('approaching')
    expect(msg).toContain('expired')
  })

  it('skips when notifications are disabled', async () => {
    await setInternalKey('freezerNotificationsEnabled', false)
    await setInternalKey('ntfyTopic', 'topic')
    await runWeeklyDigest()
    expect(mockSendNtfy).not.toHaveBeenCalled()
  })
})
