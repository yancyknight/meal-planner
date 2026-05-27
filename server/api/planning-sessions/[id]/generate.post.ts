import { getPlanningSession, patchPlanningSession } from '../../../services/planningSessionService'
import { listDishes } from '../../../services/dishService'
import { listByDateRange } from '../../../services/planEntryService'
import { getSettings } from '../../../services/settingsService'
import { generateDraft } from '../../../services/planningEngineService'
import { getActiveDishIds } from '../../../services/dishCooldownService'
import { getPlannerHints, getStandaloneHints } from '../../../services/freezerItemService'
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

  const weekEnd = format(addDays(new Date(session.weekStart), 6), 'yyyy-MM-dd')
  const [dishes, committedEntries, settings, plannerHints, standaloneHints] = await Promise.all([
    listDishes({ archived: false }),
    listByDateRange(session.weekStart, weekEnd),
    getSettings(),
    getPlannerHints(),
    getStandaloneHints(),
  ])
  const activeCooldownDishIds = await getActiveDishIds(dishes.map((d) => d.id), session.weekStart)

  const freezerHints = new Map(
    plannerHints.map((h) => [h.dishId, { earliestTargetUseDate: h.earliestTargetUseDate }]),
  )

  // Build slot list from session state
  const slots = session.mealTypes.flatMap((mealType) => {
    const days: { date: string; mealType: string; state: 'plan' | 'skip' | 'one-off' | 'keep' }[] = []
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(new Date(session.weekStart), i), 'yyyy-MM-dd')
      const key = `${date}:${mealType}`
      const state = session.slotStates[key] ?? 'plan'
      days.push({ date, mealType, state: state as 'plan' | 'skip' | 'one-off' | 'keep' })
    }
    return days
  })

  const { draftPlan, warnings } = generateDraft({
    slots,
    dishes,
    committedEntries,
    sessionVirtualTags: session.sessionVirtualTags,
    pinnedTags: session.pinnedTags,
    wishlistTags: session.wishlistTags,
    householdSize: settings.householdSize,
    activeCooldownDishIds,
    freezerHints,
    standaloneHints,
  })

  // Seed shownDishIdsBySlot with initial picks
  const shownDishIdsBySlot: Record<string, number[]> = {}
  for (const [key, slot] of Object.entries(draftPlan)) {
    if (slot.dishId > 0) {
      shownDishIdsBySlot[key] = [slot.dishId]
    }
  }

  const updated = await patchPlanningSession(id, {
    draftPlan,
    shownDishIdsBySlot,
    currentStep: 4,
  })

  if (!updated) {
    setResponseStatus(event, 404)
    return { error: 'Planning session not found' }
  }

  return { session: updated, warnings }
})
