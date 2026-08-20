export type ToolType = 'pencil' | 'line' | 'polyline' | 'rect' | 'circle' | 'marker' | 'eraser' | 'select';

export type OriginMode = 'top-left' | 'center' | 'bottom-left';
export type UnitType = 'px' | 'grid' | 'mm' | 'cm';

export interface Point {
  x: number;
  y: number;
}

export interface GridPoint extends Point {
  canvasX: number;
  canvasY: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  width: number;
  points: Point[]; // stored in canvas coordinates (logical canvas units)
  completed: boolean;
  timestamp: number;
  name?: string;
  fill?: string;
}

export interface GridConfig {
  size: number; // grid step in canvas pixels (e.g. 20, 25, 50)
  subdivisions: number;
  snap: boolean;
  showGrid: boolean;
  showRulers: boolean;
  showCoordinatesOnCanvas: boolean;
  showLiveHUD: boolean;
  showMeasurements: boolean;
  originMode: OriginMode;
  unit: UnitType;
  unitScale: number; // factor to convert grid unit to chosen unit
}

export interface ViewportTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ActiveDrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  currentPoints: Point[];
}
