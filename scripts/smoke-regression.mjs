import { chromium } from 'playwright';
import { createServer } from 'vite';

const APP_URL = 'http://127.0.0.1:4173';
const SAVE_KEY = 'aureus-save-v1';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  let viteServer;
  let browser;

  try {
    console.log('Starting Vite server for regression smoke...');
    viteServer = await createServer({
      server: {
        host: '127.0.0.1',
        port: 4173
      },
      logLevel: 'error'
    });
    await viteServer.listen();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(12000);

    console.log('Scenario 1: tutorial -> mine travel');
    await page.goto(APP_URL);
    await page.evaluate((key) => window.localStorage.removeItem(key), SAVE_KEY);
    await page.reload();

    const outOfBoundsLabelCount = await page.locator('text=/Out of bounds/i').count();
    assert(outOfBoundsLabelCount === 0, 'Expected world HUD to stop showing the misleading "Out of bounds" label on load.');

    await page.getByRole('button', { name: 'Start Journey' }).click();
    await page.waitForTimeout(500);
    const guidanceVisible = await page.locator('text=Go To The Bureau').count();
    assert(guidanceVisible > 0, 'Expected progression guidance to update to "Go To The Bureau".');

    await page.getByRole('button', { name: 'Mine' }).click();
    await page.waitForTimeout(1200);
    const mineHeading = await page.getByRole('heading', { name: /Iron Vein Outpost/i }).count();
    assert(mineHeading > 0, 'Expected mine scene to open after Mine navigation.');

    console.log('Scenario 2: seeded export -> payout');
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const state = JSON.parse(raw);
      state.currentScene = 'WORLD';
      state.activeMineId = null;
      state.ore = 5;
      state.money = 1000;
      if (state.permits && state.permits['export-license']) {
        state.permits['export-license'].status = 'APPROVED';
      }
      window.localStorage.setItem(key, JSON.stringify(state));
    }, SAVE_KEY);

    await page.reload();
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Export' }).click();
    await page.waitForTimeout(1000);

    const savedAfterExport = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, SAVE_KEY);

    assert(!!savedAfterExport, 'Expected save state to exist after export.');
    assert(savedAfterExport.ore === 0, `Expected ore=0 after export, got ${savedAfterExport.ore}.`);
    assert(savedAfterExport.money > 1000, `Expected money > 1000 after export, got ${savedAfterExport.money}.`);

    const exportToastCount = await page.locator('text=/Export Successful|Black-Market Export/i').count();
    assert(exportToastCount > 0, 'Expected export notification after export action.');

    console.log('Scenario 3: dialogue fallout -> market window affects export');
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const state = JSON.parse(raw);
      state.currentScene = 'WORLD';
      state.activeMineId = null;
      state.ore = 1;
      state.money = 0;
      state.day = 3;
      state.time = 9;
      state.worldEffects = {
        bureauPull: 0,
        communityBacking: 0,
        marketInsight: (state.day * 24) + state.time + 12,
        mediaHeat: 0
      };
      if (state.permits && state.permits['export-license']) {
        state.permits['export-license'].status = 'APPROVED';
      }
      window.localStorage.setItem(key, JSON.stringify(state));
    }, SAVE_KEY);

    await page.reload();
    await page.waitForTimeout(700);
    const marketWindowVisible = await page.locator('text=/Market Window/i').count();
    assert(marketWindowVisible > 0, 'Expected Market Window effect chip to be visible.');

    await page.getByRole('button', { name: 'Export' }).click();
    await page.waitForTimeout(1000);

    const savedAfterMarketWindow = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, SAVE_KEY);

    assert(!!savedAfterMarketWindow, 'Expected save state after market-window export.');
    assert(savedAfterMarketWindow.money >= 190, `Expected boosted export payout with Market Window, got ${savedAfterMarketWindow.money}.`);

    console.log('Scenario 4: political position panel reflects locked routes');
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const state = JSON.parse(raw);
      state.currentScene = 'WORLD';
      state.storyFlags = ['community_pact', 'fixer_smuggling_tie', 'inspector_blacklist'];
      window.localStorage.setItem(key, JSON.stringify(state));
    }, SAVE_KEY);

    await page.reload();
    await page.waitForTimeout(700);
    const politicalPanelTrigger = page.locator('text=Political Position').first();
    assert(await politicalPanelTrigger.count() > 0, 'Expected Political Position panel trigger to exist.');
    await politicalPanelTrigger.click();
    await page.waitForTimeout(300);

    const dealsVisible = await page.locator('text=Current Deals').count();
    const locksVisible = await page.locator('text=Locked Routes').count();
    const ledgerVisible = await page.locator('text=Run Ledger').count();
    const forecastVisible = await page.locator('text=Ending Forecast').count();
    assert(dealsVisible > 0, 'Expected Current Deals section in political position panel.');
    assert(locksVisible > 0, 'Expected Locked Routes section in political position panel.');
    assert(ledgerVisible > 0, 'Expected Run Ledger section in political position panel.');
    assert(forecastVisible > 0, 'Expected Ending Forecast section in political position panel.');

    console.log('Scenario 5: endings respect route-specific requirements');
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const state = JSON.parse(raw);
      state.currentScene = 'WORLD';
      state.money = 13000;
      state.activeEndingId = null;
      state.unlockedEndings = [];
      state.storyFlags = ['vox_exclusive'];
      window.localStorage.setItem(key, JSON.stringify(state));
    }, SAVE_KEY);

    await page.reload();
    await page.waitForTimeout(700);
    const blockedEndingCount = await page.getByText('Bureau Tycoon').count();
    assert(blockedEndingCount === 0, 'Expected Bureau Tycoon to stay locked without quiet-route flags.');

    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const state = JSON.parse(raw);
      state.currentScene = 'WORLD';
      state.money = 13000;
      state.activeEndingId = null;
      state.unlockedEndings = [];
      state.storyFlags = ['vane_backchannel', 'vox_embargo'];
      window.localStorage.setItem(key, JSON.stringify(state));
    }, SAVE_KEY);

    await page.reload();
    await page.waitForTimeout(700);
    const unlockedEndingCount = await page.getByText('Bureau Tycoon').count();
    assert(unlockedEndingCount > 0, 'Expected Bureau Tycoon to unlock with the quiet-route requirements satisfied.');

    console.log('Regression smoke passed: tutorial -> mine -> export -> dialogue fallout -> route panel -> ending path.');
  } finally {
    if (browser) await browser.close();
    if (viteServer) await viteServer.close();
  }
};

run().catch((error) => {
  console.error('\nRegression smoke failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
