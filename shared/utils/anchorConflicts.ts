import type { Dish } from '../types/dish'
import type { Tag } from '../types/tag'
import type { PinnedTag } from '../types/planningSession'
import { matchesVirtualTag, matchesTag, getVirtualTag } from '../virtualTags'

export interface AnchorConflictInput {
  sessionVirtualTagIds: string[]
  pinnedTags: PinnedTag[]
  wishlistTagIds: number[]
  dishes: Dish[]
  allTags?: Tag[]
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
  allTags = [],
}: AnchorConflictInput): string[] {
  if (sessionVirtualTagIds.length === 0) return []

  const activeDishes = dishes.filter((d) =>
    sessionVirtualTagIds.every((id) => matchesVirtualTag(d, id)),
  )

  // Build a tag lookup from allTags (authoritative) + any tags on dishes
  const tagById = new Map<number, string>()
  for (const t of allTags) tagById.set(t.id, t.name)
  for (const d of dishes) for (const t of d.tags) if (!tagById.has(t.id)) tagById.set(t.id, t.name)

  const constraintLabel = sessionVirtualTagIds
    .map((id) => getVirtualTag(id)?.label ?? id)
    .join(' + ')

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
      const tagName = tagById.get(tagId) ?? `tag #${tagId}`
      warnings.push(
        `No dish is both "${constraintLabel}" and tagged "${tagName}" — session filter and pinned tag conflict.`,
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
      const pinLabel = getVirtualTag(virtualId)?.label ?? virtualId
      warnings.push(
        `No dish is both "${constraintLabel}" and "${pinLabel}" — session filter and pinned tag conflict.`,
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
      const tagName = tagById.get(tagId) ?? `tag #${tagId}`
      warnings.push(
        `No dish is both "${constraintLabel}" and tagged "${tagName}" — session filter and wishlist tag conflict.`,
      )
      warned.add(key)
    }
  }

  return warnings
}
