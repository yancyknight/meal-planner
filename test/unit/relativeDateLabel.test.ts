import { describe, it, expect } from 'vitest'
import { startOfWeek, addWeeks, addDays, addMonths, startOfDay } from 'date-fns'
import { weekRelativeLabel, dayRelativeLabel, monthRelativeLabel } from '../../app/utils/relativeDateLabel'

const MONDAY = new Date('2025-05-26T00:00:00.000Z') // a known Monday

describe('weekRelativeLabel', () => {
  const thisWeekStart = startOfWeek(MONDAY, { weekStartsOn: 1 })

  it('returns "this week" for the current week', () => {
    expect(weekRelativeLabel(thisWeekStart, MONDAY)).toBe('this week')
  })

  it('returns "next week" for +1 week', () => {
    expect(weekRelativeLabel(addWeeks(thisWeekStart, 1), MONDAY)).toBe('next week')
  })

  it('returns "last week" for -1 week', () => {
    expect(weekRelativeLabel(addWeeks(thisWeekStart, -1), MONDAY)).toBe('last week')
  })

  it('returns "in N weeks" for future weeks beyond next', () => {
    expect(weekRelativeLabel(addWeeks(thisWeekStart, 3), MONDAY)).toBe('in 3 weeks')
  })

  it('returns "N weeks ago" for past weeks beyond last', () => {
    expect(weekRelativeLabel(addWeeks(thisWeekStart, -4), MONDAY)).toBe('4 weeks ago')
  })
})

describe('dayRelativeLabel', () => {
  const TODAY = startOfDay(MONDAY)

  it('returns "today" for today', () => {
    expect(dayRelativeLabel(TODAY, TODAY)).toBe('today')
  })

  it('returns "tomorrow" for +1 day', () => {
    expect(dayRelativeLabel(addDays(TODAY, 1), TODAY)).toBe('tomorrow')
  })

  it('returns "yesterday" for -1 day', () => {
    expect(dayRelativeLabel(addDays(TODAY, -1), TODAY)).toBe('yesterday')
  })

  it('returns "in N days" for future beyond tomorrow', () => {
    expect(dayRelativeLabel(addDays(TODAY, 7), TODAY)).toBe('in 7 days')
  })

  it('returns "N days ago" for past beyond yesterday', () => {
    expect(dayRelativeLabel(addDays(TODAY, -30), TODAY)).toBe('30 days ago')
  })
})

describe('monthRelativeLabel', () => {
  const MAY_2025 = new Date('2025-05-01T00:00:00.000Z')

  it('returns "this month" for current month', () => {
    expect(monthRelativeLabel(MAY_2025, MAY_2025)).toBe('this month')
  })

  it('returns "next month" for +1 month', () => {
    expect(monthRelativeLabel(addMonths(MAY_2025, 1), MAY_2025)).toBe('next month')
  })

  it('returns "last month" for -1 month', () => {
    expect(monthRelativeLabel(addMonths(MAY_2025, -1), MAY_2025)).toBe('last month')
  })

  it('returns "in N months" for future beyond next', () => {
    expect(monthRelativeLabel(addMonths(MAY_2025, 3), MAY_2025)).toBe('in 3 months')
  })

  it('returns "N months ago" for past beyond last', () => {
    expect(monthRelativeLabel(addMonths(MAY_2025, -6), MAY_2025)).toBe('6 months ago')
  })
})
