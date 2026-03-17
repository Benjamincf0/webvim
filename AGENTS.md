# AGENTS.md - Developer Guidelines for web-vim

This document provides guidelines for agentic coding agents working on this codebase.

## Project Overview

web-vim is a browser extension that provides Vim-style keyboard navigation for websites. It uses:
- **Runtime**: Bun
- **Build Tool**: Vite
- **Language**: Plain JavaScript (ES Modules)
- **Type Checking**: None (despite tsconfig.json, actual code is JS)

---

## Build & Development Commands

```bash
# Install dependencies
bun install

# Build the extension
bun run build

# Run development server (hot reload)
bun run

# Debug mode
bun run debug
```

**There are no configured test or lint commands.** If adding tests or linting, use:
- **Testing**: Vitest (works well with Vite)
- **Linting**: ESLint with eslint-plugin-import

---

## Code Style Guidelines

### General Conventions

- **Language**: Plain JavaScript (no TypeScript, even though tsconfig.json exists)
- **Modules**: ES Modules with explicit `.js` extensions in imports
- **Files**: One class per file,文件名匹配类名 (e.g., `InputManager.js` contains `InputManager` class)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `ExtensionCore`, `InputManager` |
| Functions/methods | camelCase | `handleKeyDown`, `executeCommand` |
| Constants | camelCase | `currentMode`, `mainItemsIndex` |
| Files | PascalCase (matching class) | `InputManager.js` |

### Import Style

```javascript
// Group imports: external → internal
import { waitFor, log } from "./utils.js";
import { StrategyFactory } from "./strategy.js";

// Use curly braces for named exports
// Include .js extension for local imports
```

### Formatting

- **Indentation**: 2 spaces
- **Semicolons**: Required
- **Quotes**: Double quotes for strings
- **Line length**: No strict limit, but keep under 120 chars when reasonable
- **Curly braces**: Same-line opening brace for functions/classes

```javascript
export class ExtensionCore {
  constructor(config, hostname) {
    this.config = config;
  }
}
```

### Error Handling

- Use the shared `log` utility for logging (not bare `console.log`):
  ```javascript
  import { log } from "./utils.js";
  
  log.info("message");
  log.warn("message");
  log.error("message");
  ```

- Use `try/catch` for async operations and DOM queries that may fail
- Handle null/undefined checks explicitly (see `isUserTyping` in utils.js)

### Comment Style

- Use block comments for section headers:
  ```javascript
  /** ===========================================================================
   * MODULE 5: THE CORE (Command Registry)
   * ============================================================================ */
  ```

- Use inline comments sparingly to explain non-obvious logic
- TODO comments should reference specific issues when possible

### Patterns & Best Practices

1. **MutationObserver for dynamic content**: Use `waitFor` or `waitForElement` utilities (utils.js) for elements that load asynchronously

2. **Key normalization**: Use `normalizeKey()` to handle cross-platform modifiers (mod = Cmd on Mac, Ctrl on Windows)

3. **Mode management**: Modes are strings like `"NAV_MODE"`, `"NORMAL_MODE"`, `"INSERT_MODE"`, `"VISUAL_LINE_MODE"`

4. **Strategy pattern**: Site-specific behavior lives in strategy classes (extend `BaseStrategy`)

5. **DOM queries**: Cache repeated queries; use `querySelectorAll` for collections

---

## Project Structure

```
/src or / (root)       # Source files
├── core.js            # ExtensionCore - main controller
├── InputManager.js   # Keyboard input handling
├── strategy.js       # Site strategies & factory
├── utils.js          # Utilities (waitFor, log, normalizeKey)
├── uimanager.js      # UI overlay management
├── trie.js           # Key sequence matching
├── content.js        # Content script entry point
└── manifest.json     # Extension manifest
```

---

## Common Tasks

### Adding a New Command

1. Add command ID in `core.js` switch statement
2. Implement in relevant strategy or add to `BaseStrategy`
3. Add keybinding in extension config (loaded at runtime)

### Adding a New Site Strategy

1. Create new class extending `BaseStrategy` in `strategy.js`
2. Add hostname matching in `StrategyFactory.get()`
3. Implement needed methods for site interactions

### Testing Changes

Since there's no test framework:
1. Build with `bun run build`
2. Load `dist/` folder as unpacked extension in Chrome
3. Check console for `[BetterWeb]` log output

---

## Important Notes

- The `tsconfig.json` exists but the project uses plain JavaScript
- This is a browser extension (Chrome/Firefox), not a web app
- DOM manipulation is core to the functionality
- The extension intercepts keyboard events via `addEventListener("keydown", ..., true)` (capture phase)
