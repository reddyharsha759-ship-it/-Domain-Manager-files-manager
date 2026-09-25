# Domain File Manager

[![Visual Studio Code](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/reddyharsha759-ship-it/-Domain-Manager-files-manager?include_prereleases&color=green)](https://github.com/reddyharsha759-ship-it/-Domain-Manager-files-manager/releases)

A productivity extension for **VS Code** and **Antigravity** that organizes workspace files into functional domains (**Frontend**, **Backend**, **Auth**, and **Extra Files**) rather than rigid physical folder paths.

---

## Why Domain File Manager?

Modern full-stack codebases often scatter related logic across fragmented directory structures (`src/`, `lib/`, `server/`, `ui/`, `api/`). **Domain File Manager** brings semantic domain-driven navigation directly to your sidebar:

```text
📁 Functional Domains
├── 🛡️ Auth (5)
│   ├── 📁 providers (2)
│   │   ├── auth_provider.dart
│   │   └── session_provider.dart
│   └── auth_service.ts
├── 🎨 Frontend (24)
│   ├── 📁 components (16)
│   ├── 📁 screens (6)
│   └── App.tsx
├── ⚙️ Backend (12)
│   ├── 📁 api (8)
│   ├── 📁 database (4)
│   └── server.ts
└── 📦 Extra Files (9)
    ├── 📁 docs (3)
    ├── 📁 scripts (4)
    ├── .domains.json
    └── README.md
```

---

## Key Features

- **Domain-Driven Grouping**: Automatically classifies files into **Frontend**, **Backend**, **Auth**, and **Extra Files**.
- **Nested Folder Organization**: Files under domains and extra categories preserve their directory hierarchy with expandable subfolders and file count badges.
- **Customizable Heuristics**: Fine-tune domain classification rules with an optional `.domains.json` in your workspace root.
- **Real-Time Live Synchronization**: Built-in file system watchers detect file additions, moves, renames, and deletions with debounced re-indexing.
- **Quick-Pick Navigation (`Ctrl+Alt+D` / `Cmd+Alt+D`)**: Search across all domain files with tags like `[Frontend]`, `[Backend]`, and `[Auth]`.
- **Context Actions**: Right-click any file or subfolder to immediately **Reveal in Explorer**.

---

## Keyboard Shortcuts & Commands

| Command | Shortcut | Description |
| :--- | :--- | :--- |
| `Domain Manager: Jump to Domain File` | `Ctrl+Alt+D` *(Mac: `Cmd+Alt+D`)* | Open interactive quick search across all categorized domain files |
| `Domain File Manager: Refresh Domains` | Top-right panel icon | Re-scans workspace and reloads `.domains.json` rules |
| `Domain File Manager: Reveal in Explorer` | Right-click context menu | Reveals the selected file or folder in the native Explorer |

---

## Configuration (`.domains.json`)

To customize domain mappings or define new domains, add a `.domains.json` file in your workspace root:

```json
{
  "domains": {
    "Auth": {
      "patterns": ["auth", "login", "signup", "session", "jwt", "oauth", "token", "permission"],
      "folders": ["src/auth", "lib/auth", "src/presentation/providers/auth"],
      "extensions": []
    },
    "Frontend": {
      "patterns": ["components?", "pages?", "screens?", "widgets?", "ui", "presentation"],
      "folders": ["src/components", "src/views", "lib/presentation/screens"],
      "extensions": [".jsx", ".tsx", ".vue", ".svelte", ".html", ".css", ".scss"]
    },
    "Backend": {
      "patterns": ["api", "controllers?", "services?", "models?", "routes?", "database", "supabase"],
      "folders": ["src/api", "src/server", "lib/core/network"],
      "extensions": []
    }
  }
}
```

### Rule Types:
- **`patterns`**: Regex patterns or keyword substrings tested against normalized file paths.
- **`folders`**: Specific directory path prefixes.
- **`extensions`**: File extensions to automatically route into the domain (e.g. `[".tsx", ".css"]`).

*If `.domains.json` is omitted, the extension gracefully falls back to built-in heuristic path matching.*

---

## Installation Guide

### Option 1: Install Local Package (.VSIX)

1. Download or locate `domain-file-manager-0.1.1.vsix`.
2. Open **VS Code**.
3. Go to the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).
4. Click the `...` menu (top right of Extensions view) → **Install from VSIX...**
5. Select the `.vsix` file.

Or via terminal:
```bash
code --install-extension domain-file-manager-0.1.1.vsix
```

### Option 2: Install on Other Devices

- **Via GitHub Releases**: Download the `.vsix` file from the [Releases page](https://github.com/reddyharsha759-ship-it/-Domain-Manager-files-manager/releases) and use **Install from VSIX...**
- **From Source**:
  ```bash
  git clone https://github.com/reddyharsha759-ship-it/-Domain-Manager-files-manager.git
  cd -Domain-Manager-files-manager
  npm install
  npm run package
  code --install-extension domain-file-manager-0.1.1.vsix
  ```

---

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run file watcher
npm run watch

# Package .VSIX production bundle
npm run package
```

Press `F5` inside the project in VS Code to launch the extension in an **Extension Development Host** debugging window.

---

## License

This project is licensed under the [MIT License](LICENSE).
