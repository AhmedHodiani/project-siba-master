# Drawing Section Architecture Guide

## Overview
This document serves as a comprehensive guide for understanding, maintaining, and extending the drawing section feature in the Movie Library Electron App. The drawing system is a complex multi-layered architecture that supports various object types, real-time collaboration, and advanced interaction patterns.

## CRITICAL: How to Get Started (Future AI Quick Reference)

### Prerequisites Check
1. **PocketBase must be running**: `./pocketbase/pocketbase serve` in terminal
2. **Frontend running**: `npm run start` in another terminal  
3. **Drawing accessed via**: Movie Details page → bottom drawing section panel

### 🚨 GOLDEN RULE: ALWAYS FOLLOW EXISTING PATTERNS 🚨
**NEVER CREATE NEW PATTERNS OR REINVENT EXISTING FUNCTIONALITY**

- **When adding widgets**: Copy StickyNoteWidget.tsx pattern EXACTLY
- **When adding resize**: Copy StickyNoteWidget resize handlers EXACTLY  
- **When adding tools**: Copy existing tool patterns in DrawingCanvas.tsx
- **When handling events**: Copy existing event handler patterns
- **When styling**: Copy existing CSS class patterns and naming conventions
- **When managing state**: Follow existing state update patterns

**If you see existing code that does what you need, COPY IT. Don't write new code.**

### Where Drawing Lives in the App
- **Entry Point**: `src/renderer/pages/movie-details/MovieDetails.tsx` 
- **Integration**: Drawing section is a panel in the movie details view (Golden Layout)
- **Component**: `<DrawingMode movieId={movieId} />` renders the entire drawing system

### File Location Map (Critical for Navigation)
```
src/components/drawing/
├── DrawingMode.tsx              # MAIN CONTAINER - Canvas management, state, database operations
├── DrawingCanvas.tsx            # CORE ENGINE - SVG rendering, tools, viewport, interactions  
├── DrawingObjectRenderer.tsx    # RENDERER - Renders individual objects based on type
├── DrawingToolbar.tsx           # TOOLBAR - Tool selection UI (5 tools)
├── BrushPropertiesPanel.tsx     # BRUSH PANEL - Stroke properties for freehand
├── StickyNoteWidget.tsx         # WIDGET - HTML-based sticky note with resize
├── ImageWidget.tsx              # WIDGET - HTML-based image with resize (recently fixed)
├── FlashcardWidget.tsx          # WIDGET - HTML-based flashcard preview
├── TranslationWidget.tsx        # WIDGET - HTML-based translation with iframe
├── FlashcardPickerDialog.tsx    # DIALOG - Select flashcard for placement
├── SelectionHandles.tsx         # HANDLES - Selection box with corner handles
├── StickyNotePropertiesPanel.tsx # PROPERTIES - Sticky note customization
├── ContextMenu.tsx              # MENU - Right-click context menu
└── [corresponding .css files]   # STYLES

src/lib/types/drawing.ts         # TYPE DEFINITIONS - All interfaces and types
src/lib/services/drawing.ts      # UTILITIES - DrawingUtils class with helper functions
```

## Core Architecture

### 1. Component Hierarchy
```
DrawingMode.tsx (Top-level container)
├── Canvas Management UI (dropdown, create, rename, delete)
├── DrawingCanvas.tsx (Main canvas with viewport/zoom)
│   ├── DrawingToolbar.tsx (5 tools: select, flashcard, translation, freehand, sticky-note)
│   ├── BrushPropertiesPanel.tsx (when freehand tool selected)
│   ├── StickyNotePropertiesPanel.tsx (when sticky note selected)
│   ├── SVG Canvas Element (handles viewport, zoom, coordinate transformation)
│   └── DrawingObjectRenderer.tsx (renders each object)
│       ├── StickyNoteWidget.tsx (foreignObject wrapper → HTML/CSS)
│       ├── ImageWidget.tsx (foreignObject wrapper → HTML/CSS) 
│       ├── TranslationWidget.tsx (foreignObject wrapper → HTML/CSS)
│       ├── FlashcardWidget.tsx (foreignObject wrapper → HTML/CSS)
│       └── FreehandObject (Pure SVG path element)
├── FlashcardPickerDialog.tsx (modal for flashcard selection)
├── ContextMenu.tsx (right-click menu for objects)
└── SelectionHandles.tsx (multi-select box with resize handles)
```

### 2. Data Flow Pattern
```
User Interaction → Widget Event → Canvas Handler → Mode Controller → PocketBase → State Update → Re-render
```

### 3. Critical State Management
```tsx
// DrawingMode.tsx - Main state container
const [canvasState, setCanvasState] = useState<CanvasState>({
  canvases: Canvas[],           // Array of all canvases for this movie
  activeCanvasId: string | null // Currently selected canvas ID
});

// DrawingCanvas.tsx - Drawing state  
const [drawingState, setDrawingState] = useState({
  selectedTool: ToolType,       // Currently selected tool
  objects: DrawingObject[],     // All objects on current canvas
  selectedObjectIds: string[],  // Currently selected object IDs
});

// Viewport state for pan/zoom
const [viewport, setViewport] = useState({
  x: 0, y: 0, zoom: 1         // World coordinate system
});
```

## Key Design Patterns

### 1. Widget Pattern (HTML in SVG via foreignObject)
Most interactive objects (sticky notes, images, translations, flashcards) use this pattern:

**Structure:**
```tsx
// In DrawingObjectRenderer.tsx
<foreignObject x={object.x} y={object.y} width={object.width} height={object.height}>
  <WidgetComponent 
    object={objectData}
    isSelected={object.selected}
    zoom={viewport.zoom}
    onUpdate={handleUpdate}
    onSelect={onSelect}
    onContextMenu={onContextMenu}
    onStartDrag={handleDrag}
  />
</foreignObject>
```

**Widget Interface Pattern:**
```tsx
interface WidgetProps {
  [objectType]: ObjectData;           // Main object data
  isSelected: boolean;                // Selection state
  zoom: number;                       // Canvas zoom level
  onUpdate: (id: string, updates: Partial<ObjectData>) => void;  // Update callback
  onSelect: (id: string) => void;     // Selection callback
  onContextMenu: (event: React.MouseEvent, id: string) => void;  // Context menu
  onStartDrag?: (e: React.MouseEvent, id: string) => void;       // Drag initiation
}
```

### 2. Resize Handle Pattern
All resizable widgets follow this pattern (based on StickyNoteWidget):

**HTML Structure:**
```tsx
<div className="widget-container">
  <div className="widget-content">...</div>
  {isSelected && (
    <>
      <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
      <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
    </>
  )}
</div>
```

**CSS Pattern:**
```css
.resize-handle {
  position: absolute;
  width: 20px; height: 20px;
  background: #007acc;
  border: 2px solid #fff;
  z-index: 1000;
  pointer-events: all !important;
}
.resize-handle-se { bottom: -10px; right: -10px; cursor: se-resize; }
.resize-handle-s { bottom: -10px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.resize-handle-e { right: -10px; top: 50%; transform: translateY(-50%); cursor: e-resize; }
```

**JavaScript Pattern:**
```tsx
const handleResizeStart = (e: React.MouseEvent, handle: 'se' | 's' | 'e') => {
  e.preventDefault(); e.stopPropagation();
  setIsResizing(true); setResizeHandle(handle);
  
  const startX = e.clientX, startY = e.clientY;
  const startWidth = object.width, startHeight = object.height;
  
  const handleResizeMove = (moveEvent: MouseEvent) => {
    const deltaX = (moveEvent.clientX - startX) / zoom;  // Zoom compensation!
    const deltaY = (moveEvent.clientY - startY) / zoom;
    
    let newWidth = startWidth, newHeight = startHeight;
    if (handle === 'se') { newWidth += deltaX; newHeight += deltaY; }
    else if (handle === 's') { newHeight += deltaY; }
    else if (handle === 'e') { newWidth += deltaX; }
    
    // CRITICAL: Call onUpdate immediately for real-time visual feedback
    onUpdate(object.id, { width: Math.max(100, newWidth), height: Math.max(100, newHeight) });
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false); setResizeHandle(null);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  document.addEventListener('mousemove', handleResizeMove);
  document.addEventListener('mouseup', handleResizeEnd);
};
```

### 3. Drag Pattern
Dragging is handled at the canvas level, not individual widgets:

**Widget Side:**
```tsx
const handleMouseDown = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('resize-handle')) return; // Let handles handle themselves
  
  if (!isEditing && !isResizing) {
    onSelect(object.id);
    if (onStartDrag) onStartDrag(e, object.id);
  }
};
```

**Canvas Side (DrawingCanvas.tsx):**
- Converts screen coordinates to world coordinates using viewport transformation
- Handles multi-object selection and dragging
- Updates positions in real-time during drag
- Saves to database only on drag end to avoid request spam

### 4. Coordinate System
**Critical Understanding:**

```tsx
// Screen to World Coordinate Transformation
const worldPoint = {
  x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
  y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
};

// World coordinates are stored in database
// Screen coordinates are for mouse events
// Zoom affects the transformation ratio
```

## Database Schema & Types

### PocketBase Collections

#### `pbc_canvases` Collection
```javascript
{
  id: string,
  title: string,
  movie_id: string,              // Links to movies collection  
  viewport_x: number,            // Saved viewport position
  viewport_y: number,
  viewport_zoom: number,
  object_count: number,          // Cache for performance
  created: datetime,
  updated: datetime
}
```

#### `pbc_canvas_objects` Collection  
```javascript
{
  id: string,
  canvas_id: string,             // Links to pbc_canvases
  type: 'sticky-note' | 'image' | 'translation' | 'flashcard' | 'freehand',
  x: number, y: number,          // World coordinates (NOT screen coordinates)
  width: number, height: number, // Object dimensions
  z_index: number,              // Layer order (higher = front)
  object_data: JSON,           // Type-specific properties (see below)
  files: File[],              // Array for image attachments (PocketBase file field)
  created: datetime,
  updated: datetime
}
```

### Critical Type Definitions (`src/lib/types/drawing.ts`)

#### Base Interfaces
```tsx
export interface Point { x: number; y: number; }

export interface Canvas {
  id: string;
  title: string;
  createdAt: Date;
  lastModified: Date;
  objects: DrawingObject[];      // UI objects (converted from DB)
  viewport?: { x: number; y: number; zoom: number; };
}

export interface CanvasState {
  canvases: Canvas[];            // All canvases for current movie
  activeCanvasId: string | null; // Currently viewing
}

export type DrawingObjectType = 
  | 'flashcard' | 'translation' | 'freehand' | 'sticky-note' | 'image';

export type ToolType = 
  | 'select' | 'flashcard' | 'translation' | 'freehand' | 'sticky-note' | 'image';
```

#### Drawing Object Interfaces (UI Layer)
```tsx
export interface BaseDrawingObject {
  id: string;                    // Database ID after creation
  type: DrawingObjectType;
  x: number; y: number;         // World coordinates
  selected: boolean;            // UI selection state
  zIndex: number;              // Layer order
  style: {                     // SVG/CSS styling
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface StickyNoteObject extends BaseDrawingObject {
  type: 'sticky-note';
  text: string;                // Note content
  width: number; height: number; // Dimensions
  paperColor: string;          // Background color
  fontColor: string;           // Text color  
  fontSize: number;            // Text size
}

export interface ImageObject extends BaseDrawingObject {
  type: 'image';
  fileName?: string;           // PocketBase filename (with prefix)
  width: number; height: number; // Display dimensions
  originalWidth: number; originalHeight: number; // Original image dimensions
  cropX?: number; cropY?: number; // Crop offset
  cropWidth?: number; cropHeight?: number; // Crop dimensions
}

export interface FlashcardObject extends BaseDrawingObject {
  type: 'flashcard';
  flashcardId: string;         // Links to flashcards collection
  width: number; height: number; // Fixed: 650x560
}

export interface TranslationObject extends BaseDrawingObject {
  type: 'translation';
  text: string;                // Text to translate
  sourceLanguage: string;      // Source lang code (en, de, etc)
  targetLanguage: string;      // Target lang code
  width: number; height: number; // Widget dimensions
}

export interface FreehandObject extends BaseDrawingObject {
  type: 'freehand';
  points: Point[];             // Array of path points
}

export type DrawingObject = 
  | FlashcardObject | TranslationObject | FreehandObject 
  | StickyNoteObject | ImageObject;
```

#### Database Record Types (DB Layer)
```tsx
export interface CanvasRecord {
  id: string;
  title: string;
  movie_id: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  object_count: number;
  created: string;            // ISO date string
  updated: string;
}

export interface CanvasObjectRecord {
  id: string;
  canvas_id: string;
  type: DrawingObjectType;
  x: number; y: number;
  width: number; height: number;
  z_index: number;
  object_data: any;           // Type-specific JSON data
  files: string[];           // Array of filenames
  created: string;
  updated: string;
}
```

### object_data JSON Structure by Type
```tsx
// sticky-note object_data
{
  text: string,
  paperColor: string,
  fontColor: string, 
  fontSize: number,
  selected: boolean,         // UI state
  style: object             // CSS properties
}

// image object_data  
{
  originalWidth: number,
  originalHeight: number,
  cropX?: number,
  cropY?: number,
  cropWidth?: number,
  cropHeight?: number,
  selected: boolean,
  style: object
}

// flashcard object_data
{
  flashcardId: string       // Only this field, width/height are hardcoded
}

// translation object_data
{
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  selected: boolean,
  style: object
}

// freehand object_data
{
  points: Point[],          // Array of {x, y} coordinates
  selected: boolean,
  style: object
}
```

## State Management

### 1. Canvas State (DrawingCanvas.tsx)
```tsx
const [drawingState, setDrawingState] = useState({
  selectedTool: 'select',
  objects: DrawingObject[],
  selectedObjectIds: string[],
  // ... other state
});

// Viewport state for pan/zoom
const [viewport, setViewport] = useState({
  x: 0, y: 0, zoom: 1
});
```

### 2. Database Synchronization
- **Real-time updates:** Widget changes call `onUpdate` → canvas handler → mode controller → PocketBase
- **State consistency:** Database updates trigger re-fetch and state update
- **Optimistic updates:** UI updates immediately, database saves asynchronously

## Adding New Drawing Object Types

### Step 1: Define Types
```tsx
// In drawing.ts
interface NewObjectType extends DrawingObject {
  type: 'new-object';
  // Add specific properties
  customProperty: string;
}

type ObjectType = 'sticky-note' | 'image' | 'translation' | 'flashcard' | 'freehand' | 'new-object';
```

### Step 2: Create Widget Component
```tsx
// NewObjectWidget.tsx
interface NewObjectWidgetProps {
  object: NewObjectType;
  isSelected: boolean;
  zoom: number;
  onUpdate: (id: string, updates: Partial<NewObjectType>) => void;
  onSelect: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, id: string) => void;
  onStartDrag?: (e: React.MouseEvent, id: string) => void;
}

export const NewObjectWidget: React.FC<NewObjectWidgetProps> = ({ ... }) => {
  // Follow the resize pattern if resizable
  // Follow the widget HTML structure pattern
  // Handle events properly
};
```

### Step 3: Add to Renderer
```tsx
// In DrawingObjectRenderer.tsx
switch (object.type) {
  // ... existing cases
  case 'new-object':
    return (
      <foreignObject x={object.x} y={object.y} width={object.width} height={object.height}>
        <NewObjectWidget 
          object={object as NewObjectType}
          isSelected={object.selected}
          zoom={viewport?.zoom || 1}
          onUpdate={handleUpdate}
          // ... other props
        />
      </foreignObject>
    );
}
```

### Step 4: Add Tool Support
```tsx
// In DrawingCanvas.tsx tool handling
if (drawingState.selectedTool === 'new-object') {
  const newObject = DrawingUtils.createObject({
    type: 'new-object',
    startPoint: worldPoint,
    // Add default properties
  });
  
  if (onObjectCreated) {
    onObjectCreated(newObject);
  }
}
```

### Step 5: Database Migration
```javascript
// Add to PocketBase migrations
migrate((db) => {
  // Update canvas_objects collection if needed
  // Add any new fields or constraints
});
```

## Common Patterns & Best Practices

### 1. Event Handling
```tsx
// ALWAYS prevent event bubbling in widgets
const handleSomeEvent = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // Handle event
};

// Check for resize handles to avoid conflicts
const handleMouseDown = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('resize-handle')) return;
  // Handle mouse down
};
```

### 2. Zoom Compensation
```tsx
// ALWAYS divide mouse deltas by zoom for accurate resizing/positioning
const deltaX = (moveEvent.clientX - startX) / zoom;
const deltaY = (moveEvent.clientY - startY) / zoom;
```

### 3. Real-time Updates
```tsx
// For smooth interactions, update props immediately
onUpdate(objectId, { width: newWidth, height: newHeight });
// NOT: setTempState({ width: newWidth }); // This breaks real-time feedback
```

### 4. CSS Structure
```css
.widget-container {
  position: relative;     /* For absolute positioned handles */
  overflow: visible;      /* Let handles extend outside */
  border: 2px solid #ddd;
}

.widget-container.selected {
  border: 2px dashed #007acc;  /* Visual selection feedback */
}

.widget-container.resizing {
  border-color: #007acc;
  box-shadow: 0 0 15px rgba(0, 122, 204, 0.6);
}
```

## File Upload Pattern (Images)

### 1. File Selection
```tsx
// In DrawingCanvas.tsx
const handleImageFile = async (file: File, position: Point) => {
  const formData = new FormData();
  formData.append('files', file);
  
  const newObject = DrawingUtils.createObject({
    type: 'image',
    startPoint: position,
    fileName: file.name,
    originalWidth: 300,  // Default, will be updated
    originalHeight: 200
  });
  
  // Create object first, then attach file
  if (onObjectCreated) {
    const savedObject = await onObjectCreated(newObject);
    // Attach file to saved object
    await pocketBaseService.attachFileToCanvasObject(savedObject.id, formData);
  }
};
```

### 2. File URL Generation
```tsx
// In PocketBase service
getImageUrl(record: CanvasObjectRecord, fileName: string): string {
  return `${this.baseUrl}/api/files/${COLLECTIONS.CANVAS_OBJECTS}/${record.id}/${fileName}`;
}

// Use actual filenames from database, not original filenames
// PocketBase generates unique prefixed filenames (e.g., "abc123_original.png")
```

## Debugging Common Issues

### 1. Objects Not Resizing Smoothly
- Check if `onUpdate` is called on every mouse move
- Verify zoom compensation: `deltaX / zoom`
- Ensure CSS doesn't conflict with inline styles
- Check that widget uses object props directly, not temp state

### 2. Drag Not Working
- Verify coordinate transformation from screen to world coordinates
- Check event propagation (e.preventDefault, e.stopPropagation)
- Ensure resize handles don't interfere with drag events

### 3. Selection Border Not Updating
- Remove conflicting CSS/inline style properties
- Ensure selected class is applied correctly
- Check that overflow is 'visible' not 'hidden'

### 4. Database Errors
- Auto-cancellation errors: reduce API call frequency
- File upload errors: check FormData construction and file size limits
- Constraint errors: verify required fields and data types

## Performance Considerations

### 1. Throttle Frequent Updates
```tsx
// For very frequent operations, consider throttling
const throttledUpdate = useCallback(
  throttle((id: string, updates: any) => onUpdate(id, updates), 16), // ~60fps
  [onUpdate]
);
```

### 2. Optimize Re-renders
```tsx
// Use React.memo for expensive components
export const ExpensiveWidget = React.memo<WidgetProps>(({ ... }) => {
  // Component implementation
});

// Memoize complex calculations
const expensiveValue = useMemo(() => {
  return complexCalculation(props);
}, [dependency1, dependency2]);
```

### 3. Efficient Object Lookup
```tsx
// Use Map for O(1) lookups instead of array.find
const objectMap = useMemo(() => {
  return new Map(objects.map(obj => [obj.id, obj]));
}, [objects]);
```

## Testing Patterns

### 1. Widget Testing
```tsx
// Test resize functionality
test('should resize object when dragging handle', async () => {
  const mockOnUpdate = jest.fn();
  render(<Widget object={mockObject} onUpdate={mockOnUpdate} />);
  
  const handle = screen.getByClassName('resize-handle-se');
  fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 });
  fireEvent.mouseMove(document, { clientX: 50, clientY: 50 });
  
  expect(mockOnUpdate).toHaveBeenCalledWith(mockObject.id, {
    width: expect.any(Number),
    height: expect.any(Number)
  });
});
```

### 2. Integration Testing
```tsx
// Test canvas interactions
test('should create object when tool is selected', async () => {
  render(<DrawingCanvas selectedTool="sticky-note" />);
  
  const canvas = screen.getByRole('canvas');
  fireEvent.click(canvas, { clientX: 100, clientY: 100 });
  
  await waitFor(() => {
    expect(screen.getByText(/Double-click to edit/)).toBeInTheDocument();
  });
});
```

## Future Development Guidelines

### 🚨 1. ANTI-SPAGHETTI CODE RULES 🚨

#### NEVER Create New Patterns When Existing Ones Work
- **Widget Creation**: If StickyNoteWidget does what you need, COPY its structure
- **Event Handling**: If existing widgets handle events properly, COPY their approach  
- **State Management**: If DrawingCanvas manages state correctly, FOLLOW its pattern
- **Database Operations**: If DrawingMode saves objects properly, USE its methods

#### ALWAYS Use Existing Utilities
- **Object Creation**: Use `DrawingUtils.createObject()` - NEVER write custom creation logic
- **Coordinate Transformation**: Use existing viewport transformation code
- **Database Conversion**: Use `drawingObjectToRecord()` and `recordToDrawingObject()`
- **Type Definitions**: Extend existing interfaces - NEVER create duplicate types

#### Code Organization Rules
- **One Widget = One File**: Follow the StickyNoteWidget.tsx + StickyNoteWidget.css pattern
- **Shared Logic = Utils**: Put reusable logic in `DrawingUtils`, not individual components
- **Types = Central**: All types go in `drawing.ts`, not scattered across files
- **Constants = Enums**: Use existing type unions, don't create magic strings

### 2. Mandatory Pattern Compliance

#### Widget Development Pattern (NON-NEGOTIABLE)
```tsx
// ALWAYS follow this exact structure for new widgets:
export const NewWidget: React.FC<NewWidgetProps> = ({
  object,           // Main object data
  isSelected,       // Selection state
  zoom,            // Canvas zoom level  
  onUpdate,        // Update callback
  onSelect,        // Selection callback
  onContextMenu,   // Right-click menu
  onStartDrag      // Drag initiation
}) => {
  // ALWAYS use these hooks for resize (copy from StickyNoteWidget)
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  
  // ALWAYS follow this event handler pattern
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle')) return; // Let handles handle themselves
    
    if (!isResizing) {
      onSelect(object.id);
      if (onStartDrag) onStartDrag(e, object.id);
    }
  };
  
  // ALWAYS use this resize pattern (copy from StickyNoteWidget EXACTLY)
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    // Copy the EXACT implementation from StickyNoteWidget
  };
  
  return (
    <div 
      className={`widget-container ${isSelected ? 'selected' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className="widget-content">
        {/* Your widget content */}
      </div>
      {isSelected && (
        <>
          <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
          <div className="resize-handle resize-handle-s" onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className="resize-handle resize-handle-e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
        </>
      )}
    </div>
  );
};
```

#### CSS Pattern (NON-NEGOTIABLE)
```css
/* ALWAYS follow this exact CSS structure for widgets: */
.widget-container {
  position: relative;
  border: 2px solid #ddd;
  overflow: visible;
  background: #fff;
}

.widget-container.selected {
  border: 2px dashed #007acc;
}

.widget-container.resizing {
  border-color: #007acc;
  box-shadow: 0 0 15px rgba(0, 122, 204, 0.6);
}

/* ALWAYS use these exact resize handle styles */
.resize-handle {
  position: absolute;
  width: 20px; height: 20px;
  background: #007acc;
  border: 2px solid #fff;
  z-index: 1000;
  pointer-events: all !important;
}
/* Copy the rest from StickyNoteWidget.css EXACTLY */
```

### 3. Mandatory Code Quality Rules

#### Event Handling (ALWAYS)
```tsx
// ALWAYS prevent event bubbling in widgets
const handleSomeEvent = (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // Handle event
};

// ALWAYS check for resize handles to avoid conflicts
const handleMouseDown = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('resize-handle')) return;
  // Handle mouse down
};
```

#### Zoom Compensation (ALWAYS)
```tsx
// ALWAYS divide mouse deltas by zoom for accurate positioning
const deltaX = (moveEvent.clientX - startX) / zoom;
const deltaY = (moveEvent.clientY - startY) / zoom;
```

#### Real-time Updates (ALWAYS)
```tsx
// ALWAYS update props immediately for smooth interactions
onUpdate(objectId, { width: newWidth, height: newHeight });
// NEVER use temp state for visual updates:
// setTempState({ width: newWidth }); // ❌ WRONG - breaks real-time feedback
```

### 4. Performance & Maintainability
- New features should not block the main thread
- Large objects or complex calculations should be optimized  
- Database operations should be batched when possible
- NEVER duplicate existing functionality - ALWAYS reuse

### 5. User Experience Standards
- Provide immediate visual feedback for all interactions
- Handle edge cases gracefully (zoom limits, object boundaries, etc.)
- Follow existing interaction patterns exactly
- NEVER create new UX patterns without strong justification

---

## Debugging Workflow (How Future AI Should Approach Issues)

### Step 1: Identify the Layer
- **UI Bug**: Widget not rendering → Check `DrawingObjectRenderer.tsx` switch statement
- **Interaction Bug**: Drag/resize not working → Check widget event handlers
- **Data Bug**: Objects not saving → Check `DrawingMode.tsx` database operations  
- **Render Bug**: Objects disappearing → Check coordinate transformation or viewport

### Step 2: Find the Right File
- **Selection issues**: `DrawingCanvas.tsx` handleObjectSelect
- **Resize problems**: Individual widget files (StickyNoteWidget.tsx, ImageWidget.tsx)
- **Tool problems**: `DrawingCanvas.tsx` tool event handlers
- **Database issues**: `DrawingMode.tsx` CRUD operations
- **Type errors**: `src/lib/types/drawing.ts`

### Step 3: Check Common Failure Points
- **Coordinate System**: Screen vs World coordinates (always divide by zoom)
- **Event Propagation**: Missing preventDefault/stopPropagation
- **Database Sync**: Real-time updates vs database saves
- **State Management**: Direct prop updates vs temp state

## Quick Reference Commands

### Most Common Bug Fixes

#### "Objects won't resize properly"
1. Check widget resize handlers follow StickyNoteWidget pattern
2. Verify `onUpdate` called on every mousemove (not just mouseup)
3. Check zoom compensation: `deltaX / zoom, deltaY / zoom`
4. Ensure object uses props directly, not temp state

#### "New objects not appearing"  
1. Check `DrawingCanvas.tsx` tool handler creates object
2. Verify `DrawingMode.tsx` handleObjectCreated saves to DB
3. Check `DrawingObjectRenderer.tsx` has case for object type
4. Ensure database record conversion in `drawing.ts`

#### "Dragging not working"
1. Check foreignObject has proper cursor and pointerEvents
2. Verify coordinate transformation in onStartDrag
3. Ensure resize handles don't block drag events
4. Check canvas event handlers are attached

### Add New Object Type Checklist

#### 🚨 MANDATORY: Copy Existing Patterns EXACTLY

1. **Define Types** (`src/lib/types/drawing.ts`)
   - [ ] **COPY** similar interface from existing types - DON'T write from scratch
   - [ ] Add to `DrawingObjectType` union (follow existing format)
   - [ ] Add to `ToolType` union (follow existing format)
   - [ ] Create `NewObjectType` interface extending `BaseDrawingObject` (copy StickyNoteObject structure)
   - [ ] Add to `DrawingObject` union type at bottom

2. **Create Widget** (`src/components/drawing/NewObjectWidget.tsx`)
   - [ ] **COPY StickyNoteWidget.tsx file completely** - rename and modify content only
   - [ ] **DO NOT write new resize logic** - copy handleResizeStart from StickyNoteWidget EXACTLY
   - [ ] **DO NOT write new event handlers** - copy handleMouseDown pattern EXACTLY  
   - [ ] **DO NOT create new CSS classes** - copy StickyNoteWidget.css and modify colors/content only
   - [ ] Follow HTML structure pattern (foreignObject compatible)
   - [ ] Use exact same prop interface pattern as other widgets

3. **Add Renderer Case** (`src/components/drawing/DrawingObjectRenderer.tsx`)
   - [ ] **COPY existing case** (like sticky-note case) - don't write from scratch
   - [ ] Add case to switch statement following exact same pattern
   - [ ] Wrap in foreignObject with same props as other widgets
   - [ ] **COPY coordinate transformation code** from existing widget cases

4. **Add Tool Support** (`src/components/drawing/DrawingCanvas.tsx`)
   - [ ] **FIND existing tool handler** (like sticky-note) and copy its structure
   - [ ] Add tool to DrawingToolbar (copy existing button pattern)
   - [ ] Add case to tool event handler following existing pattern
   - [ ] **USE** `DrawingUtils.createObject()` - DO NOT write custom creation logic

5. **Database Integration** (`src/lib/types/drawing.ts`)
   - [ ] **COPY existing case** in `drawingObjectToRecord()` function  
   - [ ] **COPY existing case** in `recordToDrawingObject()` function
   - [ ] **FOLLOW existing object_data structure patterns** - don't invent new ones

6. **Utility Updates** (`src/lib/services/drawing.ts`)
   - [ ] **COPY existing case** in `DrawingUtils.createObject()` switch statement
   - [ ] Use same default dimension patterns as similar objects
   - [ ] Follow existing style property patterns

#### ❌ THINGS TO NEVER DO:
- ❌ Write resize logic from scratch (always copy StickyNoteWidget)
- ❌ Create new event handling patterns (copy existing ones)
- ❌ Invent new CSS class naming (use existing patterns)  
- ❌ Write custom coordinate transformation (copy existing code)
- ❌ Create new state management patterns (follow existing)
- ❌ Write database conversion from scratch (copy existing cases)
- ❌ Ignore existing TypeScript interfaces (always extend/follow them)

#### ✅ THINGS TO ALWAYS DO:
- ✅ Copy working code and modify minimally
- ✅ Follow exact same file/folder structure 
- ✅ Use existing utility functions
- ✅ Match existing naming conventions
- ✅ Test that resize/drag works like other widgets
- ✅ Verify database save/load works like other objects

### Debug Resize Issues Checklist
- [ ] Check `onUpdate` is called on mouse move (not just end)
- [ ] Verify zoom compensation: `/ zoom`
- [ ] Ensure no CSS conflicts with inline styles
- [ ] Check event propagation and preventDefault
- [ ] Verify object uses props directly (no tempSize state)
- [ ] Test with different zoom levels
- [ ] Check handles positioned correctly in CSS

### Debug Drag Issues Checklist  
- [ ] Verify screen-to-world coordinate conversion
- [ ] Check resize handle event conflicts (handles should return early)
- [ ] Ensure proper event propagation handling
- [ ] Test selection behavior
- [ ] Verify canvas event handlers are attached
- [ ] Check cursor changes during drag

### Debug Database Issues Checklist
- [ ] Check PocketBase is running on :8090
- [ ] Verify collection names match constants
- [ ] Check object_data JSON structure matches expectations
- [ ] Ensure file uploads use FormData correctly
- [ ] Check error handling in database operations
- [ ] Verify record conversion functions work both ways

## Emergency Recovery Guide

### "Drawing system completely broken"
1. Check console for errors
2. Verify PocketBase is running  
3. Check database collections exist
4. Verify no type errors in drawing.ts
5. Test with simple sticky note creation

### "Objects saving but not appearing"  
1. Check `recordToDrawingObject()` conversion
2. Verify canvas refresh after database operations
3. Check object_data JSON structure  
4. Ensure z_index values are correct

### "Can't select or interact with objects"
1. Check foreignObject pointerEvents settings
2. Verify event handlers are attached
3. Check CSS positioning and overflow
4. Test with browser dev tools event inspection

This document should serve as a comprehensive guide for understanding and working with the drawing system. A future AI should be able to diagnose and fix most issues by following these patterns and checklists, understanding the component hierarchy, and knowing where each type of logic lives in the codebase.
