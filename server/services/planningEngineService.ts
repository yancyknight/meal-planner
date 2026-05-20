type DishFrequency = {
  cooldownDays: number
  targetIntervalDays: number
  excludedFromSuggestions: boolean
  archived: boolean
}

/**
 * Returns the selection weight for a dish given how many days since it was last served fresh.
 * A null daysSince means never served — uses 1.5 × targetIntervalDays as a mild "try soon" bias.
 * Caps at 3.0 to prevent a long-forgotten dish from dominating once eligible.
 */
export function selectionWeight(
  dish: Pick<DishFrequency, 'targetIntervalDays'>,
  daysSince: number | null,
): number {
  const effective = daysSince ?? dish.targetIntervalDays * 1.5
  return Math.min(effective / dish.targetIntervalDays, 3.0)
}

/**
 * Returns true if a dish is eligible to be suggested for a slot.
 * Requires: not excluded, not archived, and daysSince >= cooldownDays.
 */
export function isEligibleForSlot(
  dish: DishFrequency,
  daysSince: number | null,
): boolean {
  if (dish.excludedFromSuggestions || dish.archived) return false
  const effective = daysSince ?? dish.targetIntervalDays * 1.5
  return effective >= dish.cooldownDays
}
