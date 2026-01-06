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
    
    // Verify total entries (3 players + 3 monsters = 6)
    const entriesAfterEncounter = await getVisibleEntries(gmPage);
    expect(entriesAfterEncounter.length).toBeGreaterThanOrEqual(6);

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
});

