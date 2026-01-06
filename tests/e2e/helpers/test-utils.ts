import { Page, BrowserContext, expect } from '@playwright/test';
import { selectors } from './selectors';
import { waitForSocketConnection, waitForRoomUpdate, waitForEntry } from './socket-helpers';

/**
 * Helper functions for common test operations
 */

/**
 * Login as GM and navigate to room
 */
export async function loginAsGM(
  page: Page,
  gmName: string,
  password: string
): Promise<void> {
  await page.goto('/create');
  
  // Wait for page to load and form to be ready
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=Create a Game Room');
  
  // Wait for form inputs to be available
  await page.waitForSelector('label:has-text("GM Name")', { timeout: 10000 });
  
  // Use getByLabel for Material-UI TextFields
  await page.getByLabel('GM Name').fill(gmName);
  await page.getByLabel('Password').fill(password);
  
  // Wait for API response after clicking login
  const responsePromise = page.waitForResponse(
    resp => resp.url().includes('/login-gm') && resp.status() !== 0,
    { timeout: 10000 }
  );
  
  await page.click(selectors.loginButton);
  
  // Wait for response and check status
  const response = await responsePromise.catch(() => null);
  
  if (!response) {
    // No response received - server might not be running
    throw new Error(`Login failed: No response from server. Ensure the backend server is running on port 3001 (cd init-server && npm start)`);
  }
  
  if (!response.ok()) {
    const errorData = await response.json().catch(() => ({ error: 'Invalid credentials' }));
    const status = response.status();
    throw new Error(`Login failed (HTTP ${status}): ${errorData.error || 'Invalid credentials'}. Credentials: ${gmName}/${password}. Ensure: 1) Backend server is running (cd init-server && npm start), 2) Server was restarted after file changes, 3) GM file "${gmName}_encoded.txt" exists in gm_data/ and was loaded (check server startup logs).`);
  }
  
  // Wait for navigation to room (only if login succeeded)
  await page.waitForURL(`**/room/${gmName}`, { timeout: 15000 });
  await waitForSocketConnection(page);
  
  // Verify GM view is displayed
  await page.waitForSelector(selectors.gmView, { timeout: 10000 });
}

/**
 * Join room as a player
 */
export async function joinAsPlayer(
  page: Page,
  gmName: string,
  playerName: string,
  initiative: number,
  color: string = '#2196f3',
  textColor: string = '#ffffff',
  perceptionModifier?: number,
  autoRoll: boolean = false
): Promise<void> {
  await page.goto('/join');
  
  // Wait for GM list to load
  await page.waitForSelector(selectors.selectGMCard);
  
  // Select GM
  await page.click(selectors.gmListItem(gmName));
  
  // Wait for player details form to be ready
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=Join Game', { timeout: 10000 });
  await page.waitForSelector('label:has-text("Character Name")', { timeout: 10000 });
  
  // Use getByLabel for Material-UI TextFields
  await page.getByLabel('Character Name').fill(playerName);
  
  // Handle perception modifier and auto-roll
  if (autoRoll) {
    // Fill perception modifier if provided
    if (perceptionModifier !== undefined) {
      await page.getByLabel('Perception Modifier').fill(perceptionModifier.toString());
    }
    
    // Enable auto-roll switch
    const autoRollSwitch = page.locator(selectors.autoRollSwitch);
    await autoRollSwitch.waitFor({ state: 'visible', timeout: 5000 });
    const isChecked = await autoRollSwitch.isChecked();
    if (!isChecked) {
      await autoRollSwitch.click();
    }
    
    // Wait for calculated initiative to appear
    await page.waitForSelector(selectors.calculatedInitiativeDisplay, { timeout: 5000 });
    // Give a moment for the calculation to complete
    await page.waitForTimeout(300);
  } else {
    // Manual initiative entry (existing behavior)
    await page.getByLabel('Initiative Roll').fill(initiative.toString());
  }
  
  // Set colors if provided
  const colorInputs = await page.locator('input[type="color"]').all();
  if (colorInputs.length >= 1) {
    await colorInputs[0].fill(color);
  }
  if (colorInputs.length >= 2) {
    await colorInputs[1].fill(textColor);
  }
  
  // Join room
  await page.click(selectors.joinButton);
  
  // Wait for navigation to room
  await page.waitForURL(`**/room/${gmName}`, { timeout: 10000 });
  await waitForSocketConnection(page);
  
  // Wait for player view
  await page.waitForSelector(selectors.playerView);
  
  // Wait for player entry to appear
  await waitForEntry(page, playerName);
}

/**
 * Load an encounter in GM view
 */
export async function loadEncounter(
  page: Page,
  encounterName: string,
  clearRoom: boolean = false,
  clearPlayers: boolean = false,
  clearMonsters: boolean = false
): Promise<void> {
  // Set up dialog handler BEFORE clicking anything that might trigger it
  page.once('dialog', dialog => {
    dialog.accept();
  });
  
  // Expand encounters accordion
  const accordion = page.locator(selectors.encountersAccordion).locator('..');
  const isExpanded = await accordion.getAttribute('aria-expanded');
  
  if (isExpanded !== 'true') {
    await accordion.click();
    // Wait for accordion to expand and content to be visible
    // Material-UI AccordionDetails might be hidden during animation
    await page.waitForTimeout(800); // Give time for animation
  } else {
    // Already expanded, but wait a bit to ensure content is visible
    await page.waitForTimeout(200);
  }
  
  // Find the encounter Paper element - it exists in DOM even if hidden
  const encounterHeading = page.locator(`h6:has-text("${encounterName}")`).first();
  await encounterHeading.waitFor({ state: 'attached', timeout: 5000 });
  
  // Find the parent Paper element that has the onClick handler
  const encounterPaper = encounterHeading.locator('xpath=ancestor::*[contains(@class, "MuiPaper-root")][1]');
  await encounterPaper.waitFor({ state: 'attached', timeout: 5000 });
  
  // Scroll into view
  await encounterPaper.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200); // Brief pause after scroll
  
  // Use JavaScript click to ensure the onClick handler fires
  // Material-UI Paper elements with onClick handlers need proper event dispatch
  await encounterPaper.evaluate((el: HTMLElement) => {
    (el as HTMLElement).click();
  });
  
  // Wait for modal to appear - check for dialog title
  await page.waitForSelector(`text=/Load Encounter.*${encounterName}/`, { timeout: 10000 });
  
  // Select load option
  if (clearRoom) {
    await page.click(selectors.clearRoomButton);
  } else if (clearPlayers) {
    await page.click(selectors.clearPlayersButton);
  } else if (clearMonsters) {
    await page.click(selectors.clearMonstersButton);
  } else {
    await page.click(selectors.loadEncounterButton);
  }
  
  // Wait for modal to close (it closes after confirmation)
  await page.waitForSelector(selectors.encounterModal, { state: 'hidden', timeout: 10000 });
  
  // Wait for room update
  await waitForRoomUpdate(page);
  await page.waitForTimeout(1000); // Give time for all updates to propagate
}

/**
 * Click next turn button
 */
export async function clickNextTurn(page: Page): Promise<void> {
  await page.click(selectors.nextTurnButton);
  await page.waitForTimeout(500); // Wait for turn update
}

/**
 * Update entry colors
 */
export async function updateEntryColors(
  page: Page,
  entryName: string,
  backgroundColor: string,
  textColor: string
): Promise<void> {
  // Find the entry by name
  const entryLocator = page.locator(`text=${entryName}`).first();
  
  // Find the parent Paper element
  const paperElement = entryLocator.locator('xpath=ancestor::*[contains(@class, "MuiPaper")][1]');
  
  // Find the color button - it's the first button (before visibility and delete)
  const buttons = paperElement.locator('button');
  const buttonCount = await buttons.count();
  
  if (buttonCount >= 3) {
    // Color button is the first one (index 0)
    await buttons.first().click();
  } else if (buttonCount > 0) {
    // Fallback: click the first button
    await buttons.first().click();
  } else {
    throw new Error(`Could not find color button for entry: ${entryName}`);
  }
  
  // Wait for color dialog to be visible
  const colorDialog = page.locator('[role="dialog"]:has-text("Change Colors"), dialog:has-text("Change Colors")');
  await colorDialog.waitFor({ state: 'visible', timeout: 5000 });
  
  // Wait a moment for dialog animation to complete
  await page.waitForTimeout(300);
  
  // Update colors - find all color inputs within the dialog
  const colorInputs = colorDialog.locator('input[type="color"]');
  const inputCount = await colorInputs.count();
  
  if (inputCount >= 1) {
    // Wait for first input to be visible and ready
    await colorInputs.first().waitFor({ state: 'visible', timeout: 5000 });
    await colorInputs.first().fill(backgroundColor);
  }
  if (inputCount >= 2) {
    // Wait for second input to be visible and ready
    await colorInputs.nth(1).waitFor({ state: 'visible', timeout: 5000 });
    await colorInputs.nth(1).fill(textColor);
  }
  
  // Click update button
  await page.click('button:has-text("Update Colors")');
  
  // Wait for dialog to close
  await page.waitForSelector('text=Change Colors', { state: 'hidden', timeout: 5000 });
  
  // Wait for room update
  await waitForRoomUpdate(page);
  await page.waitForTimeout(500); // Give time for color update to propagate
}

/**
 * Remove an entry (monster or player)
 */
export async function removeEntry(page: Page, entryName: string): Promise<void> {
  // Find the entry by name text
  const entryLocator = page.locator(`text=${entryName}`).first();
  
  // Find the parent Paper element
  const paperElement = entryLocator.locator('xpath=ancestor::*[contains(@class, "MuiPaper")][1]');
  
  // Find all buttons in the paper - delete is the last button (after color and visibility)
  const buttons = paperElement.locator('button');
  const buttonCount = await buttons.count();
  
  if (buttonCount >= 3) {
    // Delete button is the last one (index buttonCount - 1)
    await buttons.nth(buttonCount - 1).click();
  } else if (buttonCount > 0) {
    // Fallback: click the last button
    await buttons.last().click();
  } else {
    throw new Error(`Could not find delete button for entry: ${entryName}`);
  }
  
  // Wait for entry to be removed
  await page.waitForTimeout(500);
}

/**
 * Clear all players (removes ALL entries - players AND monsters)
 * Note: Despite the name, this function removes all entries from the room
 */
export async function clearAllPlayers(page: Page): Promise<void> {
  await page.click(selectors.clearAllButton);
  
  // Wait for confirmation dialog - Material-UI uses role="dialog" or dialog element
  const dialog = page.locator('dialog[open], [role="dialog"]:has-text("Clear All Players")');
  await dialog.waitFor({ timeout: 10000 });
  
  // Click the "Clear All" button inside the dialog (not the one that opened it)
  await dialog.locator('button:has-text("Clear All")').click();
  
  // Wait for dialog to close
  await dialog.waitFor({ state: 'hidden' });
  
  // Wait for room to be empty (0 entries) - Clear All removes everything
  await waitForRoomUpdate(page, 0);
}

/**
 * Get current turn entry name
 * Returns null if no current turn is found or no entries exist
 */
export async function getCurrentTurnEntry(page: Page): Promise<string | null> {
  // First verify entries exist
  const entries = await page.evaluate(() => {
    const initiativeHeading = Array.from(document.querySelectorAll('h6, h5, h4, h3, h2, h1')).find(
      el => el.textContent?.includes('Initiative Order')
    );
    if (!initiativeHeading) return [];
    let container = initiativeHeading.parentElement;
    while (container && !container.className.includes('MuiCard') && !container.className.includes('MuiPaper')) {
      container = container.parentElement;
    }
    if (!container) return [];
    const containerText = container.textContent || '';
    if (containerText.includes('No entries yet') || containerText.includes('Waiting for players')) {
      return [];
    }
    return Array.from(container.querySelectorAll('[class*="MuiPaper-root"]'));
  });
  
  if (entries.length === 0) {
    return null;
  }
  
  const currentEntry = await page.evaluate(() => {
    // Find the initiative order section container
    const initiativeHeading = Array.from(document.querySelectorAll('h6, h5, h4, h3, h2, h1')).find(
      el => el.textContent?.includes('Initiative Order')
    );
    if (!initiativeHeading) return null;
    
    let container = initiativeHeading.parentElement;
    while (container && !container.className.includes('MuiCard') && !container.className.includes('MuiPaper')) {
      container = container.parentElement;
    }
    if (!container) return null;
    
    // Look for entry papers within the container (not the container itself)
    const papers = Array.from(container.querySelectorAll('[class*="MuiPaper-root"]'));
    
    for (const paper of papers) {
      // Skip if this paper doesn't contain an entry (check for Initiative: text)
      if (!paper.textContent?.includes('Initiative:')) {
        continue;
      }
      
      // Skip if this paper contains "Initiative Order" heading (it's the container, not an entry)
      if (paper.textContent?.includes('Initiative Order')) {
        continue;
      }
      
      // Check if this paper has a PlayArrowIcon (current turn indicator)
      // The icon is typically in an svg element with a path that includes "M8 5v14l11-7z"
      const svgs = paper.querySelectorAll('svg');
      for (const svg of svgs) {
        const path = svg.querySelector('path');
        if (path && path.getAttribute('d')?.includes('M8 5v14l11-7z')) {
          // Found the PlayArrowIcon, now get the entry name
          // The name is in an h6 heading - but exclude "Initiative Order"
          const heading = paper.querySelector('h6');
          if (heading) {
            const headingText = heading.textContent?.trim() || '';
            // Make sure it's not the section heading
            if (headingText && headingText !== 'Initiative Order') {
              return headingText;
            }
          }
        }
      }
      
      // Alternative: Check for higher elevation (current turn has elevation 8)
      // Current turn has border: 3px solid primary color
      const style = window.getComputedStyle(paper);
      const borderWidth = style.borderWidth;
      // Check if border is 3px (current turn indicator)
      if (borderWidth && (borderWidth === '3px' || borderWidth.includes('3px'))) {
        const heading = paper.querySelector('h6');
        if (heading) {
          const headingText = heading.textContent?.trim() || '';
          // Make sure it's an actual entry name, not the section heading
          if (headingText && headingText !== 'Initiative Order' && paper.textContent?.includes('Initiative:')) {
            return headingText;
          }
        }
      }
    }
    
    return null;
  });
  
  return currentEntry;
}

/**
 * Verify entry exists and has correct properties
 */
export async function verifyEntry(
  page: Page,
  entryName: string,
  expectedRoll?: number,
  expectedColor?: string
): Promise<void> {
  await page.waitForSelector(`text=${entryName}`);
  
  if (expectedRoll !== undefined) {
    const rollText = await page.locator(`text=${entryName}`).locator('..').textContent();
    expect(rollText).toContain(`Initiative: ${expectedRoll}`);
  }
  
  // Color verification would require more complex DOM inspection
  // For now, we just verify the entry exists
}

