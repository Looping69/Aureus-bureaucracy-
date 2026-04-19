import { chromium } from 'playwright';
import { createServer } from 'vite';
import saveMetadata from '../src/game/saveMetadata.json' with { type: 'json' };

const APP_URL = 'http://127.0.0.1:4173';
const SAVE_KEY = saveMetadata.saveKey;
const LEGACY_SAVE_KEYS = saveMetadata.legacySaveKeys;
const SAVE_VERSION = saveMetadata.saveVersion;
const DEFAULT_SLOT_ID = 'slot-1';
const MOBILE_VIEWPORT_WIDTH = 430;
const ANALOG_STICK_DRAG_DISTANCE = 26;
const STICK_CENTER_TOLERANCE_PX = 40;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const clickButtonByText = async (page, text) => {
  await page.evaluate((targetText) => {
    const button = [...document.querySelectorAll('button')].find((element) =>
      element.textContent?.includes(targetText)
    );
    if (!(button instanceof HTMLElement)) {
      throw new Error(`Button not found: ${targetText}`);
    }
    button.click();
  }, text);
};

const clickNavAction = async (page, label) => {
  await page.evaluate((targetLabel) => {
    const navButtons = [...document.querySelectorAll('aside button')];
    const buttonTexts = navButtons.map((element) => element.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    const button = navButtons.find((element) => {
      const text = element.textContent?.replace(/\s+/g, ' ').trim();
      return text?.includes(targetLabel);
    });
    if (!(button instanceof HTMLElement)) {
      throw new Error(`Nav action not found: ${targetLabel}. Saw [${buttonTexts.join(' | ')}]`);
    }
    button.click();
  }, label);
};

const clickDialogClose = async (page, headingText) => {
  await page.evaluate((targetHeading) => {
    const overlay = [...document.querySelectorAll('.fixed')]
      .find((element) => element.textContent?.includes(targetHeading));
    if (!(overlay instanceof HTMLElement)) {
      throw new Error(`Dialogue overlay not found for ${targetHeading}.`);
    }

    const closeButton = [...overlay.querySelectorAll('button')]
      .find((button) => !(button.textContent ?? '').trim());
    if (!(closeButton instanceof HTMLElement)) {
      throw new Error(`Close button not found for ${targetHeading} dialogue.`);
    }

    closeButton.click();
  }, headingText);
};

const clearAllSaves = async (page) => {
  await page.evaluate(({ saveKey, legacyKeys }) => {
    [saveKey, ...legacyKeys].forEach((key) => window.localStorage.removeItem(key));
  }, { saveKey: SAVE_KEY, legacyKeys: LEGACY_SAVE_KEYS });
};

const readSavedState = async (page, slotId = DEFAULT_SLOT_ID) => page.evaluate(({ key, slotId: targetSlotId }) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  return parsed?.slots?.[targetSlotId]?.state ?? null;
}, { key: SAVE_KEY, slotId });

const writeSavedState = async (page, state, slotId = DEFAULT_SLOT_ID) => {
  await page.evaluate(({ key, version, state: nextState, slotId: targetSlotId }) => {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { version, slots: {} };
    window.localStorage.setItem(key, JSON.stringify({
      version,
      slots: {
        ...(parsed?.slots ?? {}),
        [targetSlotId]: {
          version,
          savedAt: new Date().toISOString(),
          state: nextState,
        },
      },
    }));
  }, { key: SAVE_KEY, version: SAVE_VERSION, state, slotId });
};

const mutateSavedState = async (page, mutator, slotId = DEFAULT_SLOT_ID) => {
  const current = await readSavedState(page, slotId);
  assert(!!current, 'Expected a save state to exist before mutation.');
  const nextState = mutator(structuredClone(current));
  await writeSavedState(page, nextState, slotId);
};

const reloadWithMutatedSave = async (page, mutator, slotId = DEFAULT_SLOT_ID) => {
  const current = await readSavedState(page, slotId);
  assert(!!current, 'Expected a save state to exist before mutation.');
  const nextState = mutator(structuredClone(current));

  await page.evaluate(({ key, version, state, slotId: targetSlotId }) => {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { version, slots: {} };
    window.localStorage.setItem(key, JSON.stringify({
      version,
      slots: {
        ...(parsed?.slots ?? {}),
        [targetSlotId]: {
          version,
          savedAt: new Date().toISOString(),
          state,
        },
      },
    }));
    window.location.reload();
  }, { key: SAVE_KEY, version: SAVE_VERSION, state: nextState, slotId });

  await page.waitForLoadState('domcontentloaded');
};

const removeBlockingNotificationOverlay = async (page) => {
  await page.evaluate(() => {
    const title = [...document.querySelectorAll('h2')].find((element) =>
      element.textContent?.trim() === 'Save Loaded'
    );
    const overlay = title?.closest('.fixed');
    if (overlay instanceof HTMLElement) {
      overlay.remove();
    }
  });
};

const waitForWorldHud = async (page) => {
  await page.locator('[aria-label="Movement stick"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(400);
};

const waitForOfficeScene = async (page, buildingName = 'Bureau of Extraction') => {
  await page.getByText(new RegExp(buildingName, 'i')).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(400);
};

const waitForGameShell = async (page) => {
  await page.getByText('Aureus: Below').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('[aria-label="Expand navigation panel"], [aria-label="Collapse navigation panel"]').first().waitFor({
    state: 'visible',
    timeout: 30000,
  });
  await page.waitForTimeout(500);
};

const waitForMineSceneReady = async (page) => {
  await page.getByText(/Iron Vein Outpost/i).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(({ key, slotId }) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const state = parsed?.slots?.[slotId]?.state;
    return state?.currentScene === 'MINE' && state?.activeMineId === 'iron-vein';
  }, { key: SAVE_KEY, slotId: DEFAULT_SLOT_ID }, { timeout: 15000 });
};

const openNavigationPanel = async (page) => {
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    const toggle = document.querySelector('[aria-label="Expand navigation panel"], [aria-label="Collapse navigation panel"]');
    if (!(toggle instanceof HTMLElement)) throw new Error('Navigation toggle not found.');
    toggle.click();
  });
  await page.waitForTimeout(250);
};

const continueSavedRun = async (page) => {
  const continueButton = page.getByRole('button', { name: /Continue/i });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);
  if (!(await continueButton.isVisible().catch(() => false))) return;
  await continueButton.click();
  await page.getByText(/Save Archive/i).first().waitFor({ state: 'visible', timeout: 30000 });
  await page.getByRole('button', { name: /File 1/i }).click();
  await page.waitForTimeout(500);
  await removeBlockingNotificationOverlay(page);
};

const startRun = async (page) => {
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /Start Run/i }).waitFor({ state: 'visible', timeout: 30000 });
  await page.evaluate(() => {
    const startButton = [...document.querySelectorAll('button')].find((el) =>
      el.textContent?.includes('Start Run')
    );
    if (!(startButton instanceof HTMLElement)) throw new Error('Start Run button not found.');
    startButton.click();
  });
  await page.waitForTimeout(600);
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
    const context = await browser.newContext({
      viewport: {
        width: MOBILE_VIEWPORT_WIDTH,
        height: 932
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    console.log('Scenario 1: new run boot -> controls -> mine travel');
    await page.goto(APP_URL);
    await clearAllSaves(page);
    await page.reload();

    await page.getByText(/World Files/i).first().waitFor({ state: 'visible', timeout: 30000 });

    await page.getByRole('button', { name: /World 1/i }).click();
    await startRun(page);
    const startRunStillVisible = await page.getByRole('button', { name: /Start Run/i }).count();
    assert(startRunStillVisible === 0, 'Expected the FTUE CTA to dismiss after starting the run.');
    await waitForWorldHud(page);

    const outOfBoundsLabelCount = await page.locator('text=/Out of bounds/i').count();
    assert(outOfBoundsLabelCount === 0, 'Expected world HUD to stop showing the misleading "Out of bounds" label after boot.');

    const savedAfterStart = await readSavedState(page);
    assert(!!savedAfterStart, 'Expected autosave to exist after starting a new run.');
    assert(savedAfterStart.ftuePhase === 'reach_bureau', `Expected FTUE phase reach_bureau after starting the run, got ${savedAfterStart.ftuePhase}.`);
    assert(savedAfterStart.currentScene === 'WORLD', `Expected current scene WORLD after starting the run, got ${savedAfterStart.currentScene}.`);

    const movementStick = page.locator('[aria-label="Movement stick"]');
    await movementStick.waitFor({ state: 'visible', timeout: 30000 });
    const stickBox = await movementStick.boundingBox();
    assert(!!stickBox, 'Expected the analog stick to be measurable for drag input.');
    const viewportCenterX = MOBILE_VIEWPORT_WIDTH / 2;
    const stickCenterOffset = Math.abs((stickBox.x + (stickBox.width / 2)) - viewportCenterX);
    assert(
      stickCenterOffset <= STICK_CENTER_TOLERANCE_PX,
      `Expected the analog stick to stay near the horizontal center of the screen, got offset ${stickCenterOffset}.`
    );
    const stickCenterX = stickBox.x + (stickBox.width / 2);
    const stickCenterY = stickBox.y + (stickBox.height / 2);

    const beforeAnalogMove = (await readSavedState(page))?.playerPos ?? null;

    await page.mouse.move(stickCenterX, stickCenterY);
    await page.mouse.down();
    await page.mouse.move(stickCenterX + ANALOG_STICK_DRAG_DISTANCE, stickCenterY, { steps: 8 });
    await page.waitForTimeout(1000);
    await page.mouse.up();
    await page.waitForTimeout(1400);

    const afterAnalogMove = (await readSavedState(page))?.playerPos ?? null;

    assert(!!beforeAnalogMove && !!afterAnalogMove, 'Expected player position to be readable before and after analog movement.');
    assert(
      beforeAnalogMove.x !== afterAnalogMove.x || beforeAnalogMove.y !== afterAnalogMove.y,
      `Expected analog stick movement to change player position, got ${JSON.stringify(beforeAnalogMove)} -> ${JSON.stringify(afterAnalogMove)}.`
    );

    await clickNavAction(page, 'Mine');
    await waitForMineSceneReady(page);

    const savedAfterMineTravel = await readSavedState(page);
    assert(!!savedAfterMineTravel, 'Expected save state to still exist after mine travel.');
    assert(savedAfterMineTravel.currentScene === 'MINE', `Expected save state scene=MINE after Mine navigation, got ${savedAfterMineTravel.currentScene}.`);
    assert(savedAfterMineTravel.activeMineId === 'iron-vein', `Expected activeMineId=iron-vein after Mine navigation, got ${savedAfterMineTravel.activeMineId}.`);

    console.log('Scenario 2: archive restore resumes the latest file');
    const restoredPage = await context.newPage();
    restoredPage.setDefaultTimeout(30000);
    await restoredPage.goto(APP_URL);
    await continueSavedRun(restoredPage);
    await waitForMineSceneReady(restoredPage);
    const restoredState = await readSavedState(restoredPage);
    assert(!!restoredState, 'Expected save state to remain available after archive restore.');
    assert(restoredState.currentScene === 'MINE', `Expected restored save state scene=MINE, got ${restoredState.currentScene}.`);
    await restoredPage.close();
    await page.close();

    console.log('Scenario 3: seeded Bureau FTUE flow unlocks and starts Form 17-B');
    const seedPage = await context.newPage();
    seedPage.setDefaultTimeout(30000);
    await seedPage.goto(APP_URL);
    await writeSavedState(seedPage, {
      ...savedAfterStart,
      currentScene: 'OFFICE',
      activeBuildingId: 'licensing_office',
      activeNPCId: null,
      activePermitId: null,
      activeMiniGame: null,
      pendingPermitAction: null,
      time: 10,
      ftuePhase: 'talk_vane',
      tutorialStep: 2,
      tutorialMinimized: false,
      knownNpcIds: Array.from(new Set([...(savedAfterStart.knownNpcIds ?? []), 'licensing'])),
      buildings: {
        ...savedAfterStart.buildings,
        licensing_office: {
          ...savedAfterStart.buildings.licensing_office,
          isDiscovered: true,
        },
      },
      objectives: [
        {
          id: 'talk-vane',
          text: 'Talk to Officer Vane now.',
          isCompleted: false,
          type: 'TALK',
          targetId: 'licensing',
        },
      ],
      permits: {
        ...savedAfterStart.permits,
        'extraction-intent': {
          ...savedAfterStart.permits['extraction-intent'],
          status: 'LOCKED',
          rejectionReason: undefined,
          accuracy: undefined,
        },
      },
    });
    await seedPage.close();

    const bureauPage = await context.newPage();
    bureauPage.setDefaultTimeout(30000);
    await bureauPage.goto(APP_URL);
    await continueSavedRun(bureauPage);
    await waitForOfficeScene(bureauPage);

    await bureauPage.getByRole('button', { name: /Officer Vane/i }).click();
    await bureauPage.getByRole('button', { name: /I need a permit to start digging\./i }).click();
    await bureauPage.waitForFunction(({ key, slotId }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const state = parsed?.slots?.[slotId]?.state;
      return state?.permits?.['extraction-intent']?.status === 'AVAILABLE';
    }, { key: SAVE_KEY, slotId: DEFAULT_SLOT_ID }, { timeout: 15000 });
    await bureauPage.waitForFunction(({ key, slotId }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const state = parsed?.slots?.[slotId]?.state;
      return state?.ftuePhase === 'open_form_17b';
    }, { key: SAVE_KEY, slotId: DEFAULT_SLOT_ID }, { timeout: 15000 });
    const unlockedPermitState = await readSavedState(bureauPage);
    assert(!!unlockedPermitState, 'Expected save state to exist after speaking to Officer Vane.');
    assert(
      unlockedPermitState.permits['extraction-intent']?.status === 'AVAILABLE',
      `Expected Extraction Intent to unlock after talking to Vane, got ${unlockedPermitState.permits['extraction-intent']?.status}.`,
    );
    assert(
      unlockedPermitState.ftuePhase === 'open_form_17b',
      `Expected FTUE phase open_form_17b after Vane dialogue, got ${unlockedPermitState.ftuePhase}.`,
    );

    await clickButtonByText(bureauPage, "I'll get right on it.");
    await clickDialogClose(bureauPage, 'Officer Vane');
    await bureauPage.getByRole('button', { name: /Extraction Intent/i }).click();
    await bureauPage.waitForFunction(({ key, slotId }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const state = parsed?.slots?.[slotId]?.state;
      return state?.activePermitId === 'extraction-intent' && state?.ftuePhase === 'submit_form_17b';
    }, { key: SAVE_KEY, slotId: DEFAULT_SLOT_ID }, { timeout: 15000 });

    const openedPermitState = await readSavedState(bureauPage);
    assert(
      openedPermitState?.activePermitId === 'extraction-intent',
      `Expected Extraction Intent to be the active permit after opening it, got ${openedPermitState?.activePermitId}.`,
    );
    assert(
      openedPermitState?.ftuePhase === 'submit_form_17b',
      `Expected FTUE phase submit_form_17b after opening Extraction Intent, got ${openedPermitState?.ftuePhase}.`,
    );

    await bureauPage.getByRole('button', { name: /Standard Filing/i }).click();
    await bureauPage.waitForFunction(({ key, slotId }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const state = parsed?.slots?.[slotId]?.state;
      return (
        state?.pendingPermitAction === 'SUBMIT' &&
        state?.activeMiniGame === 'FORM_PROCESSING' &&
        state?.ftuePhase === 'ftue_complete'
      );
    }, { key: SAVE_KEY, slotId: DEFAULT_SLOT_ID }, { timeout: 15000 });
    const submittedPermitState = await readSavedState(bureauPage);
    assert(
      submittedPermitState?.pendingPermitAction === 'SUBMIT',
      `Expected pending permit action SUBMIT after filing Extraction Intent, got ${submittedPermitState?.pendingPermitAction}.`,
    );
    assert(
      submittedPermitState?.activeMiniGame === 'FORM_PROCESSING',
      `Expected Form Processing minigame to start after filing, got ${submittedPermitState?.activeMiniGame}.`,
    );
    assert(
      submittedPermitState?.ftuePhase === 'ftue_complete',
      `Expected FTUE phase ftue_complete after filing starts, got ${submittedPermitState?.ftuePhase}.`,
    );
    await bureauPage.close();

    console.log('Regression smoke passed: boot, save archive restore, Bureau FTUE filing chain, and mine navigation.');
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
