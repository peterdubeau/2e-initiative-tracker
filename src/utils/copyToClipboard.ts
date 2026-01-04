import copy from 'clipboard-copy';

/**
 * Copies text to the clipboard with automatic fallback handling
 * @param text The text to copy to clipboard
 * @returns Promise that resolves if copy succeeds, rejects if it fails
 */
export async function copyToClipboard(text: string): Promise<void> {
  return copy(text);
}




