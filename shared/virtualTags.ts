import type { Dish } from './types/dish'
import type { TagRef } from './types/planningSession'

export interface VirtualTag {
  id: string
  label: string
  subLabel: string
  emoji: string
  isDietary: boolean
  matches: (dish: Dish) => boolean
}

export const VIRTUAL_TAGS: VirtualTag[] = [
  {
    id: 'v:quick',
    label: 'quick',
    subLabel: '≤ 20 min',
    emoji: '⚡',
    isDietary: false,
    matches: (dish) => dish.timeEstimateMinutes !== null && dish.timeEstimateMinutes <= 20,
  },
  {
    id: 'v:easy',
    label: 'easy',
    subLabel: 'easy difficulty',
    emoji: '🟢',
    isDietary: false,
    matches: (dish) => dish.difficulty === 'easy',
  },
  {
    id: 'v:dairy-free',
    label: 'dairy-free',
    subLabel: 'no dairy',
    emoji: '🥛',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('dairy-free'),
  },
  {
    id: 'v:gluten-free',
    label: 'gluten-free',
    subLabel: 'no gluten',
    emoji: '🌾',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('gluten-free'),
  },
  {
    id: 'v:nut-free',
    label: 'nut-free',
    subLabel: 'no nuts',
    emoji: '🥜',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('nut-free'),
  },
  {
    id: 'v:shellfish-free',
    label: 'shellfish-free',
    subLabel: 'no shellfish',
    emoji: '🦐',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('shellfish-free'),
  },
  {
    id: 'v:egg-free',
    label: 'egg-free',
    subLabel: 'no eggs',
    emoji: '🥚',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('egg-free'),
  },
  {
    id: 'v:soy-free',
    label: 'soy-free',
    subLabel: 'no soy',
    emoji: '🫘',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('soy-free'),
  },
  {
    id: 'v:peanut-free',
    label: 'peanut-free',
    subLabel: 'no peanuts',
    emoji: '🥜',
    isDietary: true,
    matches: (dish) => dish.freeFrom.includes('peanut-free'),
  },
]

export function getVirtualTag(id: string): VirtualTag | undefined {
  return VIRTUAL_TAGS.find((t) => t.id === id)
}

export function matchesVirtualTag(dish: Dish, id: string): boolean {
  const tag = getVirtualTag(id)
  return tag ? tag.matches(dish) : false
}

export function matchesTag(dish: Dish, tagRef: TagRef): boolean {
  if (tagRef.kind === 'virtual') {
    return matchesVirtualTag(dish, tagRef.id)
  }
  return dish.tags.some((t) => t.id === tagRef.tagId)
}
