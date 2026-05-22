import type { Dish } from '../types/dish'
import type { PinnedTag } from '../types/planningSession'
import { matchesVirtualTag, matchesTag, getVirtualTag } from '../virtualTags'

export interface AnchorConflictInput {
  sessionVirtualTagIds: string[]
  pinnedTags: PinnedTag[]
  wishlistTagIds: number[]
  dishes: Dish[]
}

/**
 * Returns warning strings when a session-wide virtual tag filter eliminates
 * all dishes that could satisfy a pinned or wishlist tag.
 */
export function detectAnchorConflicts({
  sessionVirtualTagIds,
  pinnedTags,
  wishlistTagIds,
  dishes,
}: AnchorConflictInput): string[] {
  if (sessionVirtualTagIds.length === 0) return []

  const activeDishes = dishes.filter((d) =>
    sessionVirtualTagIds.every((id) => matchesVirtualTag(d, id)),
  )

  const warnings: string[] = []
  const warned = new Set<string>()

  // Check each unique real tag referenced in pins
  const pinnedRealTagIds = [
    ...new Set(
      pinnedTags
        .filter((p) => p.tagRef.kind === 'real')
        .map((p) => (p.tagRef as { kind: 'real'; tagId: number }).tagId),
    ),
  ]

  for (const tagId of pinnedRealTagIds) {
    const key = `pin:${tagId}`
    if (warned.has(key)) continue
    const hasMatch = activeDishes.some((d) =>
      matchesTag(d, { kind: 'real', tagId }),
    )
    if (!hasMatch) {
      const tagName = dishes
        .flatMap((d) => d.tags)
        .find((t) => t.id === tagId)?.name ?? `tag #${tagId}`
      warnings.push(
        `No dish matches both your session constraints and the pinned tag "${tagName}".`,
      )
      warned.add(key)
    }
  }

  // Check each unique virtual tag referenced in pins
  const pinnedVirtualTagIds = [
    ...new Set(
      pinnedTags
        .filter((p) => p.tagRef.kind === 'virtual')
        .map((p) => (p.tagRef as { kind: 'virtual'; id: string }).id),
    ),
  ]

  for (const virtualId of pinnedVirtualTagIds) {
    const key = `pin-v:${virtualId}`
    if (warned.has(key)) continue
    const hasMatch = activeDishes.some((d) =>
      matchesTag(d, { kind: 'virtual', id: virtualId }),
    )
    if (!hasMatch) {
      const tagLabel = getVirtualTag(virtualId)?.label ?? virtualId
      warnings.push(
        `No dish matches both your session constraints and the pinned tag "${tagLabel}".`,
      )
      warned.add(key)
    }
  }

  // Check wishlist real tags
  for (const tagId of wishlistTagIds) {
    const key = `wish:${tagId}`
    if (warned.has(key)) continue
    const hasMatch = activeDishes.some((d) =>
      matchesTag(d, { kind: 'real', tagId }),
    )
    if (!hasMatch) {
      const tagName = dishes
        .flatMap((d) => d.tags)
        .find((t) => t.id === tagId)?.name ?? `tag #${tagId}`
      warnings.push(
        `No dish matches both your session constraints and the wishlist tag "${tagName}".`,
      )
      warned.add(key)
    }
  }

  return warnings
}
