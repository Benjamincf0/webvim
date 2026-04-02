# AGENTS.md - Developer Guidelines for web-vim

This document provides guidelines for agentic coding agents working on this codebase.

---

## Project Overview

web-vim is a browser extension that provides Vim-style keyboard navigation for websites. It uses:
- **Runtime**: Bun
- **Build Tool**: Vite
- **Language**: TypeScript
- **Type Checking**: TypeScript (strict mode enabled)

---

## Build & Development Commands

```bash
# Install dependencies
bun install

# Build the extension (outputs to dist/)
bun run build

# Run development server (hot reload)
bun run

# Debug mode
bun run debug

# Type check only (no build)
bunx tsc --noEmit

# Build and type check together
bun run build && bunx tsc --noEmit
```

There are currently no test or lint commands configured.

---

## Code Style Guidelines

### General Conventions

- **Language**: TypeScript
- **Modules**: ES Modules with explicit `.ts` extensions in imports
- **Files**: One class per file, filename matches class name (e.g., `InputManager.ts` contains `InputManager` class)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `ExtensionCore`, `InputManager` |
| Functions/methods | camelCase | `handleKeyDown`, `executeCommand` |
| Constants | camelCase | `currentMode`, `mainItemsIndex` |
| Types/Interfaces | PascalCase | `UserConfig`, `TrieNode` |
| Files | PascalCase (matching class) | `InputManager.ts` |

### Type Annotations

- **Always** annotate function parameters and return types
- **Always** annotate class properties
- Use `import type { X }` for type-only imports (required by `verbatimModuleSyntax`)

```typescript
// Correct
import type { UserConfig, Mode } from "./types.js";
import { waitFor } from "./utils.js";

export class KeyTrie {
  root: TrieNode;

  constructor(keymap: KeymapConfig) {
    this.root = { children: {} };
  }

  search(buffer: string[]): TrieSearchResult {
    // ...
  }
}
```

### Import Style

```typescript
// Group imports: external → internal → types
import { waitFor, log } from "./utils.js";
import type { ExtensionCore } from "./types.js";
import { StrategyFactory } from "./strategy.js";

// Use curly braces for named exports
// Include .ts extension for local imports
```

### Formatting

- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Double quotes for strings
- **Line length**: No strict limit, but keep under 120 chars when reasonable
- **Curly braces**: Same-line opening brace for functions/classes

```typescript
export class ExtensionCore {
  constructor(config: UserConfig, hostname: string) {
    this.config = config;
  }
}
```

### Null Handling

TypeScript strict mode is enabled. Handle null/undefined explicitly:

```typescript
// Bad - will error with strict null checks
const item = items[i];
item.click(); // Object is possibly 'undefined'

// Good - explicit check
const item = items[i];
if (item) {
  item.click();
}

// Good - optional chaining
items[i]?.click();

// Good - early return
if (!items || items.length === 0) return;
```

### Definite Assignment

Use `!` for properties initialized outside the constructor (e.g., in async initialization):

```typescript
export class UIManager {
  box!: HTMLDivElement;  // Initialized in initUI(), not constructor
  textarea!: HTMLTextAreaElement;
  host!: HTMLDivElement;

  constructor(core: ExtensionCore) {
    this.core = core;
  }
}
```

---

## Error Handling

- Use the shared `log` utility for logging (not bare `console.log`):
  ```typescript
  import { log } from "./utils.js";

  log.info("message");
  log.warn("message");
  log.error("message");
  ```

- Use `try/catch` for async operations and DOM queries that may fail
- Handle null/undefined checks explicitly

---

## Comment Style

- Use block comments for section headers:
  ```typescript
  /** ===========================================================================
   * MODULE 5: THE CORE (Command Registry)
   * ============================================================================ */
  ```

- Use inline comments sparingly to explain non-obvious logic
- TODO comments should reference specific issues when possible

---

## Patterns & Best Practices

1. **MutationObserver for dynamic content**: Use `waitFor` utility (utils.ts) for elements that load asynchronously

2. **Key normalization**: Use `normalizeKey()` to handle cross-platform modifiers (mod = Cmd on Mac, Ctrl on Windows)

3. **Mode management**: Modes are strings like `"NAV_MODE"`, `"NORMAL_MODE"`, `"INSERT_MODE"`, `"VISUAL_LINE_MODE"`

4. **Strategy pattern**: Site-specific behavior lives in strategy classes (extend `BaseStrategy`)

5. **DOM queries**: Cache repeated queries; use `querySelectorAll` for collections

6. **Chrome API**: Use `window.chrome.storage.local.get/set` - the chrome global is declared in `types.ts`

---

## Project Structure

```
/src                    # Source files (TypeScript)
├── types.ts            # Shared types and interfaces
├── utils.ts            # Utilities (waitFor, log, normalizeKey)
├── trie.ts             # KeyTrie - key sequence matching
├── InputManager.ts     # Keyboard input handling
├── uimanager.ts        # UI overlay management
├── strategy.ts         # Site strategies & factory
├── core.ts             # ExtensionCore - main controller
└── content.ts          # Content script entry point

/dist                   # Build output (loaded by extension)
/manifest.json          # Extension manifest
```

---

## Common Tasks

### Adding a New Command

1. Add command ID to `CommandId` type in `types.ts`
2. Add command handler in `core.ts` switch statement
3. Implement in relevant strategy or add to `BaseStrategy`
4. Add keybinding in extension config (loaded at runtime)

### Adding a New Mode

1. Add mode string to `Mode` type in `types.ts`
2. Add mode switching commands in `core.ts`
3. Add keybindings in `content.ts` config

### Adding a New Site Strategy

1. Create new class extending `BaseStrategy` in `strategy.ts`
2. Add hostname matching in `StrategyFactory.get()`
3. Implement needed methods for site interactions

### Testing Changes

1. Build with `bun run build`
2. Type check with `bunx tsc --noEmit`
3. Load `dist/` folder as unpacked extension in Chrome
4. Check console for `[BetterWeb]` log output

---

## Important Notes

- This is a browser extension (Chrome/Firefox), not a web app
- DOM manipulation is core to the functionality
- The extension intercepts keyboard events via `addEventListener("keydown", ..., true)` (capture phase)
- TypeScript strict mode is enabled - all types must be explicit
- Use `import type` for type-only imports to satisfy `verbatimModuleSyntax`
