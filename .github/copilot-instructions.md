# Copilot Instructions for Movie Library Electron App

## Project Architecture (Language Learning + Advanced FSRS + AI Integration + Drawing System)

### Big Picture Architecture
- **Electron Main Process** (`src/main/main.ts`): Handles window creation, IPC (file dialogs, ffmpeg, Ollama AI), menu, and service bridging. IPC methods are typed in `preload.ts`.
- **Renderer Process**: React 19 app (`src/renderer/App.tsx`) with modular UI, React Router (`MemoryRouter`), and Golden Layout for multi-pane movie details. Navigation via `useParams`/`useNavigate`.
- **PocketBase Backend**: Self-hosted DB (`pocketbase/pocketbase`), stores movies, flashcards, review logs. All DB ops via `src/lib/services/pocketbase.ts` (typed, advanced FSRS scheduling with mastery sessions).
- **Ollama AI Integration**: Local service (`localhost:11434`), IPC bridge for translation/AI chat. Main/renderer communicate via service layer.

### Developer Workflows
- **Start Backend**: `./pocketbase/pocketbase serve` (must run before frontend)
- **Start Frontend**: `npm run start` (hot reload, electronmon)
- **Build**: `npm run build` (webpack config in `.erb/configs/`)
- **Package**: `npm run package` (electron-builder)

### Key Patterns & Conventions
- **Type Safety**: All DB/service methods typed in `src/lib/types/database.ts` + `src/lib/types/drawing.ts`
- **Service Layer**: All DB/AI/IPC logic in `src/lib/services/` and `src/main/ollama-service.ts`
- **Advanced FSRS**: Comprehensive spaced repetition with mastery sessions, skip functionality, and intelligent card grouping via `ts-fsrs` (dynamic import)
- **Golden Layout**: Multi-pane UI in `MovieDetails` (`src/components/layout/GoldenLayoutWrapper.tsx`)
- **Drawing System**: Complex SVG-based canvas with HTML widgets via foreignObject pattern (`src/components/drawing/`)
- **Widget Pattern**: HTML-in-SVG via foreignObject for interactive objects (sticky notes, images, translations, flashcards)
- **Resize Pattern**: All widgets follow StickyNoteWidget resize handler pattern EXACTLY - copy existing patterns, never create new ones
- **Modern Dialog Design**: Two-column CSS Grid layouts, glassmorphism styling, responsive animations
- **Video/Subtitle**: `VideoPreview` and `VideoPlayer` handle aspect ratio, repeat, subtitle delay, keyboard nav
- **Translation**: Text selection → `TranslateButton` → `TranslationModal` (Bing iframe)
- **AI Chat**: `AiChatPanel` for Ollama-powered chat, context-aware, model selection
- **Glassmorphism Theme**: Backdrop-blur, gradients, sharp edges (no border-radius), CSS custom properties for dynamic styling

### Integration Points
- **IPC**: All file/AI ops via typed IPC in `preload.ts`, exposed via contextBridge
- **PocketBase**: Must be running for all persistence; flashcard scheduling, mastery tracking, progress analytics, drawing canvas objects
- **Drawing Integration**: Accessed via MovieDetails study mode toggle → `<DrawingMode movieId={movieId} />` (NOT part of Golden Layout)
- **Canvas Database**: Two collections - `pbc_canvases` (metadata) + `pbc_canvas_objects` (drawing objects with coordinates/properties)
- **Coordinate System**: Screen→World conversion with viewport zoom compensation (always divide by zoom for accuracy)
- **FFmpeg**: Required for thumbnail extraction (main process)
- **Ollama**: Local AI service for translation/learning
- **Path Aliases**: Use `@/` for absolute imports (webpack config)

### Study Session Features (Advanced FSRS Implementation)
- **Mastery Sessions**: Continue until all cards reach configurable stability thresholds (7-91 days)
- **Smart Card Grouping**: Due status (overdue/today/soon), FSRS state (new/learning/review/relearning), difficulty-based groups
- **Session Types**: Standard (fixed count) vs Mastery (until threshold met)
- **Skip Functionality**: Shared navigation logic between review and skip actions
- **Progress Tracking**: Real-time mastery progress, session analytics, rating distribution
- **Intelligent Progression**: Non-random card ordering for mastery sessions, proper state synchronization

### Examples
- **Add Movie**: Select video, auto-extract thumbnail, store in DB
- **Create Flashcard**: Extract subtitle segment, preview video, edit markdown notes, schedule with FSRS
- **Study Sessions**: Choose group (due cards, difficulty-based), configure mastery thresholds, review with 4-button FSRS rating
- **Mastery Mode**: Continue reviewing until cards reach stability threshold, track progress in real-time
- **Translate Text**: Select subtitle, open translation modal, swap languages
- **AI Chat**: Ask grammar/translation questions, context-aware, model selection

### Key Files/Directories
- `src/lib/services/pocketbase.ts` — DB service with advanced FSRS integration and mastery tracking
- `src/lib/types/database.ts` — TypeScript types for DB/FSRS including mastery session types
- `src/lib/types/drawing.ts` — Complete drawing system type definitions and conversion functions
- `src/components/drawing/` — Drawing system components (see drawing-section.md for complete guide)
- `src/components/drawing/DrawingMode.tsx` — Main drawing container with canvas management and database operations
- `src/components/drawing/DrawingCanvas.tsx` — Core drawing engine with SVG rendering, tools, viewport
- `src/components/drawing/StickyNoteWidget.tsx` — Template for all resizable widgets (copy this pattern EXACTLY)
- `src/components/flashcard/StudySessionDialog.tsx` — Modern study session configuration with mastery mode
- `src/components/flashcard/StudySessionDialog.css` — Glassmorphism styling with responsive design and animations
- `src/renderer/pages/movie-details/MovieDetails.tsx` — Main study logic with mastery session handling + drawing integration
- `src/components/ui/VideoPreview.tsx` — Video preview/repeat functionality
- `src/components/ui/MarkdownEditor.tsx` — Markdown editor for flashcard notes
- `src/components/layout/GoldenLayoutWrapper.tsx` — Golden Layout integration
- `src/components/ai/AiChatPanel.tsx` — AI chat panel with Ollama integration
- `src/main/ollama-service.ts` — Main process Ollama client
- `src/lib/services/ollama.ts` — Renderer Ollama service
- `pocketbase/pb_migrations/` — DB schema migrations including FSRS fields

## Drawing System Critical Patterns (🚨 MANDATORY COMPLIANCE 🚨)

### Core Architecture
- **DrawingMode.tsx**: Main container managing canvas state, database operations, UI
- **DrawingCanvas.tsx**: SVG-based rendering engine, viewport/zoom, tool handlers, object interactions  
- **DrawingObjectRenderer.tsx**: Renders objects by type using foreignObject pattern
- **5 Object Types**: sticky-note, image, flashcard, translation, freehand (all HTML widgets except freehand)
- **Database**: `pbc_canvases` (metadata) + `pbc_canvas_objects` (object data with world coordinates)

### Widget Development Rules (NON-NEGOTIABLE)
```tsx
// ALWAYS copy StickyNoteWidget.tsx structure EXACTLY for new widgets
interface WidgetProps {
  object: ObjectType;         // Main data
  isSelected: boolean;        // Selection state
  zoom: number;              // Canvas zoom (for coordinate conversion)
  onUpdate: (id: string, updates: Partial<ObjectType>) => void; // Real-time updates
  onSelect: (id: string) => void;                               // Selection
  onContextMenu: (event: React.MouseEvent, id: string) => void; // Right-click
  onStartDrag?: (e: React.MouseEvent, id: string) => void;      // Drag start
}
```

### Resize Pattern (NEVER DEVIATE)
- **Copy from StickyNoteWidget.tsx EXACTLY**: 3 handles (SE, S, E), same positioning, same event handlers
- **Zoom Compensation**: `deltaX / zoom, deltaY / zoom` for accurate coordinate conversion
- **Real-time Updates**: Call `onUpdate(id, {width, height})` on every mousemove, NOT just mouseup
- **CSS Structure**: `.resize-handle` with absolute positioning, same dimensions/styling as StickyNoteWidget.css

### Coordinate System (CRITICAL)
```tsx
// Always use world coordinates in database, convert for screen display
const worldPoint = {
  x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
  y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
};
```

### Database Integration Pattern
- **UI→DB**: `drawingObjectToRecord(object, canvasId)` converts UI objects to database format
- **DB→UI**: `recordToDrawingObject(record)` converts database records to UI objects  
- **object_data Field**: JSON containing type-specific properties (text, colors, dimensions, etc.)
- **Files Field**: Array for image attachments (PocketBase file uploads)

### Anti-Spaghetti Code Enforcement
- **Widget Creation**: Copy StickyNoteWidget.tsx file completely, modify content only
- **Resize Logic**: Never write new resize handlers, copy existing handleResizeStart pattern EXACTLY
- **Event Handling**: Copy existing event propagation patterns (preventDefault, stopPropagation)  
- **CSS Classes**: Use existing patterns (.widget-container, .resize-handle, etc.)
- **Database Operations**: Use existing conversion functions, don't write custom logic
- **Tool Integration**: Copy existing tool patterns in DrawingCanvas.tsx switch statements

### Golden Rule
**If existing code does what you need, COPY IT. Don't write new code.**

---
**Feedback:** If any section is unclear or missing, please specify which workflows, patterns, or integration points need more detail.

## Database Integration (PocketBase + Advanced FSRS)
- **Service Layer**: `src/lib/services/pocketbase.ts` handles all database operations with typed methods including comprehensive FSRS flashcard scheduling and mastery tracking
- **Type Safety**: `src/lib/types/database.ts` defines `MovieRecord`, `FlashcardRecord`, `CreateFlashcardData`, `FSRSState`, `FSRSRating`, `SessionConfig` types
- **Movie Schema**: `{ title, mp4_path, srt_path?, srt_delay, last_position, duration?, thumbnail?, date_added, last_accessed }`
- **Flashcard Schema**: `{ movie_id, subtitle_text, free_space (markdown), start_time, end_time, FSRS fields (due, stability, difficulty, reps, lapses, learning_steps, state, last_review) }`
- **FSRS Integration**: Uses `ts-fsrs` library for spaced repetition scheduling with dynamic imports to avoid CommonJS/ESM conflicts
- **Mastery Tracking**: Configurable stability thresholds (7-91 days), state requirements (Review/any), difficulty limits for mastery determination

## Core Movie + Learning + AI Features
- **Library Management**: Add movies by selecting video files, auto-extract thumbnails using ffmpeg spawn processes
- **Subtitle Support**: SRT parsing with custom delay adjustment, position controls (on-screen/below), keyboard navigation (1/2 keys), repeat functionality for language learning
- **Watch Progress**: Resume functionality with automatic position saving, debounced database updates
- **Flashcard Creation**: Extract subtitle segments into flashcards with video preview, timing adjustment, and markdown notes
- **Advanced Study Sessions**: Two session types - Standard (fixed count) and Mastery (continue until threshold)
- **Smart Card Grouping**: Due status (overdue/today/soon), FSRS state-based, difficulty-based groups with color coding and priority sorting
- **Mastery Mode**: Configurable stability thresholds (7-91 days), real-time progress tracking, intelligent card progression
- **Skip Functionality**: Shared navigation logic allows skipping cards in study sessions
- **Spaced Repetition**: Review flashcards using FSRS algorithm with 4-button rating system (Again/Hard/Good/Easy)
- **Translation Integration**: Bing Translator iframe widgets, text selection for translation, fullscreen translation modal
- **AI Language Assistant**: Ollama-powered chat panel for German-English translation, grammar explanations, and contextual language learning support

## Advanced UI Patterns & Modern Design
- **Golden Layout**: Multi-pane interface in MovieDetails using `golden-layout` library with video player, AI chat, subtitles/translations, and flashcards panels
- **Modern Dialog Design**: StudySessionDialog features glassmorphism styling, responsive grid layouts, fade/slide animations
- **Two-Column Layouts**: AddFlashcardDialog uses CSS Grid layout - left column (video preview, timing controls, subtitle), right column (markdown editor for notes)
- **Session Type Selection**: Toggle between Standard and Mastery sessions with visual indicators and descriptions
- **Mastery Configuration**: Range slider with CSS custom properties for progress visualization, threshold labels (7d-91d)
- **Card Group Grid**: 3-column responsive grid with color-coded groups, hover effects, selection states
- **Quick Count Selection**: Buttons for common card counts (5, 10, 20, 50, All) with active state styling
- **Session Preview**: Real-time preview of session configuration with estimated time calculations
- **Reusable Components**: VideoPreview component with dynamic aspect ratio detection, repeat functionality, and time-bound playback
- **Translation Flow**: Text selection → TranslateButton → TranslationModal with language swapping and Bing iframe integration
- **AI Chat Integration**: Real-time Ollama chat panel with context awareness, model selection, and specialized German translation prompts
- **Glassmorphism Theme**: Consistent backdrop-blur, gradients, sharp edges (no border-radius), CSS custom properties for dynamic styling

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
- **Study Session State**: Complex session state including cards, current index, mastery tracking, reviewed cards, session configuration
- **Persistent State**: Video progress auto-saved to PocketBase, flashcard review history tracked with FSRS scheduling, mastery progress persistence
- **Dialog Management**: Multiple dialogs (translation, flashcard creation/viewing, study session) with auto-pause video when opened
- **AI Chat State**: Focus tracking to disable keyboard shortcuts when AI input is active, conversation history persistence
- **Mastery Logic**: Real-time mastery checking, card progression based on FSRS state, threshold-based session completion

## Export/Import Module Patterns
- **UI Components**: Centralized exports in `src/components/ui/index.ts` with mixed default/named patterns
- **Service Singletons**: PocketBase service exported as both named export and default with dynamic FSRS imports
- **Path Aliases**: Use `@/` for absolute imports mapped via webpack config
- **Dynamic Imports**: FSRS library imported dynamically to avoid CommonJS/ESM conflicts: `await import('ts-fsrs')`

## Key Integration Points
- **Advanced FSRS**: Comprehensive spaced repetition with mastery sessions, skip functionality, intelligent card grouping and progression
- **Mastery Sessions**: Configurable stability thresholds, real-time progress tracking, continue-until-mastery logic
- **Golden Layout**: React components rendered in layout panels via `componentId` registration and DOM manipulation
- **Video Synchronization**: VideoPreview component maintains time state, supports aspect ratio detection and repeat functionality
- **Translation Workflow**: Text selection → floating button → modal with Bing iframe, language detection and swapping
- **Markdown Editing**: Custom MarkdownEditor with edit/preview tabs for flashcard notes, integrated in two-column layouts
- **Ollama AI Service**: Main process hosts Ollama client, renderer communicates via IPC with conversation context and model selection
- **Modern CSS Patterns**: CSS custom properties for dynamic styling, responsive design, glassmorphism effects, smooth animations

## File Structure Specifics
- `src/lib/services/pocketbase.ts` — Database service with advanced FSRS integration, mastery tracking, and typed CRUD operations
- `src/lib/types/database.ts` — TypeScript definitions including FSRS types, mastery session configs, and collection constants
- `src/lib/types/drawing.ts` — Complete drawing system type definitions, object interfaces, database conversion functions
- `src/lib/services/drawing.ts` — DrawingUtils class with object creation, coordinate transformation, utility methods
- `src/components/drawing/DrawingMode.tsx` — Main drawing container with canvas management, database operations, UI controls
- `src/components/drawing/DrawingCanvas.tsx` — Core drawing engine with SVG rendering, viewport/zoom, tool handlers, object interactions
- `src/components/drawing/DrawingObjectRenderer.tsx` — Object renderer using foreignObject pattern, handles all widget types
- `src/components/drawing/StickyNoteWidget.tsx` — Template widget with resize handles (COPY THIS PATTERN for new widgets)
- `src/components/drawing/ImageWidget.tsx` — Image widget with resize, file upload, crop functionality (follows StickyNote pattern)
- `src/components/drawing/FlashcardWidget.tsx` — Flashcard preview widget with video timing and metadata display
- `src/components/drawing/TranslationWidget.tsx` — Translation widget with Bing iframe integration
- `src/components/drawing/DrawingToolbar.tsx` — 5-tool toolbar (select, flashcard, translation, freehand, sticky-note)
- `src/components/flashcard/StudySessionDialog.tsx` — Modern study session configuration with mastery mode, smart grouping
- `src/components/flashcard/StudySessionDialog.css` — Glassmorphism styling with responsive grid, animations, range slider
- `src/renderer/pages/movie-details/MovieDetails.tsx` — Main study logic with mastery session handling, drawing integration
- `src/components/flashcard/AddFlashcardDialog.tsx` — Two-column layout for flashcard creation
- `src/components/flashcard/ViewFlashcardsDialog.tsx` — Flashcard table with review buttons and FSRS state display
- `src/components/ui/VideoPreview.tsx` — Reusable video component with dynamic aspect ratio and repeat functionality
- `src/components/ui/MarkdownEditor.tsx` — Fallback markdown editor with edit/preview tabs
- `src/components/layout/GoldenLayoutWrapper.tsx` — React integration for golden-layout with component registration
- `src/components/ai/AiChatPanel.tsx` — Real-time AI chat with Ollama integration, model selection, and focus management
- `src/main/ollama-service.ts` — Main process Ollama client with specialized German translation prompts
- `src/lib/services/ollama.ts` — Renderer service for Ollama IPC communication with context-aware chat
- `pocketbase/pb_migrations/` — Database schema migrations including comprehensive FSRS field additions

## Critical Dependencies & Constraints
- **PocketBase**: Must be running on :8090 before starting frontend, handles all data persistence including flashcard scheduling, mastery tracking, and drawing canvas objects
- **FFmpeg**: System dependency required for thumbnail extraction via spawn processes in main.ts
- **FSRS Library**: `ts-fsrs` for advanced spaced repetition scheduling, imported dynamically to avoid module conflicts
- **Golden Layout**: Multi-pane interface library requiring careful React component integration and lifecycle management
- **Drawing System**: Complex SVG-based canvas with HTML widget rendering, coordinate system transformations, real-time database sync
- **Translation APIs**: Relies on Bing Translator iframe integration with language detection and URL encoding
- **Ollama AI**: Local AI service dependency at `localhost:11434` for translation and language learning features
- **React 19**: Uses new createRoot API, React Router (`MemoryRouter`) for navigation, complex state management for study sessions
- **Modern CSS**: CSS custom properties for dynamic styling, backdrop-filter support, responsive design patterns

## Advanced Study Session Patterns
- **Mastery Logic**: `isCardMastered()` function checks stability threshold, state requirements, optional difficulty limits
- **Card Progression**: `getNextMasteryCard()` finds next unmastered card, `advanceToNextCard()` handles session advancement
- **Session Types**: Standard (fixed count, shuffled) vs Mastery (ordered by priority, continue until threshold)
- **Smart Grouping**: Due status priority (overdue > today > soon), state-based grouping (new/learning/review/relearning), difficulty-based grouping
- **Progress Tracking**: Real-time mastery progress calculation, session analytics, rating distribution tracking
- **Error Handling**: Comprehensive error handling in rating buttons, proper async/await patterns, user feedback via alerts
- **State Synchronization**: Proper card state updates after FSRS review, session state consistency, database reload patterns
