# Copilot Instructions for Movie Library Electron App

## Project Architecture (Movie Management + Video Player)
- **Electron Main Process**: Entry at `src/main/main.ts`. Handles window creation, IPC for file dialogs, ffmpeg video frame extraction, and menu setup. Key IPC: `open-video-file`, `open-subtitle-file`, `extract-video-frames`, `file-exists`.
- **Renderer Process**: React app at `src/renderer/App.tsx`. Multi-screen UI with HomeScreen for movie library management and VideoPlayerUI for playback. State-driven navigation between library and player.
- **PocketBase Backend**: Self-hosted database at `pocketbase/pocketbase` (binary). Stores movie metadata, thumbnails, watch progress. Collections: `movies` with file paths, subtitles, positions.
- **Component Architecture**: Modular UI with `components/home/HomeScreen`, `components/movie/MovieCard`, `components/movie/AddMovieDialog`, and custom `components/ui/Button`.

## Database Integration (PocketBase)
- **Service Layer**: `src/services/pocketbase.ts` handles all database operations with typed methods
- **Type Safety**: `src/types/database.ts` defines `MovieRecord`, `CreateMovieData`, `UpdateMovieData` 
- **Movie Schema**: `{ title, mp4_path, srt_path?, srt_delay, last_position, duration?, thumbnail? }`
- **File Validation**: Real-time checks via `window.electron.fileExists()` for broken file paths
- **Auto-Updates**: Last accessed time and playback position automatically tracked

## Core Movie Features
- **Library Management**: Add movies by selecting video files, auto-extract thumbnails using ffmpeg
- **Subtitle Support**: SRT parsing with custom delay adjustment, position controls (on-screen/below)
- **Watch Progress**: Resume functionality with automatic position saving on navigation
- **Search & Filter**: Real-time search with PocketBase filtering, recently accessed sorting
- **Thumbnail Generation**: FFmpeg frame extraction during movie addition, base64 storage

## Developer Workflows
- **Start Backend**: `./pocketbase/pocketbase serve` (starts database on :8090)
- **Start Frontend**: `npm run start` (hot reload for both main and renderer)
- **Full Development**: Run both PocketBase and npm start concurrently
- **Build**: `npm run build` (webpack builds main + renderer)
- **Package**: `npm run package` (electron-builder with PocketBase binary bundling)

## IPC Communication Patterns
- **File System**: `openVideoFile()`, `openSubtitleFile()`, `readSubtitleFile()`, `fileExists()`
- **Video Processing**: `extractVideoFrames(videoPath, count)` for thumbnail generation using ffmpeg
- **Type Safety**: All IPC methods typed in `src/main/preload.ts` and exposed via `ElectronHandler`
- **Security**: contextBridge isolates main process, no nodeIntegration

## UI State Management Patterns
- **Modal Overlays**: `HomeScreen` overlays video player, controlled by `showHomeScreen` state
- **Component Communication**: Parent-child props for movie selection, playback control
- **Persistent State**: Video progress auto-saved to PocketBase, subtitle settings in local state
- **Loading States**: Consistent loading/error/empty states across movie management flows

## Key Integration Points
- **PocketBase Service**: Singleton instance handles all database operations with async/await
- **Movie Lifecycle**: Add → Validate → Extract Thumbnails → Store → Play → Track Progress
- **File System Bridge**: Electron IPC validates file existence, reads subtitles, extracts frames
- **Video Player State**: Custom controls with keyboard shortcuts (space=play, 1/2=subtitle nav, arrows=seek)

## File Structure Specifics
- `src/services/pocketbase.ts` — Database service layer with CRUD operations
- `src/types/database.ts` — TypeScript definitions for all database records
- `src/components/home/HomeScreen.tsx` — Movie library grid with search/add functionality
- `src/components/movie/AddMovieDialog.tsx` — Multi-step movie addition with thumbnail selection
- `pocketbase/` — Self-contained database with migrations, storage, binary
- `src/renderer/utils/subtitleParser.ts` — SRT parsing with time synchronization

## Critical Dependencies
- **PocketBase**: Database backend, must be running for movie operations
- **FFmpeg**: Required for thumbnail extraction (system dependency)
- **File System Access**: Relies on Electron's native file dialogs and fs access
- **React State**: Complex state management for multi-screen navigation and video controls
