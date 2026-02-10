// lib/key-utils.js
export function normalizeKey(event) {
  const parts = [];
  
  // 1. Modifiers (Standard order: Ctrl, Alt, Meta, Shift)
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.metaKey) parts.push('meta'); // Command key on Mac
  if (event.shiftKey) parts.push('shift');

  // 2. The Key itself
  // usage of 'key' handles casing (e.g. 'A' vs 'a')
  // We force lowercase for consistency in mapping
  const key = event.key.toLowerCase();
  
  // Special handling: If shift is held, 'A' comes in as 'A', 
  // but we usually want 'shift+a' in our config.
  parts.push(key);

  return parts.join('+'); // Returns "ctrl+k" or "shift+j" or "g"
}