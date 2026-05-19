// All TanStack Query keys are defined and exported here.
// No inline key strings anywhere in the app.

export const queryKeys = {
  dishes: {
    all: () => ['dishes'] as const,
    list: (filters?: Record<string, unknown>) => ['dishes', 'list', filters] as const,
    detail: (id: number) => ['dishes', id] as const,
  },
  planEntries: {
    all: () => ['plan-entries'] as const,
    range: (start: string, end: string) => ['plan-entries', start, end] as const,
  },
  canonicalIngredients: {
    all: () => ['canonical-ingredients'] as const,
  },
  tags: {
    all: () => ['tags'] as const,
  },
  shoppingLists: {
    all: () => ['shopping-lists'] as const,
    detail: (id: number) => ['shopping-lists', id] as const,
  },
  planningSessions: {
    all: () => ['planning-sessions'] as const,
    detail: (id: number) => ['planning-sessions', id] as const,
  },
  settings: {
    all: () => ['settings'] as const,
  },
}
