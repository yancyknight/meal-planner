import { expect, test } from '@nuxt/test-utils/playwright'

test('home redirects to the calendar', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/calendar$/)
  await expect(page.getByRole('main').getByText('Calendar', { exact: true })).toBeVisible()
})
