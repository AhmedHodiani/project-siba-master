# Copilot Instructions for Video Player Electron App

## Project Architecture (Video Player)
- **Electron Main Process**: Entry at `src/main/main.ts`. Handles window creation, IPC for file dialogs, auto-updates, and menu setup. Key IPC: `open-video-file` for native file selection.
- **Renderer Process**: React video player UI at `src/renderer/App.tsx`. Custom HTML5 video controls with fullscreen, progress, volume controls. No routing—single page app.
- **Preload Scripts**: `src/main/preload.ts` exposes `openVideoFile()` method to renderer via contextBridge for secure file access.
- **File System Integration**: Handles local video files via `dialog.showOpenDialog()` with video format filters (mp4, avi, mov, etc).

## Core Video Player Features
- **Video Sources**: Supports both URL input and local file loading via native dialog
- **Custom Controls**: Built-in HTML5 video element with custom overlay controls (not using external video libraries)
- **File Formats**: Configured for mp4, avi, mov, mkv, wmv, flv, webm, m4v via main process dialog filters
- **Local File Protocol**: Converts file paths to `file://` URLs for video element compatibility
- **Fullscreen API**: Uses native browser fullscreen API with custom CSS states

## Developer Workflows
- **Start (Development)**: `npm run start` (hot reload for both main and renderer)
- **Build (Production)**: `npm run build` (webpack builds main + renderer)
- **Package App**: `npm run package` (electron-builder packages for distribution)
- **DLL Build**: `npm run build:dll` (pre-builds vendor dependencies)
- **Test**: `npm test` (Jest with jsdom for renderer components)
- **Lint**: `npm run lint` / `npm run lint:fix` (ESLint with TypeScript)

## IPC Communication Patterns
- **File Dialog**: `ipcMain.handle('open-video-file')` returns file path or null
- **Renderer Usage**: `window.electron.openVideoFile()` (exposed via preload script)
- **Type Safety**: `ElectronHandler` type exported from preload for renderer TypeScript support
- **Security**: contextBridge used instead of nodeIntegration for secure API exposure

## Styling & UI Conventions
- **Dark Theme**: Professional dark gradient background with transparency effects
- **CSS Custom Properties**: Consistent spacing and color scheme throughout
- **Responsive Design**: Aspect ratio maintained (16:9) with max-width container
- **Control Overlays**: Positioned absolutely over video with hover/focus states
- **No External UI Libraries**: Pure CSS styling without component libraries

## File Structure Specifics
- `src/main/main.ts` — Window creation, IPC handlers, file dialogs
- `src/main/preload.ts` — Secure API bridge (openVideoFile method)
- `src/renderer/App.tsx` — Main video player component with controls
- `src/renderer/App.css` — Complete video player styling (440+ lines)
- `src/renderer/preload.d.ts` — TypeScript definitions for electron APIs
- `assets/` — App icons for packaging (multiple sizes/formats)

## Build System Notes
- **Webpack Config**: Separate configs for main, renderer, and preload in `.erb/configs/`
- **TypeScript**: Strict mode, es2022 target, node16 module resolution
- **Hot Reload**: electronmon watches main process, webpack-dev-server for renderer
- **Asset Handling**: File loader for videos, url loader for images, css-loader for styles
- **DLL Optimization**: Pre-built vendor bundles for faster development builds
