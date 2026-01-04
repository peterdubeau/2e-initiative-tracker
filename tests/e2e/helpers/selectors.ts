/**
 * Centralized selectors for UI elements
 */

export const selectors = {
  // Common
  themeToggle: '[data-testid="theme-toggle"]',
  
  // Create Room / GM Login
  gmNameInput: 'label:has-text("GM Name") >> .. >> input[type="text"]',
  passwordInput: 'label:has-text("Password") >> .. >> input[type="password"]',
  loginButton: 'button:has-text("Login & Create Room")',
  createRoomCard: 'text=Create a Game Room',
  
  // Join Room
  selectGMCard: 'text=Select Game Master',
  gmListItem: (gmName: string) => `text=${gmName}`,
  playerNameInput: 'label:has-text("Character Name") >> .. >> input[type="text"]',
  initiativeInput: 'label:has-text("Initiative Roll") >> .. >> input[type="number"]',
  joinButton: 'button:has-text("Join Room")',
  
  // GM View
  gmView: 'text=GM Controls',
  gmNameHeader: (gmName: string) => `text=${gmName}`,
  encountersAccordion: 'text=Pre-loaded Encounters',
  encounterItem: (encounterName: string) => `text=${encounterName}`,
  encounterModal: 'text=Load Encounter:',
  loadEncounterButton: 'button:has-text("Load Encounter")',
  clearRoomButton: 'button:has-text("Clear Room Before Loading")',
  clearPlayersButton: 'button:has-text("Clear Players Before Loading")',
  clearMonstersButton: 'button:has-text("Clear Monsters Before Loading")',
  
  addMonsterAccordion: 'text=Add Monster',
  monsterNameInput: 'label:has-text("Monster Name") >> .. >> input[type="text"]',
  monsterRollInput: 'label:has-text("Initiative Roll") >> .. >> input[type="number"]',
  addMonsterButton: 'button:has-text("Add Monster")',
  
  initiativeOrderSection: 'text=Initiative Order',
  sortByInitiativeButton: 'button:has-text("Sort by Initiative")',
  clearAllButton: 'button:has-text("Clear All")',
  nextTurnButton: 'button:has-text("Next Turn")',
  
  // Entry/Item selectors
  entryCard: (name: string) => `text=${name}`,
  entryDeleteButton: (name: string) => `text=${name}` + ' >> .. >> button:has(svg) >> nth=-1', // Last button is delete
  entryColorButton: (name: string) => `text=${name}` + ' >> .. >> button[title="Change colors"]',
  entryCurrentTurnIndicator: 'text=▶',
  entryHiddenToggle: (name: string) => `text=${name}` + ' >> .. >> button:has(svg) >> nth=1', // Second button is visibility
  
  // Color Dialog
  colorDialog: 'text=Change Colors',
  colorDialogTitle: (title: string) => `text=${title}`,
  backgroundColorInput: 'text=Background Color >> .. >> input[type="color"]',
  textColorInput: 'text=Text Color >> .. >> input[type="color"]',
  colorDialogUpdateButton: 'button:has-text("Update Colors")',
  colorDialogCancelButton: 'button:has-text("Cancel")',
  
  // Player View
  playerView: 'text=Initiative Tracker',
  // Menu button is an IconButton with MoreVertIcon in the header Paper
  // The button is a sibling of the Box containing "Game Master" text within the flex container
  playerMenuButton: 'text=Game Master >> xpath=ancestor::*[contains(@class, "MuiPaper-root")][1]//button[.//svg]',
  playerChangeColorsMenuItem: 'text=Change Colors',
  
  // Dialogs
  confirmDialog: 'dialog[open]',
  confirmButton: 'button:has-text("Sort"), button:has-text("Clear All"), button:has-text("Clear")',
  cancelButton: 'button:has-text("Cancel")',
  
  // GM Menu
  gmMenuButton: 'text=Game Master >> .. >> button:has(svg)',
  copyLinkMenuItem: 'text=Copy Room Link',
} as const;

