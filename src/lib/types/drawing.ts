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
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'text' 
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

export interface RectangleObject extends BaseDrawingObject {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface CircleObject extends BaseDrawingObject {
  type: 'circle';
  radius: number;
}

export interface LineObject extends BaseDrawingObject {
  type: 'line';
  endX: number;
  endY: number;
}

export interface TextObject extends BaseDrawingObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
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
  | RectangleObject 
  | CircleObject 
  | LineObject 
  | TextObject 
  | FlashcardObject
  | TranslationObject
  | FreehandObject;

export type ToolType = 
  | 'select' 
  | 'rectangle' 
  | 'circle' 
  | 'line' 
  | 'text' 
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
