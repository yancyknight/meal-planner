import { getPlanningSession, deletePlanningSession } from '../../../services/planningSessionService'
import { createPlanEntry, deletePlanEntry } from '../../../services/planEntryService'
import { addDays, format } from 'date-fns'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    setResponseStatus(event, 400)
    return { error: 'Invalid id' }
  }

  const session = await getPlanningSession(id)
  if (!session) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  // 1. Write draft plan entries (fresh kind)
  for (const [slotKey, slot] of Object.entries(session.draftPlan)) {
    const [date, mealType] = slotKey.split(':')
    if (!date || !mealType) continue

    if (slot.kind === 'standalone-freezer' && slot.freezerItemId != null) {
      await createPlanEntry({
        date,
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'uncategorized',
        entryKind: 'one-off',
        oneOffText: slot.oneOffText ?? 'Freezer item',
        freezerItemId: slot.freezerItemId,
        guestCount: 0,
      })
      continue
    }

    if (slot.dishId <= 0) continue // no-match slots
    const entryKind = slot.kind === 'leftover-suggestion' ? 'leftover' : 'fresh'
    await createPlanEntry({
      date,
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'uncategorized',
      entryKind,
      dishId: slot.dishId,
      guestCount: 0,
    })
  }

  // 2. Write pending one-off entries
  for (const entry of session.pendingOneOffEntries) {
    await createPlanEntry({
      date: entry.date,
      mealType: entry.mealType,
      entryKind: 'one-off',
      oneOffText: entry.text,
      guestCount: 0,
    })
  }

  // 3. Delete removed plan entry IDs
  for (const entryId of session.removedPlanEntryIds) {
    await deletePlanEntry(entryId)
  }

  // 4. Delete the session row
  await deletePlanningSession(id)

  return { weekStart: session.weekStart }
})
