import {
  differenceInCalendarWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  startOfWeek,
  startOfMonth,
} from 'date-fns'

export function weekRelativeLabel(weekStart: Date, today: Date): string {
  const diff = differenceInCalendarWeeks(
    weekStart,
    startOfWeek(today, { weekStartsOn: 1 }),
    { weekStartsOn: 1 },
  )
  if (diff === 0) return 'this week'
  if (diff === 1) return 'next week'
  if (diff === -1) return 'last week'
  if (diff > 1) return `in ${diff} weeks`
  return `${Math.abs(diff)} weeks ago`
}

export function dayRelativeLabel(day: Date, today: Date): string {
  const diff = differenceInCalendarDays(day, today)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 1) return `in ${diff} days`
  return `${Math.abs(diff)} days ago`
}

export function monthRelativeLabel(month: Date, today: Date): string {
  const diff = differenceInCalendarMonths(startOfMonth(month), startOfMonth(today))
  if (diff === 0) return 'this month'
  if (diff === 1) return 'next month'
  if (diff === -1) return 'last month'
  if (diff > 1) return `in ${diff} months`
  return `${Math.abs(diff)} months ago`
}
