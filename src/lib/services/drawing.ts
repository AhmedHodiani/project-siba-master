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
      case 'rectangle':
        const width = Math.abs((data.endPoint?.x || data.startPoint.x) - data.startPoint.x);
        const height = Math.abs((data.endPoint?.y || data.startPoint.y) - data.startPoint.y);
        return {
          ...baseObject,
          type: 'rectangle',
          width: Math.max(width, 10), // Minimum size
          height: Math.max(height, 10)
        };

      case 'circle':
        const radius = Math.max(
          Math.sqrt(
            Math.pow((data.endPoint?.x || data.startPoint.x) - data.startPoint.x, 2) +
            Math.pow((data.endPoint?.y || data.startPoint.y) - data.startPoint.y, 2)
          ),
          5 // Minimum radius
        );
        return {
          ...baseObject,
          type: 'circle',
          radius
        };

      case 'line':
        return {
          ...baseObject,
          type: 'line',
          endX: data.endPoint?.x || data.startPoint.x + 50,
          endY: data.endPoint?.y || data.startPoint.y,
          style: { ...baseObject.style, fill: 'none' }
        };

      case 'text':
        return {
          ...baseObject,
          type: 'text',
          text: data.text || 'Double-click to edit',
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          style: { ...baseObject.style, stroke: 'none', fill: '#000000' }
        };

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

      default:
        throw new Error(`Unknown object type: ${data.type}`);
    }
  }

  // Get bounding box for any drawing object
  static getBounds(obj: DrawingObject): Bounds {
    switch (obj.type) {
      case 'rectangle':
        return {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height
        };

      case 'circle':
        return {
          x: obj.x - obj.radius,
          y: obj.y - obj.radius,
          width: obj.radius * 2,
          height: obj.radius * 2
        };

      case 'line':
        const minX = Math.min(obj.x, obj.endX);
        const minY = Math.min(obj.y, obj.endY);
        const maxX = Math.max(obj.x, obj.endX);
        const maxY = Math.max(obj.y, obj.endY);
        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };

      case 'text':
        // Better text bounds calculation for multi-line support
        const lines = obj.text.split('\n');
        const longestLine = lines.reduce((longest, line) => 
          line.length > longest.length ? line : longest, '');
        const charWidth = obj.fontSize * 0.6;
        const textWidth = Math.max(longestLine.length * charWidth, 50); // Minimum clickable width
        const lineHeight = obj.fontSize * 1.2;
        const textHeight = lines.length * lineHeight;
        
        return {
          x: obj.x - 5, // Add small padding for easier selection
          y: obj.y - obj.fontSize - 5, // SVG text y is baseline, adjust for top
          width: textWidth + 10, // Add padding
          height: textHeight + 10 // Add padding
        };

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

      default:
        throw new Error(`Unknown object type: ${(obj as any).type}`);
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

  // Sort objects by z-index for proper rendering order
  static sortByZIndex(objects: DrawingObject[]): DrawingObject[] {
    return [...objects].sort((a, b) => a.zIndex - b.zIndex);
  }
}
