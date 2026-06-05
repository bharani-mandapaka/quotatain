import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/session.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/login')

  // Wait for the login form
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })

  // Fill credentials
  await page.fill('input[type="email"]', 'meetbharani91@gmail.com')
  await page.fill('input[type="password"]', 'Password@123')
  await page.click('button[type="submit"]')

  // Should redirect away from login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 })

  // Confirm sidebar is visible (authenticated shell)
  await expect(page.locator('aside')).toBeVisible({ timeout: 10000 })

  // Save session
  await page.context().storageState({ path: AUTH_FILE })
  console.log('✓ Auth session saved')
})
