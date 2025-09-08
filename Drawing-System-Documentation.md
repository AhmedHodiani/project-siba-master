# Drawing System Documentation

## Overview

This is a comprehensive multi-canvas drawing system built with React/TypeScript, designed for creating interactive annotations, notes, and visual elements over video content. The system provides a complete suite of drawing tools with multi-canvas management capabilities.

## Core Features

### Canvas Management
- **Multi-Canvas Support**: Create, switch between, rename, and delete multiple canvases
- **Canvas Dropdown**: Intuitive dropdown interface for canvas selection and management
- **Persistent State**: Each canvas maintains its own drawing objects and viewport state
- **Auto-Saving**: Canvas data is automatically saved when switching between canvases

### Drawing Tools (5 Total)

1. **Select Tool** (`select`)
   - Object selection and manipulation
   - Drag objects to reposition
   - Multi-object selection capabilities
   - Context menu interactions

2. **Freehand Drawing** (`freehand`)
   - Natural drawing with mouse/touch input
   - Customizable brush properties (color, thickness, opacity)
   - Smooth stroke rendering with path optimization

3. **Flashcard Tool** (`flashcard`)
   - Creates interactive flashcard widgets linked to video segments
   - Shows subtitle text, video preview, and spaced repetition data
   - Live video previews with timing controls
   - Due date tracking and learning state visualization

4. **Translation Tool** (`translation`)
   - Embedded translation widgets with iframe integration
   - Language switching capabilities (source ↔ target)
   - Bing Translator integration
   - Editable text input with live translation preview

5. **Sticky Note Tool** (`sticky-note`)
   - Resizable sticky note widgets with paper-like appearance
   - Double-click to edit text content
   - Customizable colors and fonts
   - Folded corner visual effect for realism

## Technical Architecture

### Core Components

#### DrawingMode.tsx
**Primary container managing the entire drawing system**
- Canvas CRUD operations (create, read, update, delete)
- Canvas dropdown interface
- State synchronization between components
- Canvas data persistence and loading

**Key Functions:**
- `handleCanvasCreate()` - Creates new canvases
- `handleCanvasSwitch()` - Switches between canvases with state saving
- `handleCanvasRename()` / `handleCanvasDelete()` - Canvas management

#### DrawingCanvas.tsx
**Core drawing engine and rendering system**
- Tool event handling and drawing logic
- Object rendering and interaction management
- Viewport management (pan, zoom)
- Object selection and manipulation
- Drawing object lifecycle management

**Key Features:**
- SVG-based rendering for scalable graphics
- Real-time tool switching and property updates
- Object layering and z-index management
- Responsive viewport with zoom controls

#### DrawingToolbar.tsx
**Tool selection interface**
- 5 drawing tools with icons and labels
- Active tool highlighting
- Tool state management
- Clean, intuitive UI design

### Drawing Objects System

#### Base Drawing Object Interface
```typescript
interface DrawingObject {
  id: string;
  type: 'freehand' | 'sticky-note' | 'flashcard' | 'translation';
  x: number;
  y: number;
  zIndex: number;
  isSelected?: boolean;
}
```

#### Specialized Object Types

**FreehandObject**
- Path-based drawing with SVG paths
- Stroke properties (color, width, opacity)
- Smooth curve rendering

**StickyNoteObject**
- Resizable rectangular notes
- Text content with custom fonts
- Paper color and font color customization
- Size properties (width, height)

**FlashcardObject**
- Links to database flashcard records
- Video timing (start_time, end_time)
- Spaced repetition metadata
- Interactive video preview

**TranslationObject**
- Text content for translation
- Source and target languages
- Embedded iframe for live translation
- Language switching functionality

### Advanced Features

#### Brush Properties Panel
- **16 Predefined Colors**: Optimized for visibility on dark backgrounds
- **Custom Color Picker**: Full spectrum color selection
- **Thickness Control**: 1-50px stroke width with slider
- **Opacity Control**: 10%-100% opacity adjustment
- **Live Preview**: Real-time stroke preview

**Color Palette:**
- White (#FFFFFF) - excellent for dark backgrounds
- Gold (#FFD700) - bright and visible
- Coral Red (#FF6B6B) - softer than pure red
- Turquoise (#4ECDC4) - calming and visible
- Sky Blue (#45B7D1) - professional
- Mint Green (#96CEB4) - easy on eyes
- Plus 10 additional carefully selected colors

#### Widget Interactions

**Sticky Notes:**
- **Resize Handles**: Corner and edge resize with live preview
- **Double-Click Editing**: In-place text editing with textarea
- **Keyboard shortcuts**: Ctrl+Enter to save, Escape to cancel
- **Visual States**: Selected, editing, resizing states with distinct styling

**Flashcards:**
- **Database Integration**: Real-time loading of flashcard and movie data
- **Video Preview**: Embedded video player with segment controls
- **Spaced Repetition Display**: Shows difficulty, stability, reps, and due dates
- **Due Status**: Color-coded due date indicators (overdue=red, today=yellow, future=green)

**Translation Widgets:**
- **Live Translation**: Embedded Bing Translator iframe
- **Language Swapping**: Quick swap between source and target languages
- **Text Editing**: Double-click to edit source text
- **Dynamic URLs**: Auto-generates translation URLs with current text

#### Canvas Features

**Multi-Canvas Management:**
- Unlimited canvas creation
- Named canvases with user-defined titles
- Independent object sets per canvas
- Viewport state persistence per canvas

**Drawing Persistence:**
- Auto-save on canvas switch
- Local storage integration
- Object state preservation
- Viewport position memory

## Integration Points

### Database Integration
- **PocketBase Service**: Flashcard and movie data retrieval
- **Async Data Loading**: Non-blocking flashcard widget initialization
- **Error Handling**: Graceful fallbacks for missing data

### Video System Integration
- **VideoPreview Component**: Embedded video players in flashcards
- **Timing Controls**: Start/end time navigation
- **Play State Management**: Synchronized play/pause controls

### UI Component System
- **Consistent Design Language**: Matches application UI patterns
- **Responsive Design**: Adapts to different screen sizes and zoom levels
- **Accessibility**: Keyboard navigation and screen reader support

## Usage Workflow

1. **Canvas Creation**: Use dropdown to create new named canvas
2. **Tool Selection**: Choose from 5 available drawing tools
3. **Object Creation**: Click/drag to create drawing objects
4. **Object Editing**: Double-click objects for in-place editing
5. **Canvas Management**: Switch between canvases to organize content
6. **Persistence**: All changes automatically saved on canvas switch

## Technical Implementation Details

### State Management
- Canvas state stored in parent DrawingMode component
- Drawing objects managed per-canvas with independent arrays
- Tool properties (brush color, thickness) shared across canvases
- Viewport state (zoom, pan) maintained per canvas

### Event Handling
- Mouse/touch events processed by DrawingCanvas
- Tool-specific event handlers for different drawing modes
- Drag and drop system for object manipulation
- Context menu integration for object actions

### Performance Optimizations
- SVG rendering for scalable vector graphics
- Efficient object selection algorithms
- Minimal re-renders with React optimization patterns
- Lazy loading for flashcard data and video content

### Styling System
- CSS modules for component-scoped styles
- Consistent color scheme and typography
- Responsive design with viewport units
- Smooth animations and transitions

## File Structure
```
src/components/drawing/
├── DrawingMode.tsx              # Main container & canvas management
├── DrawingCanvas.tsx            # Core drawing engine
├── DrawingToolbar.tsx           # Tool selection interface  
├── BrushPropertiesPanel.tsx     # Brush customization panel
├── StickyNoteWidget.tsx         # Sticky note implementation
├── FlashcardWidget.tsx          # Flashcard widget with video
├── TranslationWidget.tsx        # Translation widget with iframe
└── [CSS files]                  # Component-specific styles

src/lib/types/drawing.ts         # TypeScript type definitions
```

This drawing system provides a complete, professional-grade annotation and drawing solution with multi-canvas support, specialized widgets, and seamless integration with video and database systems.
