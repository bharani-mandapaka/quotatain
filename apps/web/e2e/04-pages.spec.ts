import { test, expect } from '@playwright/test'

test.describe('TC-014–TC-020 — All Pages & Design', () => {
  test('TC-014: Dashboard shows greeting, metrics strip, quick actions', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const text = await page.locator('body').innerText()

    // Greeting
    expect(text).toMatch(/Good (morning|afternoon|evening)/i)

    // Metrics strip — should have numeric values
    const metricNumbers = await page.locator('div.font-mono').count()
    expect(metricNumbers, 'Should have mono font metric numbers').toBeGreaterThan(0)

    // Quick actions panel
    expect(text).toMatch(/Start a research run|New Run|Quick actions/i)

    console.log('✓ TC-014 PASS — dashboard renders with greeting + metrics')
  })

  test('TC-015: Integrations page — Connected badges for data providers', async ({ page }) => {
    await page.goto('/integrations')
    await page.waitForLoadState('networkidle')

    const text = await page.locator('body').innerText()

    // Connected integrations
    expect(text).toMatch(/Apollo/i)
    expect(text).toMatch(/Tavily/i)
    expect(text).toMatch(/NewsAPI|News/i)
    expect(text).toMatch(/Connected|Active/i)

    // V2 integrations
    expect(text).toMatch(/Salesforce/i)
    expect(text).toMatch(/HubSpot/i)
    expect(text).toMatch(/V2|coming soon|Coming/i)

    console.log('✓ TC-015 PASS — integrations page has correct provider list')
  })

  test('TC-016: Settings/Preferences — avatar, role badge, segmented controls', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const text = await page.locator('body').innerText()

    // Account section
    expect(text).toMatch(/Account|Preferences/i)
    expect(text).toMatch(/meetbharani91@gmail\.com|Bharani/i)

    // Role badge
    expect(text).toMatch(/ADMIN|Admin/i)

    // Appearance section
    expect(text).toMatch(/Appearance|Density|Theme/i)

    // Notifications section
    expect(text).toMatch(/Notifications?/i)

    // Sign out section
    expect(text).toMatch(/Sign out/i)

    console.log('✓ TC-016 PASS — settings/preferences page complete')
  })

  test('TC-017: Settings/Members — table with member + role legend', async ({ page }) => {
    await page.goto('/settings/users')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const text = await page.locator('body').innerText()

    // Should have a members table
    expect(text).toMatch(/Members|users/i)

    // Should have at least one member
    expect(text).toMatch(/meetbharani91@gmail\.com|Bharani/i)

    // Role legend
    expect(text).toMatch(/Account Executive|Head of Sales|Admin/i)

    // Add member button
    await expect(page.locator('button:has-text("Add member")')).toBeVisible()

    console.log('✓ TC-017 PASS — members page shows table + legend + add button')
  })

  test('TC-018: All sidebar links navigate without 404', async ({ page }) => {
    const links = [
      '/runs/new',
      '/runs',
      '/products',
      '/dashboard',
      '/integrations',
      '/settings',
      '/settings/users',
    ]

    const failures: string[] = []

    for (const link of links) {
      const response = await page.goto(link)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      const status = response?.status() ?? 0
      const text = await page.locator('body').innerText()
      const is404 = status === 404 || text.includes('404') || text.includes('This page could not be found')

      if (is404) failures.push(`${link} → ${status}`)
      else console.log(`  ✓ ${link} → ${status || 200}`)
    }

    expect(failures, `Pages returning 404: ${failures.join(', ')}`).toHaveLength(0)
    console.log('✓ TC-018 PASS — all sidebar routes return 200')
  })

  test('TC-019: Sidebar active state highlights current route', async ({ page }) => {
    await page.goto('/runs')
    await page.waitForLoadState('networkidle')

    // The active link should have bg-surface class (from Sidebar code)
    // Look for the "Runs" nav item with active styling
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()

    // At least one link should have active styling
    const activeLinks = await page.locator('aside a[class*="bg-surface"]').count()
    expect(activeLinks, 'At least one sidebar link should have active state').toBeGreaterThan(0)

    console.log(`✓ TC-019 PASS — ${activeLinks} active sidebar link(s) on /runs`)
  })

  test('TC-020: Design tokens — saffron accent, warm background', async ({ page }) => {
    await page.goto('/runs')
    await page.waitForLoadState('networkidle')

    // Check CSS custom properties
    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    })
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    })

    console.log(`  accent: "${accentColor}", bg: "${bgColor}"`)

    // Accent should be saffron (#D85A28 or rgb equivalent)
    expect(accentColor.toLowerCase()).toMatch(/#d85a28|rgb\(216,\s*90,\s*40\)/)

    // Background should be warm off-white (#FAFAF8)
    expect(bgColor.toLowerCase()).toMatch(/#fafaf8|rgb\(250,\s*250,\s*248\)/)

    console.log('✓ TC-020 PASS — design tokens correct (saffron accent, warm bg)')
  })
})
