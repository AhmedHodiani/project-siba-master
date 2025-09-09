// Drawing system types and interfaces

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Canvas {
  id: string;
  title: string;
  createdAt: Date;
  lastModified: Date;
  objects: DrawingObject[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface CanvasState {
  canvases: Canvas[];
  activeCanvasId: string | null;
}

export type DrawingObjectType = 
  | 'flashcard'
  | 'translation'
  | 'freehand'
  | 'sticky-note';

export interface BaseDrawingObject {
  id: string;
  type: DrawingObjectType;
  x: number;
  y: number;
  selected: boolean;
  zIndex: number;
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface FlashcardObject extends BaseDrawingObject {
  type: 'flashcard';
  flashcardId: string;
  width: number;
  height: number;
}

export interface TranslationObject extends BaseDrawingObject {
  type: 'translation';
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  width: number;
  height: number;
}

export interface FreehandObject extends BaseDrawingObject {
  type: 'freehand';
  points: Point[];
}

export interface StickyNoteObject extends BaseDrawingObject {
  type: 'sticky-note';
  text: string;
  width: number;
  height: number;
  paperColor: string;
  fontColor: string;
  fontSize: number;
}

export type DrawingObject = 
  | FlashcardObject
  | TranslationObject
  | FreehandObject
  | StickyNoteObject;

export type ToolType = 
  | 'select' 
  | 'flashcard'
  | 'translation'
  | 'freehand'
  | 'sticky-note';

export interface DrawingState {
  objects: DrawingObject[];
  selectedTool: ToolType;
  selectedObjectIds: string[];
}

export interface CreateObjectData {
  type: DrawingObjectType;
  startPoint: Point;
  endPoint?: Point;
  text?: string;
  flashcardId?: string;
}

// ===== DATABASE INTEGRATION UTILITIES =====

import type { 
  MovieCanvasRecord, 
  CanvasObjectRecord, 
  CreateCanvasObjectData 
} from './database';

/**
 * Convert UI Canvas to Database Canvas Record data
 */
export function canvasToRecord(canvas: Canvas, movieId: string): {
  title: string;
  movie_id: string;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  object_count: number;
} {
  return {
    title: canvas.title,
    movie_id: movieId,
    viewport_x: canvas.viewport?.x ?? 0,
    viewport_y: canvas.viewport?.y ?? 0,
    viewport_zoom: canvas.viewport?.zoom ?? 1,
    object_count: canvas.objects.length,
  };
}

/**
 * Convert Database Canvas Record to UI Canvas
 */
export function recordToCanvas(record: MovieCanvasRecord, objects: DrawingObject[] = []): Canvas {
  return {
    id: record.id,
    title: record.title,
    createdAt: new Date(record.created),
    lastModified: new Date(record.updated),
    objects,
    viewport: {
      x: record.viewport_x,
      y: record.viewport_y,
      zoom: record.viewport_zoom,
    },
  };
}

/**
 * Convert UI Drawing Object to Database Object Record data
 */
export function drawingObjectToRecord(object: DrawingObject, canvasId: string): CreateCanvasObjectData {
  // Special case for flashcards - only store flashcardId
  if (object.type === 'flashcard') {
    return {
      canvas_id: canvasId,
      type: object.type,
      x: object.x,
      y: object.y,
      z_index: object.zIndex,
      object_data: {
        flashcardId: (object as FlashcardObject).flashcardId,
      },
      complexity_score: calculateComplexityScore(object),
    };
  }

  // For all other object types, include common properties
  return {
    canvas_id: canvasId,
    type: object.type,
    x: object.x,
    y: object.y,
    z_index: object.zIndex,
    object_data: {
      // Common properties
      selected: object.selected,
      style: object.style,
      
      // Type-specific properties
      ...(object.type === 'freehand' && {
        points: (object as FreehandObject).points,
      }),
      ...(object.type === 'sticky-note' && {
        text: (object as StickyNoteObject).text,
        width: (object as StickyNoteObject).width,
        height: (object as StickyNoteObject).height,
        paperColor: (object as StickyNoteObject).paperColor,
        fontColor: (object as StickyNoteObject).fontColor,
        fontSize: (object as StickyNoteObject).fontSize,
      }),
      ...(object.type === 'translation' && {
        text: (object as TranslationObject).text,
        sourceLanguage: (object as TranslationObject).sourceLanguage,
        targetLanguage: (object as TranslationObject).targetLanguage,
        width: (object as TranslationObject).width,
        height: (object as TranslationObject).height,
      }),
    },
    complexity_score: calculateComplexityScore(object),
  };
}

/**
 * Convert Database Object Record to UI Drawing Object
 */
export function recordToDrawingObject(record: CanvasObjectRecord): DrawingObject {
  // Special case for flashcards - they don't have selected/style in object_data
  if (record.type === 'flashcard') {
    return {
      id: record.id,
      type: 'flashcard',
      x: record.x,
      y: record.y,
      zIndex: record.z_index,
      selected: false, // Default value since not stored
      style: {}, // Default value since not stored
      flashcardId: record.object_data.flashcardId ?? '',
      width: 650, // Fixed width as defined in DrawingCanvas
      height: 560, // Fixed height as defined in DrawingCanvas
    } as FlashcardObject;
  }

  // For all other object types, include common properties from object_data
  const baseObject = {
    id: record.id,
    type: record.type,
    x: record.x,
    y: record.y,
    zIndex: record.z_index,
    selected: record.object_data.selected ?? false,
    style: record.object_data.style ?? {},
  };

  switch (record.type) {
    case 'freehand':
      return {
        ...baseObject,
        type: 'freehand',
        points: record.object_data.points ?? [],
      } as FreehandObject;

    case 'sticky-note':
      return {
        ...baseObject,
        type: 'sticky-note',
        text: record.object_data.text ?? '',
        width: record.object_data.width ?? 200,
        height: record.object_data.height ?? 150,
        paperColor: record.object_data.paperColor ?? '#ffeb3b',
        fontColor: record.object_data.fontColor ?? '#000000',
        fontSize: record.object_data.fontSize ?? 14,
      } as StickyNoteObject;

    case 'translation':
      return {
        ...baseObject,
        type: 'translation',
        text: record.object_data.text ?? '',
        sourceLanguage: record.object_data.sourceLanguage ?? 'en',
        targetLanguage: record.object_data.targetLanguage ?? 'de',
        width: record.object_data.width ?? 250,
        height: record.object_data.height ?? 180,
      } as TranslationObject;

    default:
      throw new Error(`Unknown object type: ${record.type}`);
  }
}

/**
 * Calculate complexity score for performance optimization
 */
function calculateComplexityScore(object: DrawingObject): number {
  switch (object.type) {
    case 'freehand':
      return (object as FreehandObject).points.length;
    case 'sticky-note':
      return (object as StickyNoteObject).text.length;
    case 'translation':
      return (object as TranslationObject).text.length;
    case 'flashcard':
      return 10; // Fixed complexity for flashcards
    default:
      return 1;
  }
}
