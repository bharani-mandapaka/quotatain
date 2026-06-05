import { test, expect } from '@playwright/test'

const BASE = 'https://quotatain-web-git-feat-new-design-meetbharani91-5980s-projects.vercel.app'

test.describe('TC-001 / TC-002 — Auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // clear session for auth tests

  test('TC-001: valid login lands on /runs with sidebar', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })

    await page.fill('input[type="email"]', 'meetbharani91@gmail.com')
    await page.fill('input[type="password"]', 'Password@123')
    await page.click('button[type="submit"]')

    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 })

    // Sidebar must be visible
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 })

    // Should be on /runs (root redirects there)
    expect(page.url()).toContain('/runs')

    // Saffron accent button exists
    const newRunBtn = page.locator('a[href="/runs/new"]').first()
    await expect(newRunBtn).toBeVisible()

    console.log('✓ TC-001 PASS — logged in, sidebar visible, on /runs')
  })

  test('TC-002: wrong password stays on login with error', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('input[type="email"]', { timeout: 15000 })

    await page.fill('input[type="email"]', 'meetbharani91@gmail.com')
    await page.fill('input[type="password"]', 'WRONG_PASSWORD_123')
    await page.click('button[type="submit"]')

    // Should stay on login
    await page.waitForTimeout(4000)
    expect(page.url()).toContain('/login')

    // Error message should appear somewhere
    const bodyText = await page.locator('body').innerText()
    const hasError = bodyText.toLowerCase().includes('error') ||
                     bodyText.toLowerCase().includes('invalid') ||
                     bodyText.toLowerCase().includes('incorrect') ||
                     bodyText.toLowerCase().includes('wrong') ||
                     bodyText.toLowerCase().includes('failed')
    expect(hasError, 'Expected an error message to be shown').toBeTruthy()

    console.log('✓ TC-002 PASS — stayed on login, error shown')
  })
})
