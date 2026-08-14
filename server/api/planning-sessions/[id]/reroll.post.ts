import { rerollSchema } from '../../../../shared/schemas/planningSession'
import { getPlanningSession, patchPlanningSession } from '../../../services/planningSessionService'
import { listDishes } from '../../../services/dishService'
import { listByDateRange } from '../../../services/planEntryService'
import { reroll } from '../../../services/planningEngineService'
import { getActiveDishIds } from '../../../services/dishCooldownService'
import { getPlannerHints } from '../../../services/freezerItemService'
import { addDays, format } from 'date-fns'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    setResponseStatus(event, 400)
    return { error: 'Invalid id' }
  }

  const body = await readBody(event)
  const result = rerollSchema.safeParse(body)
  if (!result.success) {
    setResponseStatus(event, 400)
    return { error: result.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { slotKey } = result.data
  const session = await getPlanningSession(id)
  if (!session) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  // Find pins and wishlist tag for this slot
  const [slotDate, slotMealType] = slotKey.split(':')

  const weekEnd = format(addDays(new Date(session.weekStart), 6), 'yyyy-MM-dd')
  const [dishes, committedEntries, plannerHints] = await Promise.all([
    listDishes({ archived: false }),
    listByDateRange(session.weekStart, weekEnd),
    getPlannerHints(),
  ])
  const activeCooldownDishIds = await getActiveDishIds(dishes.map((d) => d.id), slotDate!)

  const freezerHints = new Map(
    plannerHints.map((h) => [h.dishId, { earliestTargetUseDate: h.earliestTargetUseDate }]),
  )

  // Build current draft history (all fresh-placed dish ids and their dates, excluding the slot being rerolled)
  const currentDraftHistory: { dishId: number; date: string }[] = []
  for (const [key, slot] of Object.entries(session.draftPlan)) {
    if (key !== slotKey && slot.dishId > 0 && slot.kind === 'dish') {
      const [date] = key.split(':')
      currentDraftHistory.push({ dishId: slot.dishId, date: date! })
    }
  }

  const slotPins = session.pinnedTags.filter(
    (p) => p.date === slotDate && p.mealType === slotMealType,
  )
  const currentSlot = session.draftPlan[slotKey]
  const wishlistTagId = currentSlot?.wishlistTag

  const shownDishIds = session.shownDishIdsBySlot[slotKey] ?? []

  const rerollResult = reroll({
    slotKey,
    dishes,
    committedEntries,
    currentDraftHistory,
    shownDishIds,
    sessionVirtualTags: session.sessionVirtualTags,
    pinTagRefs: slotPins.map((p) => p.tagRef),
    wishlistTagId,
    activeCooldownDishIds,
    freezerHints,
  })

  if (rerollResult === 'exhausted') {
    return { exhausted: true }
  }

  const updatedDraftPlan = {
    ...session.draftPlan,
    [slotKey]: {
      ...session.draftPlan[slotKey],
      kind: 'dish' as const,
      dishId: rerollResult.dishId,
    },
  }

  const updatedShown = {
    ...session.shownDishIdsBySlot,
    [slotKey]: rerollResult.shownDishIds,
  }

  const updated = await patchPlanningSession(id, {
    draftPlan: updatedDraftPlan,
    shownDishIdsBySlot: updatedShown,
  })

  if (!updated) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  return { session: updated, exhausted: false }
})
