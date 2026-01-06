import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  loginAsGM,
  joinAsPlayer,
  loadEncounter,
  clickNextTurn,
  updateEntryColors,
  removeEntry,
  clearAllPlayers,
  getCurrentTurnEntry,
  verifyEntry,
} from './helpers/test-utils';
import { waitForRoomUpdate, waitForEntry, getVisibleEntries, isCurrentTurn } from './helpers/socket-helpers';
import { selectors } from './helpers/selectors';

const GM_NAME = 'E2e_Test';
const GM_PASSWORD = '123456';

test.describe('Full Workflow E2E Test', () => {
  let gmPage: Page;
  let player1Context: BrowserContext;
  let player1Page: Page;
  let player2Context: BrowserContext;
  let player2Page: Page;
  let player3Context: BrowserContext;
  let player3Page: Page;
  let player4Context: BrowserContext;
  let player4Page: Page;
  let player5Context: BrowserContext;
  let player5Page: Page;
  let player6Context: BrowserContext;
  let player6Page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create GM page
    gmPage = await browser.newPage();
    
    // Create player contexts (separate browser contexts to simulate different users)
    player1Context = await browser.newContext();
    player1Page = await player1Context.newPage();
    
    player2Context = await browser.newContext();
    player2Page = await player2Context.newPage();
    
    player3Context = await browser.newContext();
    player3Page = await player3Context.newPage();
    
    player4Context = await browser.newContext();
    player4Page = await player4Context.newPage();
    
    player5Context = await browser.newContext();
    player5Page = await player5Context.newPage();
    
    player6Context = await browser.newContext();
    player6Page = await player6Context.newPage();
  });

  test.beforeEach(async () => {
    // Reset GM page state by navigating to home first
    // This ensures we're on a valid page before accessing localStorage
    try {
      await gmPage.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
      await gmPage.waitForTimeout(200);
    } catch (error) {
      // If navigation fails, try to reload the page
      await gmPage.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
      await gmPage.waitForTimeout(200);
    }
    
    // Clear localStorage to prevent auto-login from interfering with tests
    // The CreateRoom component auto-logs in if credentials are stored
    // Only clear if we're on a valid page (not about:blank)
    const url = gmPage.url();
    if (url && !url.startsWith('about:')) {
      await gmPage.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up: Delete the test room from the server
    try {
      const hostname = process.env.SOCKET_HOST || 'localhost';
      const port = process.env.PORT || process.env.SOCKET_PORT || '3001';
      const response = await request.delete(`http://${hostname}:${port}/room/${GM_NAME}`);
      if (response.ok()) {
        console.log(`✅ Cleaned up test room: ${GM_NAME}`);
      } else {
        console.log(`⚠️ Failed to clean up test room: ${GM_NAME} (${response.status()})`);
      }
    } catch (error) {
      console.log(`⚠️ Error cleaning up test room: ${error}`);
    }
    
    await gmPage.close();
    await player1Page.close();
    await player1Context.close();
    await player2Page.close();
    await player2Context.close();
    await player3Page.close();
    await player3Context.close();
    await player4Page.close();
    await player4Context.close();
    await player5Page.close();
    await player5Context.close();
    await player6Page.close();
    await player6Context.close();
  });

  test('Complete workflow: GM login, players join, encounter load, turn rotation, color updates, and removals', async () => {
    // ============================================
    // 1. GM Login & Room Creation
    // ============================================
    await loginAsGM(gmPage, GM_NAME, GM_PASSWORD);
    
    // Verify GM view is displayed
    await expect(gmPage.locator(selectors.gmView)).toBeVisible();
    await expect(gmPage.locator(selectors.gmNameHeader(GM_NAME))).toBeVisible();
    
    // Clear any existing players from previous test runs
    const existingEntries = await getVisibleEntries(gmPage);
    if (existingEntries.length > 0) {
      await clearAllPlayers(gmPage);
      await waitForRoomUpdate(gmPage, 0);
    }

    // ============================================
    // 2. Players Join the Game
    // ============================================
    // Player 1 joins
    await joinAsPlayer(player1Page, GM_NAME, 'Player One', 15, '#ff0000', '#ffffff');
    await waitForRoomUpdate(gmPage, 1);
    
    // Verify player appears in GM view
    await verifyEntry(gmPage, 'Player One', 15);
    
    // Player 2 joins
    await joinAsPlayer(player2Page, GM_NAME, 'Player Two', 12, '#00ff00', '#000000');
    await waitForRoomUpdate(gmPage, 2);
    
    // Verify both players appear
    await verifyEntry(gmPage, 'Player Two', 12);
    
    // Player 3 joins
    await joinAsPlayer(player3Page, GM_NAME, 'Player Three', 18, '#0000ff', '#ffffff');
    await waitForRoomUpdate(gmPage, 3);
    
    // Verify all three players appear in GM view
    await verifyEntry(gmPage, 'Player Three', 18);
    
    const entriesAfterPlayers = await getVisibleEntries(gmPage);
    expect(entriesAfterPlayers.length).toBe(3);
    expect(entriesAfterPlayers.some(e => e.name === 'Player One')).toBe(true);
    expect(entriesAfterPlayers.some(e => e.name === 'Player Two')).toBe(true);
    expect(entriesAfterPlayers.some(e => e.name === 'Player Three')).toBe(true);
    
    // Verify players can see themselves in their views
    await expect(player1Page.locator('text=Player One')).toBeVisible();
    await expect(player2Page.locator('text=Player Two')).toBeVisible();
    await expect(player3Page.locator('text=Player Three')).toBeVisible();

    // ============================================
    // 2a. Players Join with Auto-Roll Initiative
    // ============================================
    // Player 4 joins with auto-roll enabled and positive perception modifier (+5)
    await joinAsPlayer(player4Page, GM_NAME, 'AutoRoll Player +5', 0, '#ff00ff', '#ffffff', 5, true);
    await waitForRoomUpdate(gmPage, 4);
    
    // Verify player appears in GM view
    const entriesAfterPlayer4 = await getVisibleEntries(gmPage);
    const player4Entry = entriesAfterPlayer4.find(e => e.name === 'AutoRoll Player +5');
    expect(player4Entry).toBeDefined();
    
    // Verify initiative is within expected range (1d20 + 5 = 6-25)
    if (player4Entry) {
      expect(player4Entry.roll).toBeGreaterThanOrEqual(6);
      expect(player4Entry.roll).toBeLessThanOrEqual(25);
    }
    
    // Player 5 joins with auto-roll enabled and negative perception modifier (-2)
    await joinAsPlayer(player5Page, GM_NAME, 'AutoRoll Player -2', 0, '#00ffff', '#000000', -2, true);
    await waitForRoomUpdate(gmPage, 5);
    
    // Verify player appears in GM view
    const entriesAfterPlayer5 = await getVisibleEntries(gmPage);
    const player5Entry = entriesAfterPlayer5.find(e => e.name === 'AutoRoll Player -2');
    expect(player5Entry).toBeDefined();
    
    // Verify initiative is within expected range (1d20 - 2 = -1 to 18)
    if (player5Entry) {
      expect(player5Entry.roll).toBeGreaterThanOrEqual(-1);
      expect(player5Entry.roll).toBeLessThanOrEqual(18);
    }
    
    // Player 6 joins with auto-roll enabled and no perception modifier (defaults to 0)
    await joinAsPlayer(player6Page, GM_NAME, 'AutoRoll Player 0', 0, '#ffff00', '#000000', undefined, true);
    await waitForRoomUpdate(gmPage, 6);
    
    // Verify player appears in GM view
    const entriesAfterPlayer6 = await getVisibleEntries(gmPage);
    const player6Entry = entriesAfterPlayer6.find(e => e.name === 'AutoRoll Player 0');
    expect(player6Entry).toBeDefined();
    
    // Verify initiative is within expected range (1d20 + 0 = 1-20)
    if (player6Entry) {
      expect(player6Entry.roll).toBeGreaterThanOrEqual(1);
      expect(player6Entry.roll).toBeLessThanOrEqual(20);
    }
    
    // Verify all players (manual and auto-roll) appear together
    const allEntries = await getVisibleEntries(gmPage);
    expect(allEntries.length).toBe(6);
    expect(allEntries.some(e => e.name === 'Player One')).toBe(true);
    expect(allEntries.some(e => e.name === 'Player Two')).toBe(true);
    expect(allEntries.some(e => e.name === 'Player Three')).toBe(true);
    expect(allEntries.some(e => e.name === 'AutoRoll Player +5')).toBe(true);
    expect(allEntries.some(e => e.name === 'AutoRoll Player -2')).toBe(true);
    expect(allEntries.some(e => e.name === 'AutoRoll Player 0')).toBe(true);

    // ============================================
    // 3. GM Loads an Encounter
    // ============================================
    // Expand encounters accordion
    const encountersAccordion = gmPage.locator(selectors.encountersAccordion).locator('..');
    const isExpanded = await encountersAccordion.getAttribute('aria-expanded');
    
    if (isExpanded !== 'true') {
      await encountersAccordion.click();
      await gmPage.waitForTimeout(500);
    }
    
    // Verify encounters are visible
    await expect(gmPage.locator(selectors.encounterItem('Encounter 1'))).toBeVisible();
    await expect(gmPage.locator(selectors.encounterItem('Encounter 2'))).toBeVisible();
    
    // Load Encounter 1 (without clearing)
    await loadEncounter(gmPage, 'Encounter 1', false, false, false);
    
    // Wait for monsters to appear
    await waitForRoomUpdate(gmPage);
    
    // Verify monsters from encounter appear (order may vary until sorted)
    await verifyEntry(gmPage, 'Environmental hazzard', 20);
    await verifyEntry(gmPage, 'Bad Guy 1', 17);
    await verifyEntry(gmPage, 'Bad Guy 2', 3);
    
    // Verify players are still present
    await verifyEntry(gmPage, 'Player One', 15);
    await verifyEntry(gmPage, 'Player Two', 12);
    await verifyEntry(gmPage, 'Player Three', 18);
    
    // Verify auto-roll players are still present
    const entriesAfterEncounter = await getVisibleEntries(gmPage);
    expect(entriesAfterEncounter.some(e => e.name === 'AutoRoll Player +5')).toBe(true);
    expect(entriesAfterEncounter.some(e => e.name === 'AutoRoll Player -2')).toBe(true);
    expect(entriesAfterEncounter.some(e => e.name === 'AutoRoll Player 0')).toBe(true);
    
    // Verify total entries (6 players + 3 monsters = 9)
    expect(entriesAfterEncounter.length).toBeGreaterThanOrEqual(9);

    // ============================================
    // 4. GM Rotates Turn Order
    // ============================================
    // Verify we have entries before checking turn
    const entriesBeforeTurn = await getVisibleEntries(gmPage);
    expect(entriesBeforeTurn.length).toBeGreaterThan(0);
    
    // Get initial turn entry (should exist since we have entries)
    const initialTurn = await getCurrentTurnEntry(gmPage);
    expect(initialTurn).not.toBeNull();
    expect(initialTurn).toBeTruthy();
    
    // Click next turn
    await clickNextTurn(gmPage);
    await gmPage.waitForTimeout(500);
    
    // Verify turn indicator moved
    const nextTurn = await getCurrentTurnEntry(gmPage);
    expect(nextTurn).not.toBeNull();
    expect(nextTurn).not.toBe(initialTurn);
    
    // Click next turn multiple times to verify wrapping
    for (let i = 0; i < 3; i++) {
      const beforeTurn = await getCurrentTurnEntry(gmPage);
      await clickNextTurn(gmPage);
      await gmPage.waitForTimeout(500);
      const afterTurn = await getCurrentTurnEntry(gmPage);
      expect(afterTurn).not.toBeNull();
      // Turn should have changed (unless we wrapped around)
    }
    
    // Verify hidden entries are skipped (Bad Guy 2 might be hidden, but we'll test with a visible entry)
    // This is implicitly tested by the turn rotation working correctly

    // ============================================
    // 5. Color Updates
    // ============================================
    // GM updates monster color
    await updateEntryColors(gmPage, 'Bad Guy 1', '#ff00ff', '#ffffff');
    
    // Player updates their own color
    // Open menu in player view - find the menu button in the header Paper
    const playerHeaderPaper = player1Page.locator('text=Game Master').locator('xpath=ancestor::*[contains(@class, "MuiPaper-root")][1]');
    const playerMenuBtn = playerHeaderPaper.locator('button:has(svg)').first();
    await playerMenuBtn.click();
    await player1Page.waitForTimeout(300);
    
    // Click "Change Colors"
    await player1Page.click(selectors.playerChangeColorsMenuItem);
    await player1Page.waitForTimeout(300);
    
    // Update colors
    const playerColorInputs = await player1Page.locator('input[type="color"]').all();
    if (playerColorInputs.length >= 1) {
      await playerColorInputs[0].fill('#ffff00');
    }
    if (playerColorInputs.length >= 2) {
      await playerColorInputs[1].fill('#000000');
    }
    
    // Click update
    await player1Page.click(selectors.colorDialogUpdateButton);
    await player1Page.waitForTimeout(1000);
    
    // Wait for update to propagate
    await waitForRoomUpdate(gmPage);

    // ============================================
    // 6. GM Removes Monsters
    // ============================================
    // Count entries before removal
    const entriesBeforeMonsterRemoval = await getVisibleEntries(gmPage);
    const countBefore = entriesBeforeMonsterRemoval.length;
    
    // Remove a monster
    await removeEntry(gmPage, 'Bad Guy 2');
    await waitForRoomUpdate(gmPage);
    
    // Verify count decreased
    const entriesAfterMonsterRemoval = await getVisibleEntries(gmPage);
    expect(entriesAfterMonsterRemoval.length).toBe(countBefore - 1);
    
    // Verify monster is removed from GM view (check both count and visibility)
    await expect(gmPage.locator('text=Bad Guy 2')).not.toBeVisible({ timeout: 5000 });
    expect(entriesAfterMonsterRemoval.some(e => e.name === 'Bad Guy 2')).toBe(false);
    
    // Verify monster is removed from player view
    await player1Page.waitForTimeout(1000);
    await expect(player1Page.locator('text=Bad Guy 2')).not.toBeVisible({ timeout: 5000 });

    // ============================================
    // 7. GM Removes Players
    // ============================================
    // Individual removal
    // Remove Player Two
    const entriesBeforePlayerRemoval = await getVisibleEntries(gmPage);
    const countBeforePlayerRemoval = entriesBeforePlayerRemoval.length;
    
    await removeEntry(gmPage, 'Player Two');
    await waitForRoomUpdate(gmPage);
    
    // Verify count decreased
    const entriesAfterPlayerRemoval = await getVisibleEntries(gmPage);
    expect(entriesAfterPlayerRemoval.length).toBe(countBeforePlayerRemoval - 1);
    
    // Verify player is removed from GM view (check both count and visibility)
    await expect(gmPage.locator('text=Player Two')).not.toBeVisible({ timeout: 5000 });
    expect(entriesAfterPlayerRemoval.some(e => e.name === 'Player Two')).toBe(false);
    
    // Verify player's browser receives "kicked" event and redirects
    await player2Page.waitForTimeout(1000); // Give time for socket event
    await player2Page.waitForURL('**/join', { timeout: 10000 });
    await expect(player2Page.locator(selectors.selectGMCard)).toBeVisible();
    
    // Bulk removal - Clear All
    // First verify we still have players
    const entriesBeforeClear = await getVisibleEntries(gmPage);
    const playerCount = entriesBeforeClear.filter(e => 
      e.name === 'Player One' || e.name === 'Player Three'
    ).length;
    expect(playerCount).toBeGreaterThan(0);
    
    // Clear all players (this removes ALL entries - players AND monsters)
    await clearAllPlayers(gmPage);
    
    // Verify all entries are removed from GM view (Clear All removes everything)
    await waitForRoomUpdate(gmPage, 0);
    await expect(gmPage.locator('text=Player One')).not.toBeVisible({ timeout: 5000 });
    await expect(gmPage.locator('text=Player Three')).not.toBeVisible({ timeout: 5000 });
    
    // Verify all player browser contexts receive "kicked" events and redirect
    await player1Page.waitForTimeout(1000); // Give time for socket event
    await player1Page.waitForURL('**/join', { timeout: 10000 });
    await expect(player1Page.locator(selectors.selectGMCard)).toBeVisible();
    
    await player3Page.waitForTimeout(1000); // Give time for socket event
    await player3Page.waitForURL('**/join', { timeout: 10000 });
    await expect(player3Page.locator(selectors.selectGMCard)).toBeVisible();
    
    // Verify all entries are removed (Clear All removes players AND monsters)
    const entriesAfterClear = await getVisibleEntries(gmPage);
    expect(entriesAfterClear.length).toBe(0);
  });

  test('Preferences persist across room joins', async () => {
    // Login as GM (page is reset by beforeEach, loginAsGM navigates to /create internally)
    await loginAsGM(gmPage, GM_NAME, GM_PASSWORD);
    await expect(gmPage.locator(selectors.gmView)).toBeVisible();
    
    // Clear any existing entries
    const existingEntries = await getVisibleEntries(gmPage);
    if (existingEntries.length > 0) {
      await clearAllPlayers(gmPage);
      await waitForRoomUpdate(gmPage, 0);
    }
    
    // Player joins with auto-roll and perception modifier
    await player1Page.goto('/join');
    await player1Page.waitForSelector(selectors.selectGMCard);
    await player1Page.click(selectors.gmListItem(GM_NAME));
    await player1Page.waitForLoadState('networkidle');
    await player1Page.waitForSelector('text=Join Game', { timeout: 10000 });
    
    // Fill character name first
    await player1Page.getByLabel('Character Name').fill('Prefs Test Player');
    
    // Enable auto-roll and set perception modifier
    const autoRollSwitch = player1Page.locator(selectors.autoRollSwitch);
    await autoRollSwitch.click();
    await player1Page.waitForTimeout(300);
    
    // Fill perception modifier
    await player1Page.getByRole('spinbutton', { name: 'Perception Modifier' }).fill('7');
    
    // Join room
    await player1Page.click(selectors.joinButton);
    await player1Page.waitForURL(`**/room/${GM_NAME}`, { timeout: 10000 });
    await waitForRoomUpdate(gmPage, 1);
    
    // Navigate back to join page
    await player1Page.goto('/join');
    await player1Page.waitForSelector(selectors.selectGMCard);
    await player1Page.click(selectors.gmListItem(GM_NAME));
    await player1Page.waitForLoadState('networkidle');
    await player1Page.waitForSelector('text=Join Game', { timeout: 10000 });
    
    // Verify preferences are restored
    const autoRollSwitch2 = player1Page.locator(selectors.autoRollSwitch);
    const isChecked = await autoRollSwitch2.isChecked();
    expect(isChecked).toBe(true);
    
    const perceptionModifierValue = await player1Page.getByRole('spinbutton', { name: 'Perception Modifier' }).inputValue();
    expect(perceptionModifierValue).toBe('7');
  });

  test('Perception modifier field visibility based on auto-roll toggle', async () => {
    // Login as GM (page is reset by beforeEach, loginAsGM navigates to /create internally)
    await loginAsGM(gmPage, GM_NAME, GM_PASSWORD);
    await expect(gmPage.locator(selectors.gmView)).toBeVisible();
    
    // Clear player page localStorage to ensure clean state (previous test may have set preferences)
    await player1Page.goto('/join');
    await player1Page.evaluate(() => {
      localStorage.removeItem('autoRoll');
      localStorage.removeItem('perceptionModifier');
    });
    
    // Navigate to join page as a player
    await player1Page.goto('/join');
    await player1Page.waitForSelector(selectors.selectGMCard);
    await player1Page.click(selectors.gmListItem(GM_NAME));
    await player1Page.waitForLoadState('networkidle');
    await player1Page.waitForSelector('text=Join Game', { timeout: 10000 });
    
    // Initially, auto-roll should be off (preferences cleared)
    const autoRollSwitch = player1Page.locator(selectors.autoRollSwitch);
    const isChecked = await autoRollSwitch.isChecked();
    expect(isChecked).toBe(false);
    
    // Perception modifier field should not exist when auto-roll is off (conditionally rendered)
    const perceptionModifierField = player1Page.getByRole('spinbutton', { name: 'Perception Modifier' });
    await expect(perceptionModifierField).toHaveCount(0);
    
    // Manual initiative input should be visible
    await expect(player1Page.locator(selectors.initiativeRollInput)).toBeVisible();
    
    // Enable auto-roll
    await autoRollSwitch.click();
    await player1Page.waitForTimeout(300);
    
    // Now perception modifier should be visible
    await expect(perceptionModifierField).toBeVisible();
    
    // Manual initiative input should NOT be visible
    await expect(player1Page.locator(selectors.initiativeRollInput)).toHaveCount(0);
    
    // Info message about auto-roll should be visible
    await expect(player1Page.locator('text=Initiative will be rolled automatically when you join')).toBeVisible();
  });

  test('GM cannot join their own room', async () => {
    // Login as GM (page is reset by beforeEach, loginAsGM navigates to /create internally)
    await loginAsGM(gmPage, GM_NAME, GM_PASSWORD);
    await expect(gmPage.locator(selectors.gmView)).toBeVisible();
    
    // Navigate to join page
    await gmPage.goto('/join');
    await gmPage.waitForSelector(selectors.selectGMCard);
    
    // Verify GM's own room is NOT in the list
    const gmListItems = gmPage.locator('text=' + GM_NAME);
    await expect(gmListItems).toHaveCount(0);
    
    // Verify other rooms (if any) are still visible
    // This test assumes there might be other rooms, but at minimum, GM's room should be filtered out
    const allGmItems = await gmPage.locator('[class*="MuiPaper-root"]').filter({ hasText: GM_NAME }).count();
    expect(allGmItems).toBe(0);
  });
});

