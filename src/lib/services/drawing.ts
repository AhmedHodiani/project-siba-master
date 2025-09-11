import { DrawingObject, Point, Bounds, CreateObjectData } from '../types/drawing';

export class DrawingUtils {
  // Generate unique ID for drawing objects
  static generateId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Convert screen coordinates to world coordinates
  static screenToWorld(
    screenPoint: Point,
    viewport: { x: number; y: number; zoom: number },
    canvasSize: { width: number; height: number }
  ): Point {
    return {
      x: viewport.x + (screenPoint.x - canvasSize.width / 2) / viewport.zoom,
      y: viewport.y + (screenPoint.y - canvasSize.height / 2) / viewport.zoom
    };
  }

  // Convert world coordinates to screen coordinates
  static worldToScreen(
    worldPoint: Point,
    viewport: { x: number; y: number; zoom: number },
    canvasSize: { width: number; height: number }
  ): Point {
    return {
      x: (worldPoint.x - viewport.x) * viewport.zoom + canvasSize.width / 2,
      y: (worldPoint.y - viewport.y) * viewport.zoom + canvasSize.height / 2
    };
  }

  // Create a new drawing object from creation data
  static createObject(data: CreateObjectData): DrawingObject {
    const baseObject = {
      id: this.generateId(),
      x: data.startPoint.x,
      y: data.startPoint.y,
      selected: false,
      zIndex: 0,
      style: {
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 1
      }
    };

    switch (data.type) {
      case 'flashcard':
        return {
          ...baseObject,
          type: 'flashcard',
          flashcardId: data.flashcardId || '',
          width: 650, // Larger width for better content display
          height: 560, // Taller height for better video and metadata display
          style: {
            ...baseObject.style,
            fill: '#f0f0f0',
            stroke: '#007acc'
          }
        };

      case 'translation':
        return {
          ...baseObject,
          type: 'translation',
          text: '',
          sourceLanguage: 'de',
          targetLanguage: 'en',
          width: 450,
          height: 560,
          style: {
            ...baseObject.style,
            fill: 'rgba(15, 15, 15, 0.95)',
            stroke: '#333'
          }
        };

      case 'freehand':
        return {
          ...baseObject,
          type: 'freehand',
          points: [data.startPoint],
          style: {
            ...baseObject.style,
            fill: 'none',
            stroke: '#000000',
            strokeWidth: 2
          }
        };

      case 'sticky-note':
        return {
          ...baseObject,
          type: 'sticky-note',
          text: 'New note',
          width: 200,
          height: 200,
          paperColor: '#ffd700', // Default yellow sticky note color
          fontColor: '#333333',
          fontSize: 16,
          style: {
            ...baseObject.style,
            fill: '#ffd700',
            stroke: '#e6c200'
          }
        };

      case 'image':
        return {
          ...baseObject,
          type: 'image',
          width: 200,
          height: 200,
          originalWidth: 200,
          originalHeight: 200,
          fileName: undefined,
          style: {
            ...baseObject.style,
            fill: 'transparent',
            stroke: 'transparent'
          }
        };

      default:
        throw new Error(`Unknown object type: ${data.type}`);
    }
  }

  // Get bounding box for any drawing object
  static getBounds(obj: DrawingObject): Bounds {
    switch (obj.type) {
      case 'flashcard':
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height
        };

      case 'translation':
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height
        };

      case 'freehand':
        if (obj.points.length === 0) {
          return { x: obj.x, y: obj.y, width: 10, height: 10 };
        }
        const xCoords = obj.points.map(p => p.x);
        const yCoords = obj.points.map(p => p.y);
        const freehandMinX = Math.min(...xCoords);
        const freehandMinY = Math.min(...yCoords);
        const freehandMaxX = Math.max(...xCoords);
        const freehandMaxY = Math.max(...yCoords);
        return {
          x: freehandMinX - 5, // Add padding for easier selection
          y: freehandMinY - 5,
          width: (freehandMaxX - freehandMinX) + 10,
          height: (freehandMaxY - freehandMinY) + 10
        };

      case 'sticky-note':
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height
        };

      case 'image':
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height
        };

      default:
        return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  // Check if point is inside object bounds
  static isPointInObject(point: Point, obj: DrawingObject): boolean {
    const bounds = this.getBounds(obj);
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  // Check if object intersects with rectangle (for rectangle selection)
  static isObjectInRectangle(obj: DrawingObject, rectMinX: number, rectMinY: number, rectMaxX: number, rectMaxY: number): boolean {
    const bounds = this.getBounds(obj);
    const objMinX = bounds.x;
    const objMinY = bounds.y;
    const objMaxX = bounds.x + bounds.width;
    const objMaxY = bounds.y + bounds.height;

    // Check if rectangles intersect (not just if object center is inside selection)
    return !(objMaxX < rectMinX || objMinX > rectMaxX || objMaxY < rectMinY || objMinY > rectMaxY);
  }

  // Sort objects by z-index for proper rendering order
  static sortByZIndex(objects: DrawingObject[]): DrawingObject[] {
    return [...objects].sort((a, b) => a.zIndex - b.zIndex);
  }
}
