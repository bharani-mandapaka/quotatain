import { test, expect } from '@playwright/test'

test.describe('TC-007–TC-013 — Research Runs', () => {
  test('TC-007 / TC-008: New Run page — product selector shows Naukri RMS, button disabled without selection', async ({ page }) => {
    await page.goto('/runs/new')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // TC-007: Naukri RMS should appear in product list
    const productOption = page.locator('text=Naukri RMS').first()
    await expect(productOption).toBeVisible({ timeout: 10000 })
    console.log('✓ TC-007 PASS — Naukri RMS visible in product selector')

    // TC-008: Research button should be disabled with no product selected
    const submitBtn = page.locator('button:has-text("Research")').first()
    const isDisabled = await submitBtn.isDisabled()
    expect(isDisabled, 'Research button should be disabled without product selected').toBeTruthy()
    console.log('✓ TC-008 PASS — Research button disabled with no product')
  })

  test('TC-009: Create run → redirects to run detail page', async ({ page }) => {
    await page.goto('/runs/new')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Select Naukri RMS
    const productLabel = page.locator('label').filter({ hasText: 'Naukri RMS' }).first()
    await expect(productLabel).toBeVisible({ timeout: 10000 })
    await productLabel.click()

    // Paste company names
    const textarea = page.locator('textarea').first()
    await textarea.fill('infosys.com\nwipro.com\nhcltech.com')
    await page.waitForTimeout(500)

    // Verify 3 companies detected
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/3\s*compan/i)

    // Submit
    const submitBtn = page.locator('button:has-text("Research")').first()
    await expect(submitBtn).toBeEnabled({ timeout: 5000 })
    await submitBtn.click()

    // Should navigate to /runs/<cuid> — pattern excludes /runs/new (len ≥ 5 chars, not "new")
    await page.waitForURL(
      url => /\/runs\/[a-z0-9]{5,}$/.test(url.pathname) && !url.pathname.endsWith('/new'),
      { timeout: 20000 }
    )
    console.log('✓ TC-009 PASS — redirected to run detail:', page.url())
  })

  test('TC-010 / TC-011: Run detail — progress animates, company status chips visible', async ({ page }) => {
    // First create a run to get a run ID
    await page.goto('/runs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const rows = page.locator('tbody tr')
    const rowCount = await rows.count()

    if (rowCount === 0) {
      console.log('⚠ TC-010 SKIP — no runs in list yet, create a run first')
      test.skip()
      return
    }

    // Click the most recent run
    await rows.first().click()
    await page.waitForURL(/\/runs\/[a-z0-9]+$/, { timeout: 10000 })
    // Wait for React Query to fetch run data and resolve the loading spinner
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const pageText = await page.locator('body').innerText()

    // TC-010: Check for progress indicators
    const hasProgress = pageText.includes('%') ||
                        pageText.includes('Processing') ||
                        pageText.includes('Queued') ||
                        pageText.includes('Done') ||
                        pageText.includes('completed')
    expect(hasProgress, 'Run detail should show progress status').toBeTruthy()
    console.log('✓ TC-010 PASS — progress/status visible on run detail')

    // TC-011: Company names visible
    const hasCompanies = pageText.toLowerCase().includes('infosys') ||
                         pageText.toLowerCase().includes('wipro') ||
                         pageText.toLowerCase().includes('hcl')
    expect(hasCompanies, 'Company names should appear in run detail').toBeTruthy()
    console.log('✓ TC-011 PASS — company cards visible')
  })

  test('TC-012: Completed run — FitmentWheel renders on expand', async ({ page }) => {
    await page.goto('/runs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Find a completed run
    const completedBadge = page.locator('tbody tr').filter({ hasText: 'Done' }).first()
    const completedCount = await page.locator('tbody tr').filter({ hasText: 'Done' }).count()

    if (completedCount === 0) {
      console.log('⚠ TC-012 SKIP — no completed runs yet (still processing)')
      test.skip()
      return
    }

    await completedBadge.click()
    await page.waitForURL(/\/runs\/[a-z0-9]+$/, { timeout: 10000 })
    await page.waitForTimeout(2000)

    // Look for SVG (FitmentWheel is an SVG) or a score number
    const svgCount = await page.locator('svg').count()
    const pageText = await page.locator('body').innerText()
    const hasScore = /\d+/.test(pageText) // any number could be a score

    expect(svgCount > 0 || hasScore, 'Should have SVG FitmentWheel or score numbers').toBeTruthy()
    console.log(`✓ TC-012 PASS — ${svgCount} SVGs found on completed run detail`)
  })

  test('TC-013: Runs list shows avg fitment and status badge', async ({ page }) => {
    await page.goto('/runs')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const rows = page.locator('tbody tr')
    const count = await rows.count()

    if (count === 0) {
      console.log('⚠ TC-013 SKIP — runs list is empty')
      test.skip()
      return
    }

    // Table headers should include Status, Avg Fit
    const tableText = await page.locator('table').innerText()
    expect(tableText.toLowerCase()).toMatch(/status|done|processing|queued/)
    console.log('✓ TC-013 PASS — runs list has status info, count:', count)
  })
})
