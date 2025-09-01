z# Copilot Instructions for Movie Library Electron App

## Project Architecture (Language Learning + Spaced Repetition + AI Integration)
- **Electron Main Process**: Entry at `src/main/main.ts`. Handles window creation, IPC for file dialogs, ffmpeg video frame extraction, menu setup, and Ollama AI service bridging. Key IPC: `open-video-file`, `open-subtitle-file`, `extract-video-frames`, `file-exists`, `ollama-*` methods.
- **Renderer Process**: React 19 app with React Router (`MemoryRouter`) at `src/renderer/App.tsx`. Routes: `/` (HomeScreen), `/movie/:id` (MovieDetails). Uses `useParams` and `useNavigate` for navigation.
- **PocketBase Backend**: Self-hosted database at `pocketbase/pocketbase` (binary). Stores movie metadata, thumbnails, watch progress, flashcards with FSRS scheduling. Collections: `movies`, `flashcards`, `review_logs`.
- **Ollama AI Integration**: Local AI service at `localhost:11434` for German-English translation and language learning assistance. Service layer bridges main/renderer processes via IPC.
- **Component Architecture**: Modular UI with `src/renderer/pages/`, `src/components/movie/`, `src/components/ui/` index exports, `src/components/flashcard/`, and `src/components/ai/` for AI chat features.

## Database Integration (PocketBase + FSRS)
- **Service Layer**: `src/lib/services/pocketbase.ts` handles all database operations with typed methods including FSRS flashcard scheduling
- **Type Safety**: `src/lib/types/database.ts` defines `MovieRecord`, `FlashcardRecord`, `CreateFlashcardData`, `FSRSState`, `FSRSRating` types
- **Movie Schema**: `{ title, mp4_path, srt_path?, srt_delay, last_position, duration?, thumbnail?, date_added, last_accessed }`
- **Flashcard Schema**: `{ movie_id, subtitle_text, free_space (markdown), start_time, end_time, FSRS fields (due, stability, difficulty, etc.) }`
- **FSRS Integration**: Uses `ts-fsrs` library for spaced repetition scheduling with dynamic imports to avoid CommonJS/ESM conflicts

## Core Movie + Learning + AI Features
- **Library Management**: Add movies by selecting video files, auto-extract thumbnails using ffmpeg spawn processes
- **Subtitle Support**: SRT parsing with custom delay adjustment, position controls (on-screen/below), keyboard navigation (1/2 keys), repeat functionality for language learning
- **Watch Progress**: Resume functionality with automatic position saving, debounced database updates
- **Flashcard Creation**: Extract subtitle segments into flashcards with video preview, timing adjustment, and markdown notes
- **Spaced Repetition**: Review flashcards using FSRS algorithm with 4-button rating system (Again/Hard/Good/Easy)
- **Translation Integration**: Bing Translator iframe widgets, text selection for translation, fullscreen translation modal
- **AI Language Assistant**: Ollama-powered chat panel for German-English translation, grammar explanations, and contextual language learning support

## Advanced UI Patterns
- **Golden Layout**: Multi-pane interface in MovieDetails using `golden-layout` library with video player, AI chat, subtitles/translations, and flashcards panels
- **Two-Column Dialogs**: AddFlashcardDialog uses CSS Grid layout - left column (video preview, timing controls, subtitle), right column (markdown editor for notes)
- **Reusable Components**: VideoPreview component with dynamic aspect ratio detection, repeat functionality, and time-bound playback
- **Translation Flow**: Text selection → TranslateButton → TranslationModal with language swapping and Bing iframe integration
- **AI Chat Integration**: Real-time Ollama chat panel with context awareness, model selection, and specialized German translation prompts
- **Glassmorphism Theme**: Consistent backdrop-blur, gradients, and sharp edges (no border-radius) throughout UI

## Developer Workflows
- **Start Backend**: `./pocketbase/pocketbase serve` (starts database on :8090, must run first)
- **Start Frontend**: `npm run start` (webpack dev server with hot reload for renderer + electronmon for main)
- **Full Development**: Run PocketBase then npm start concurrently (backend dependency critical)
- **Build**: `npm run build` (builds main + renderer via webpack config in `.erb/configs/`)
- **Package**: `npm run package` (electron-builder with asset bundling)

## IPC Communication Patterns
- **File System**: `openVideoFile()`, `openSubtitleFile()`, `readSubtitleFile()`, `fileExists()` - all async/await
- **Video Processing**: `extractVideoFrames(videoPath, count)` spawns ffmpeg, returns `{ frames: string[], duration: number }`
- **Ollama AI Bridge**: `ollama-is-available`, `ollama-list-models`, `ollama-chat`, `ollama-chat-with-context`, `ollama-translate` for AI integration
- **Type Safety**: All IPC methods typed in `src/main/preload.ts` as `ElectronHandler`, exposed via contextBridge
- **Security**: contextBridge with no nodeIntegration, webSecurity disabled only in dev for local file access

## UI State Management Patterns  
- **React Router Navigation**: `MemoryRouter` with routes `/` (HomeScreen) and `/movie/:id` (MovieDetails). Uses `useParams` and `useNavigate` hooks.
- **Component Communication**: Parent-child props for movie selection (`onPlayMovie`), dialog state management with loading/error patterns
- **Persistent State**: Video progress auto-saved to PocketBase, flashcard review history tracked with FSRS scheduling
- **Dialog Management**: Multiple dialogs (translation, flashcard creation/viewing) with auto-pause video when opened
- **AI Chat State**: Focus tracking to disable keyboard shortcuts when AI input is active, conversation history persistence

## Export/Import Module Patterns
- **UI Components**: Centralized exports in `src/components/ui/index.ts` with mixed default/named patterns
- **Service Singletons**: PocketBase service exported as both named export and default with dynamic FSRS imports
- **Path Aliases**: Use `@/` for absolute imports mapped via webpack config
- **Dynamic Imports**: FSRS library imported dynamically to avoid CommonJS/ESM conflicts: `await import('ts-fsrs')`

## Key Integration Points
- **FSRS Scheduling**: Flashcards use spaced repetition algorithm with review ratings mapped to scheduling parameters
- **Golden Layout**: React components rendered in layout panels via `componentId` registration and DOM manipulation
- **Video Synchronization**: VideoPreview component maintains time state, supports aspect ratio detection and repeat functionality
- **Translation Workflow**: Text selection → floating button → modal with Bing iframe, language detection and swapping
- **Markdown Editing**: Custom MarkdownEditor with edit/preview tabs for flashcard notes, integrated in two-column layouts
- **Ollama AI Service**: Main process hosts Ollama client, renderer communicates via IPC with conversation context and model selection

## File Structure Specifics
- `src/lib/services/pocketbase.ts` — Database service with FSRS integration and typed CRUD operations
- `src/lib/types/database.ts` — TypeScript definitions including FSRS types and collection constants
- `src/components/flashcard/` — AddFlashcardDialog (two-column layout), ViewFlashcardsDialog (table with review buttons)
- `src/components/ui/VideoPreview.tsx` — Reusable video component with dynamic aspect ratio and repeat functionality
- `src/components/ui/MarkdownEditor.tsx` — Fallback markdown editor with edit/preview tabs
- `src/components/layout/GoldenLayoutWrapper.tsx` — React integration for golden-layout with component registration
- `src/components/ai/AiChatPanel.tsx` — Real-time AI chat with Ollama integration, model selection, and focus management
- `src/main/ollama-service.ts` — Main process Ollama client with specialized German translation prompts
- `src/lib/services/ollama.ts` — Renderer service for Ollama IPC communication with context-aware chat
- `pocketbase/pb_migrations/` — Database schema migrations including FSRS field additions

## Critical Dependencies & Constraints
- **PocketBase**: Must be running on :8090 before starting frontend, handles all data persistence including flashcard scheduling
- **FFmpeg**: System dependency required for thumbnail extraction via spawn processes in main.ts
- **FSRS Library**: `ts-fsrs` for spaced repetition scheduling, imported dynamically to avoid module conflicts
- **Golden Layout**: Multi-pane interface library requiring careful React component integration and lifecycle management
- **Translation APIs**: Relies on Bing Translator iframe integration with language detection and URL encoding
- **Ollama AI**: Local AI service dependency at `localhost:11434` for translation and language learning features
- **React 19**: Uses new createRoot API, React Router (`MemoryRouter`) for navigation, minimal global state management
