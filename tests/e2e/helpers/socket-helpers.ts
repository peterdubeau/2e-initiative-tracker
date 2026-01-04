import { Page } from '@playwright/test';

/**
 * Utilities for socket.io interactions and waiting for state updates
 */

/**
 * Wait for socket.io connection by checking for socket connection in console or DOM
 * This is a simplified approach - in real tests we verify through DOM updates
 */
export async function waitForSocketConnection(page: Page, timeout = 10000): Promise<void> {
  // Wait for the page to be fully loaded and socket to connect
  // We verify connection through DOM updates rather than direct socket inspection
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Give socket time to connect
}

/**
 * Wait for room state to update by checking for entries in the DOM
 */
export async function waitForRoomUpdate(
  page: Page,
  expectedEntryCount?: number,
  timeout = 10000
): Promise<void> {
  if (expectedEntryCount !== undefined) {
    // Wait for specific number of entries by counting "Initiative:" text in the initiative order section
    await page.waitForFunction(
      (count) => {
        // Find the initiative order section by looking for the heading
        const initiativeHeading = Array.from(document.querySelectorAll('h6, h5, h4, h3, h2, h1')).find(
          el => el.textContent?.includes('Initiative Order')
        );
        
        if (!initiativeHeading) return false;
        
        // Find the parent container (Card or Paper)
        let container = initiativeHeading.parentElement;
        while (container && !container.className.includes('MuiCard') && !container.className.includes('MuiPaper')) {
          container = container.parentElement;
        }
        
        if (!container) return false;
        
        // Count "Initiative: <number>" patterns in this section, excluding empty state messages
        const sectionText = container.textContent || '';
        // Check for actual empty state messages from the UI
        if (sectionText.includes('No entries yet. Add monsters or wait for players to join.') || 
            sectionText.includes('Waiting for players to join...')) {
          return count === 0;
        }
        
        // Match "Initiative: <number>" patterns
        const initiativeMatches = sectionText.match(/Initiative:\s*\d+/g) || [];
        return initiativeMatches.length === count;
      },
      expectedEntryCount,
      { timeout }
    );
  } else {
    // Just wait for any room update - either entries appear or empty state is shown
    await Promise.race([
      page.waitForSelector('text=/Initiative:/', { timeout }).catch(() => null),
      page.waitForSelector('text=/No entries yet|Waiting for players to join/', { timeout }).catch(() => null),
    ]);
  }
}

/**
 * Wait for a specific entry to appear in the room
 */
export async function waitForEntry(
  page: Page,
  entryName: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(`text=${entryName}`, { timeout });
}

/**
 * Wait for an entry to be removed from the room
 */
export async function waitForEntryRemoval(
  page: Page,
  entryName: string,
  timeout = 10000
): Promise<void> {
  await page.waitForSelector(`text=${entryName}`, { state: 'hidden', timeout });
}

/**
 * Get all visible entries from the page
 */
export async function getVisibleEntries(page: Page): Promise<Array<{ name: string; roll: number }>> {
  const entries = await page.evaluate(() => {
    // Find the initiative order section
    const initiativeHeading = Array.from(document.querySelectorAll('h6, h5, h4, h3, h2, h1')).find(
      el => el.textContent?.includes('Initiative Order')
    );
    
    if (!initiativeHeading) return [];
    
    // Find the parent container (Card or Paper)
    let container = initiativeHeading.parentElement;
    while (container && !container.className.includes('MuiCard') && !container.className.includes('MuiPaper')) {
      container = container.parentElement;
    }
    
    if (!container) return [];
    
    // Skip if empty state
    const containerText = container.textContent || '';
    // Check for actual empty state messages from the UI
    if (containerText.includes('No entries yet. Add monsters or wait for players to join.') || 
        containerText.includes('Waiting for players to join...')) {
      return [];
    }
    
    // Find all buttons/elements that contain "Initiative:" within the container
    // Entries are typically buttons or Paper elements with the entry content
    const allElements = Array.from(container.querySelectorAll('button, [class*="Paper"], [class*="Card"]'));
    const result: Array<{ name: string; roll: number }> = [];
    
    allElements.forEach(el => {
      const text = el.textContent || '';
      // Match entries that have "Initiative: <number>" pattern
      const rollMatch = text.match(/Initiative:\s*(\d+)/);
      if (rollMatch) {
        // Extract name - look for text before "Initiative:" that's not UI text
        // The format is typically "Player Name Initiative: 15" or just the name in a heading
        const nameMatch = text.match(/([A-Za-z0-9\s_]+?)\s+Initiative:\s*\d+/);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          // Skip UI elements
          if (name && 
              !name.includes('Initiative Order') && 
              !name.includes('Sort by') && 
              !name.includes('Clear All') &&
              !name.includes('Add Monster') &&
              !name.includes('Pre-loaded')) {
            result.push({
              name: name,
              roll: parseInt(rollMatch[1], 10),
            });
          }
        } else {
          // Alternative: look for heading elements within the entry
          const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
          if (heading) {
            const headingText = heading.textContent?.trim() || '';
            if (headingText && !headingText.includes('Initiative Order')) {
              result.push({
                name: headingText,
                roll: parseInt(rollMatch[1], 10),
              });
            }
          }
        }
      }
    });
    
    // Remove duplicates (same name and roll)
    const unique = result.filter((entry, index, self) =>
      index === self.findIndex(e => e.name === entry.name && e.roll === entry.roll)
    );
    
    return unique;
  });
  
  return entries;
}

/**
 * Check if an entry is marked as current turn
 */
export async function isCurrentTurn(page: Page, entryName: string): Promise<boolean> {
  const entry = await page.locator(`text=${entryName}`).first();
  const parent = entry.locator('..');
  const hasIndicator = await parent.locator('text=▶').count() > 0;
  return hasIndicator;
}

