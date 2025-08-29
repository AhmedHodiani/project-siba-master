# Copilot Instructions for electron-react-boilerplate

## Project Architecture
- **Electron Main Process**: Entry at `src/main/main.ts`. Handles window creation, IPC, auto-updates, and menu setup. Communicates with renderer via IPC.
- **Renderer Process**: React app entry at `src/renderer/App.tsx`. Uses React Router for navigation. UI assets in `assets/`.
- **Preload Scripts**: Defined in `src/main/preload.ts` and referenced in main process for secure context bridging.
- **Menu Customization**: `src/main/menu.ts` builds platform-specific menus and dev tools access.
- **Utilities**: Shared helpers in `src/main/util.ts`.

## Developer Workflows
- **Start (Development)**: `npm run start` (runs main and renderer with hot reload)
- **Build (Production)**: `npm run build` (builds main and renderer)
- **Package App**: `npm run package` (builds and packages for distribution)
- **Lint**: `npm run lint` / `npm run lint:fix`
- **Test**: `npm test` (Jest, tests in `src/__tests__/`)
- **Rebuild Native Modules**: `npm run rebuild` (for Electron native deps)

## Conventions & Patterns
- **TypeScript**: Strict mode, `es2022` target, React JSX.
- **IPC**: Use `ipcMain`/`ipcRenderer` for main-renderer communication. Example: `ipc-example` channel in `main.ts`.
- **Assets**: All icons and images in `assets/`.
- **Environment**: `NODE_ENV` controls dev/prod logic (dev tools, source maps, menu options).
- **Webpack**: Configs in `.erb/configs/`, DLL build for preload and renderer.
- **Testing**: Jest with custom mocks for assets/styles. See `package.json` for setup.

## Integration Points
- **Electron Updater**: Auto-update via `electron-updater` in main process.
- **DevTools Extensions**: Installs React DevTools in dev mode.
- **External Links**: Opened in browser via `shell.openExternal`.

## Examples
- **IPC Example**: See `ipcMain.on('ipc-example', ...)` in `main.ts`.
- **Menu Customization**: See `MenuBuilder` in `menu.ts` for platform/dev-specific menus.
- **Renderer Routing**: See `App.tsx` for React Router usage.

## Key Files & Directories
- `src/main/` — Electron main process code
- `src/renderer/` — React renderer code
- `assets/` — App icons and images
- `.erb/configs/` — Webpack configs
- `release/` — Build/package output

---
For more details, see [electron-react-boilerplate docs](https://electron-react-boilerplate.js.org/).
