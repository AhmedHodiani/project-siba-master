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

export type DrawingObjectType = 
  | 'flashcard'
  | 'translation'
  | 'freehand';

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

export type DrawingObject = 
  | FlashcardObject
  | TranslationObject
  | FreehandObject;

export type ToolType = 
  | 'select' 
  | 'flashcard'
  | 'translation'
  | 'freehand';

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
