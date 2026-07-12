import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { PNG } from 'pngjs'

async function expectCanvasHasContent(canvas: Locator) {
  await expect(canvas).toBeVisible()
  const image = PNG.sync.read(await canvas.screenshot())
  const colors = new Set<string>()
  let opaqueSamples = 0
  let chromaticSamples = 0
  const stride = Math.max(4, Math.floor(Math.min(image.width, image.height) / 160))

  for (let y = 0; y < image.height; y += stride) {
    for (let x = 0; x < image.width; x += stride) {
      const offset = (image.width * y + x) * 4
      if (image.data[offset + 3] < 100) continue
      opaqueSamples += 1
      const red = image.data[offset]
      const green = image.data[offset + 1]
      const blue = image.data[offset + 2]
      colors.add(`${red}-${green}-${blue}`)
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 32) chromaticSamples += 1
    }
  }

  expect(opaqueSamples).toBeGreaterThan(200)
  expect(colors.size).toBeGreaterThan(18)
  expect(chromaticSamples).toBeGreaterThan(18)
}

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1)
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true })
}

test('desktop atlas renders every analytical surface and animation control', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Mapa semántico', exact: true })).toBeVisible()
  await expect(page.getByText('2,388').first()).toBeVisible()
  await expectCanvasHasContent(page.locator('.semantic-map canvas').last())
  await expectNoDocumentOverflow(page)
  await saveScreenshot(page, testInfo, 'atlas-desktop-map.png')

  const communityCentroid = await page.evaluate(async () => {
    const response = await fetch('/data/analytics.json')
    const payload = await response.json()
    return payload.clusters.find((cluster: { id: number }) => cluster.id === 1).centroid as [number, number, number]
  })
  const stageBox = await page.locator('.map-stage').boundingBox()
  expect(stageBox).not.toBeNull()
  const mapScale = 2 ** 6.05
  await page.mouse.move(
    stageBox!.x + stageBox!.width / 2 + (communityCentroid[0] - 7.74) * mapScale,
    stageBox!.y + stageBox!.height / 2 - (communityCentroid[1] - 4.56) * mapScale,
  )
  await expect(page.locator('.deck-tooltip')).toContainText('Comunidad 01')
  await expect(page.locator('.deck-tooltip')).toContainText('Crimen, violencia y seguridad')
  await saveScreenshot(page, testInfo, 'atlas-community-popup.png')

  await page.getByRole('button', { name: '3D', exact: true }).click()
  await expectCanvasHasContent(page.locator('.semantic-map canvas').last())
  await saveScreenshot(page, testInfo, 'atlas-desktop-3d.png')
  await page.locator('.semantic-map canvas').last().hover()
  await page.mouse.wheel(0, -650)
  await page.waitForTimeout(450)
  await saveScreenshot(page, testInfo, 'atlas-desktop-3d-close.png')

  await page.getByRole('button', { name: 'Tiempo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'El mapa a través del tiempo' })).toBeVisible()
  const year = page.locator('.timeline-year strong')
  await expect(year).toHaveText('2026')
  await page.getByRole('button', { name: 'Reproducir película' }).click()
  await expect(year).not.toHaveText('2026')
  await page.getByRole('button', { name: 'Pausar película' }).click()

  await page.getByRole('button', { name: 'Programas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Programas', exact: true })).toBeVisible()
  await expectCanvasHasContent(page.locator('.program-chart canvas').last())
  await saveScreenshot(page, testInfo, 'atlas-desktop-programs.png')

  await page.getByRole('button', { name: 'Temas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Territorios temáticos', exact: true })).toBeVisible()
  await expectCanvasHasContent(page.locator('.topic-chart canvas').last())
  await saveScreenshot(page, testInfo, 'atlas-desktop-topics.png')

  await page.getByRole('button', { name: 'Profesorado', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Profesorado', exact: true })).toBeVisible()
  await expectCanvasHasContent(page.locator('.faculty-chart canvas').last())
  await saveScreenshot(page, testInfo, 'atlas-desktop-faculty.png')
})

test('mobile atlas reflows without document overflow or control collisions', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Mapa semántico', exact: true })).toBeVisible()
  await expectCanvasHasContent(page.locator('.semantic-map canvas').last())
  await expectNoDocumentOverflow(page)

  const navigation = await page.locator('.side-navigation').boundingBox()
  const stage = await page.locator('.map-stage').boundingBox()
  expect(navigation).not.toBeNull()
  expect(stage).not.toBeNull()
  expect(navigation!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height - 1)
  await saveScreenshot(page, testInfo, 'atlas-mobile-map.png')

  await page.getByRole('button', { name: 'Tiempo', exact: true }).click()
  const dock = await page.locator('.timeline-dock').boundingBox()
  const timeStage = await page.locator('.map-stage').boundingBox()
  expect(dock).not.toBeNull()
  expect(timeStage).not.toBeNull()
  expect(dock!.y).toBeGreaterThanOrEqual(timeStage!.y)
  expect(dock!.y + dock!.height).toBeLessThanOrEqual(timeStage!.y + timeStage!.height + 1)

  await page.getByRole('button', { name: 'Programas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Programas', exact: true })).toBeVisible()
  await expectNoDocumentOverflow(page)
  await expectCanvasHasContent(page.locator('.program-chart canvas').last())
  await saveScreenshot(page, testInfo, 'atlas-mobile-programs.png')
  await page.locator('.analysis-context').scrollIntoViewIfNeeded()
  for (const label of ['Mapa', 'Tiempo', 'Programas', 'Temas', 'Profesorado']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
  }
  await saveScreenshot(page, testInfo, 'atlas-mobile-program-detail.png')
})
