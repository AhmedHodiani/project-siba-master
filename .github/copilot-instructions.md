# Copilot Instructions for Movie Library Electron App

## Project Architecture (Movie Management + Video Player)
- **Electron Main Process**: Entry at `src/main/main.ts`. Handles window creation, IPC for file dialogs, ffmpeg video frame extraction, and menu setup. Key IPC: `open-video-file`, `open-subtitle-file`, `extract-video-frames`, `file-exists`.
- **Renderer Process**: React app at `src/renderer/App.tsx`. Simple state-driven navigation between HomeScreen (library) and MovieDetails (player). Navigation controlled by `currentScreen` state (`'home'|'video'`).
- **PocketBase Backend**: Self-hosted database at `pocketbase/pocketbase` (binary). Stores movie metadata, thumbnails, watch progress. Collections: `movies` with file paths, subtitles, positions.
- **Component Architecture**: Modular UI with `src/renderer/pages/home/HomeScreen`, `src/components/movie/MovieCard`, `src/components/movie/AddMovieDialog`, and `src/components/ui/` index exports.

## Database Integration (PocketBase)
- **Service Layer**: `src/lib/services/pocketbase.ts` handles all database operations with typed methods
- **Type Safety**: `src/lib/types/database.ts` defines `MovieRecord`, `CreateMovieData`, `UpdateMovieData`, `COLLECTIONS` constants
- **Movie Schema**: `{ title, mp4_path, srt_path?, srt_delay, last_position, duration?, thumbnail?, date_added, last_accessed }`
- **File Validation**: Real-time checks via `window.electron.fileExists()` for broken file paths in HomeScreen
- **Auto-Updates**: Last accessed time automatically tracked on play, position saved during playback

## Core Movie Features
- **Library Management**: Add movies by selecting video files, auto-extract thumbnails using ffmpeg spawn processes
- **Subtitle Support**: SRT parsing with custom delay adjustment, position controls (on-screen/below), keyboard navigation (1/2 keys)
- **Watch Progress**: Resume functionality with automatic position saving, debounced database updates
- **Search & Filter**: Real-time search with 300ms debounce, PocketBase filtering, recently accessed sorting
- **Thumbnail Generation**: FFmpeg frame extraction during movie addition, base64 storage in PocketBase file system

## Developer Workflows
- **Start Backend**: `./pocketbase/pocketbase serve` (starts database on :8090, must run first)
- **Start Frontend**: `npm run start` (webpack dev server with hot reload for renderer + electronmon for main)
- **Full Development**: Run PocketBase then npm start concurrently (backend dependency critical)
- **Build**: `npm run build` (builds main + renderer via webpack config in `.erb/configs/`)
- **Package**: `npm run package` (electron-builder with asset bundling)

## IPC Communication Patterns
- **File System**: `openVideoFile()`, `openSubtitleFile()`, `readSubtitleFile()`, `fileExists()` - all async/await
- **Video Processing**: `extractVideoFrames(videoPath, count)` spawns ffmpeg, returns `{ frames: string[], duration: number }`
- **Type Safety**: All IPC methods typed in `src/main/preload.ts` as `ElectronHandler`, exposed via contextBridge
- **Security**: contextBridge with no nodeIntegration, webSecurity disabled only in dev for local file access

## UI State Management Patterns  
- **Screen Navigation**: Simple state switch between `'home'` and `'video'` screens in App.tsx
- **Component Communication**: Parent-child props for movie selection (`onPlayMovie`), no global state management
- **Persistent State**: Video progress auto-saved to PocketBase with debounced updates, subtitle settings in component state
- **Loading States**: Consistent loading/error/empty states with spinner, retry buttons, file validation indicators

## Export/Import Module Patterns
- **Default vs Named**: VideoPlayer uses default export but re-exported as named in `src/components/ui/index.ts` - pattern: `export { default as VideoPlayer }`
- **Service Singletons**: PocketBase service exported as both named export and default: `export const pocketBaseService = new PocketBaseService(); export default pocketBaseService;`
- **Path Aliases**: Use `@/` for absolute imports mapped via webpack config, e.g., `@/components/ui`, `@/lib/services/pocketbase`

## Key Integration Points
- **PocketBase Service**: Singleton instance with dynamic import pattern `await import('pocketbase')` for code splitting
- **Movie Lifecycle**: Add → Validate → Extract Thumbnails → Store → Play → Track Progress
- **File System Bridge**: Electron IPC validates file existence, reads subtitles, extracts frames via ffmpeg spawning
- **Video Player State**: Custom HTML5 video controls with keyboard shortcuts (space=play, 1/2=subtitle nav, arrows=seek)

## File Structure Specifics
- `src/lib/services/pocketbase.ts` — Database service layer with CRUD operations and file validation utilities
- `src/lib/types/database.ts` — TypeScript definitions with BaseRecord interface and COLLECTIONS constants
- `src/renderer/pages/home/HomeScreen.tsx` — Movie library grid with search, add functionality, file validation
- `src/components/movie/AddMovieDialog.tsx` — Multi-step movie addition with thumbnail selection
- `src/renderer/pages/movie-details/MovieDetails.tsx` — Simple wrapper that renders VideoPlayer
- `pocketbase/` — Self-contained database with pb_data/, pb_migrations/, binary

## Critical Dependencies & Constraints
- **PocketBase**: Must be running on :8090 before starting frontend, handles all data persistence
- **FFmpeg**: System dependency required for thumbnail extraction via spawn processes in main.ts
- **File System Access**: Relies on Electron's native file dialogs and fs module for video/subtitle loading
- **React 19**: Uses new createRoot API, no router (just conditional rendering), minimal state management
