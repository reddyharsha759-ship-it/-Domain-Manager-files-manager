# Domain File Manager

A VS Code / Antigravity editor extension that organizes workspace files into functional domains (**Frontend**, **Backend**, and **Auth**) rather than raw folder paths.

## Features

- **Functional Grouping**: Automatically categorizes files into Frontend, Backend, Auth, and Other.
- **Configurable Rules**: Create a `.domains.json` file in your workspace root to define custom regex patterns, folder mappings, or file extensions.
- **Real-Time Synchronization**: Watches for file creations, deletions, and renames with debounced auto-refresh.
- **Quick-Pick Navigation**: Press `Ctrl+Alt+D` (`Cmd+Alt+D`) or run `Domain Manager: Jump to Domain File` to quickly filter and open files across domains.
- **Context Actions**: Right-click any categorized file to reveal it in the explorer.

## Configuration

Add a `.domains.json` in your workspace root:

```json
{
  "domains": {
    "Auth": {
      "patterns": ["auth", "login", "jwt", "session"],
      "folders": ["src/auth", "lib/auth"]
    },
    "Frontend": {
      "patterns": ["components?", "views?", "screens?"],
      "extensions": [".tsx", ".vue", ".css"]
    },
    "Backend": {
      "patterns": ["api", "controllers?", "services?"],
      "folders": ["src/api", "src/server"]
    }
  }
}
```
