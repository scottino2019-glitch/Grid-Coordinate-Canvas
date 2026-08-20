import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Stroke,
  Point,
  ToolType,
  GridConfig,
  ViewportTransform,
} from '../types';
import {
  canvasToUserCoord,
  snapPointToGrid,
  calculateDistance,
  calculateAngle,
  formatCoordString,
} from '../utils/coordinateMath';

interface GridCanvasProps {
  strokes: Stroke[];
  onAddStroke: (stroke: Stroke) => void;
  onUpdateStroke: (stroke: Stroke) => void;
  onDeleteStroke: (id: string) => void;
  selectedStrokeId: string | null;
  onSelectStroke: (id: string | null) => void;
  activeTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  config: GridConfig;
  transform: ViewportTransform;
  setTransform: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  onCursorMove: (canvasPos: Point | null, screenPos: { x: number; y: number } | null) => void;
  onDrawingStateChange: (isDrawing: boolean, startPos: Point | null, currentPoints: Point[]) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
}

export const GridCanvas: React.FC<GridCanvasProps> = ({
  strokes,
  onAddStroke,
  onUpdateStroke,
  onDeleteStroke,
  selectedStrokeId,
  onSelectStroke,
  activeTool,
  strokeColor,
  strokeWidth,
  config,
  transform,
  setTransform,
  onCursorMove,
  onDrawingStateChange,
  canvasRef,
  canvasWidth,
  canvasHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  const activePointsRef = useRef<Point[]>([]);
  const drawingStartRef = useRef<Point | null>(null);
  const [activePolylinePoints, setActivePolylinePoints] = useState<Point[]>([]);

  // Convert screen client coordinates to canvas coordinate space taking zoom and pan into account
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (clientX - rect.left) / transform.zoom;
      const rawY = (clientY - rect.top) / transform.zoom;

      // Apply snapping if active
      return snapPointToGrid(
        { x: rawX, y: rawY },
        config.size,
        canvasWidth,
        canvasHeight,
        config.originMode,
        config.snap
      );
    },
    [canvasRef, transform.zoom, config.size, canvasWidth, canvasHeight, config.originMode, config.snap]
  );

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom
    ctx.scale(transform.zoom, transform.zoom);

    // 1. Draw Grid
    if (config.showGrid && config.size > 0) {
      const step = config.size;

      // Minor grid lines
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = '#e5e5e5';
      ctx.beginPath();
      for (let x = 0; x <= canvasWidth; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let y = 0; y <= canvasHeight; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
      }
      ctx.stroke();

      // Major grid lines (every 5 steps)
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#d4d4d4';
      ctx.beginPath();
      for (let x = 0; x <= canvasWidth; x += step * 5) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
      }
      for (let y = 0; y <= canvasHeight; y += step * 5) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
      }
      ctx.stroke();

      // Coordinate Origin Axes
      let ox = 0;
      let oy = 0;
      if (config.originMode === 'center') {
        ox = canvasWidth / 2;
        oy = canvasHeight / 2;
      } else if (config.originMode === 'bottom-left') {
        ox = 0;
        oy = canvasHeight;
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#141414';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      // Y-axis
      ctx.moveTo(ox, 0);
      ctx.lineTo(ox, canvasHeight);
      // X-axis
      ctx.moveTo(0, oy);
      ctx.lineTo(canvasWidth, oy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Origin Pin Marker (0,0)
      ctx.fillStyle = '#141414';
      ctx.beginPath();
      ctx.arc(ox, oy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Committed Strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      const isSelected = selectedStrokeId === stroke.id;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Highlight selected stroke
      if (isSelected) {
        ctx.shadowColor = '#6366f1';
        ctx.shadowBlur = 10;
        ctx.lineWidth = stroke.width + 2;
      }

      if (stroke.tool === 'line' && stroke.points.length >= 2) {
        const [p1, p2] = stroke.points;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (stroke.tool === 'rect' && stroke.points.length >= 2) {
        const [p1, p2] = stroke.points;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        ctx.strokeRect(x, y, w, h);
      } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
        const [p1, p2] = stroke.points;
        const r = calculateDistance(p1, p2);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (stroke.tool === 'marker') {
        stroke.points.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      } else {
        // Freehand pencil or polyline
        ctx.beginPath();
        stroke.points.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }

      ctx.restore();

      // 3. Draw on-canvas Coordinate Labels only if user explicitly turned on `showCoordinatesOnCanvas` in settings
      if (config.showCoordinatesOnCanvas) {
        if (stroke.tool === 'marker') {
          // Render pinpoint for marker tool if labels are enabled
          const p = stroke.points[0];
          if (p) {
            const userCoord = canvasToUserCoord(p, canvasWidth, canvasHeight, config);
            const label = formatCoordString(userCoord, config.unit);

            ctx.font = 'bold 9px monospace';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
            ctx.beginPath();
            ctx.rect(p.x + 8, p.y - 8, textWidth + 6, 13);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, p.x + 11, p.y + 2);
          }
        } else {
          // For geometric shapes/lines: show vertices labels only when config.showCoordinatesOnCanvas is ON
          stroke.points.forEach((p, pIdx) => {
            if (
              stroke.tool === 'pencil' &&
              pIdx !== 0 &&
              pIdx !== stroke.points.length - 1
            ) {
              return;
            }

            const userCoord = canvasToUserCoord(p, canvasWidth, canvasHeight, config);
            const label = formatCoordString(userCoord, config.unit);

            ctx.font = 'bold 8.5px monospace';
            const textWidth = ctx.measureText(label).width;
            const badgeX = p.x + 6;
            const badgeY = p.y - 4;

            ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
            ctx.beginPath();
            ctx.rect(badgeX - 2, badgeY - 8, textWidth + 4, 11);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, badgeX, badgeY + 1);
          });
        }
      }
    });

    // 4. Draw Active In-Progress Polyline
    if (activePolylinePoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      activePolylinePoints.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Active In-Progress Stroke Ghost (Clean and Unobstructed)
    if (isDrawing && drawingStartRef.current && activePointsRef.current.length > 0) {
      const p1 = drawingStartRef.current;
      const p2 = activePointsRef.current[activePointsRef.current.length - 1];

      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'line') {
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (activeTool === 'rect') {
        ctx.setLineDash([4, 3]);
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      } else if (activeTool === 'circle') {
        ctx.setLineDash([4, 3]);
        const r = calculateDistance(p1, p2);
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (activeTool === 'pencil') {
        ctx.beginPath();
        activePointsRef.current.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }

      // Small subtle anchor points on start and cursor (no blocking text boxes on canvas)
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }, [
    canvasRef,
    transform.zoom,
    config,
    canvasWidth,
    canvasHeight,
    strokes,
    selectedStrokeId,
    activePolylinePoints,
    isDrawing,
    activeTool,
    strokeColor,
    strokeWidth,
  ]);

  // Redraw whenever relevant state changes
  useEffect(() => {
    render();
  }, [render]);

  // Handle Mouse / Touch Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Space or middle button => Pan
    if (e.button === 1 || e.spaceKey || activeTool === 'select' && e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.offsetX, y: e.clientY - transform.offsetY });
      return;
    }

    if (e.button !== 0) return; // Only primary mouse button

    const pt = screenToCanvas(e.clientX, e.clientY);

    if (activeTool === 'select') {
      // Find clicked stroke
      const clicked = [...strokes].reverse().find((s) => {
        return s.points.some((p) => calculateDistance(p, pt) <= 15);
      });
      onSelectStroke(clicked ? clicked.id : null);
      return;
    }

    if (activeTool === 'eraser') {
      const clicked = [...strokes].reverse().find((s) => {
        return s.points.some((p) => calculateDistance(p, pt) <= 20);
      });
      if (clicked) {
        onDeleteStroke(clicked.id);
      }
      return;
    }

    if (activeTool === 'marker') {
      // Create instant marker point
      const newStroke: Stroke = {
        id: `marker-${Date.now()}`,
        tool: 'marker',
        color: strokeColor,
        width: strokeWidth,
        points: [pt],
        completed: true,
        timestamp: Date.now(),
      };
      onAddStroke(newStroke);
      return;
    }

    if (activeTool === 'polyline') {
      // Add point to polyline
      const updatedPoints = [...activePolylinePoints, pt];
      setActivePolylinePoints(updatedPoints);
      onDrawingStateChange(true, updatedPoints[0], updatedPoints);
      return;
    }

    // Standard drawing tools (pencil, line, rect, circle)
    setIsDrawing(true);
    drawingStartRef.current = pt;
    activePointsRef.current = [pt];
    onDrawingStateChange(true, pt, [pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = screenToCanvas(e.clientX, e.clientY);
    onCursorMove(pt, { x: e.clientX, y: e.clientY });

    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        offsetX: e.clientX - panStart.x,
        offsetY: e.clientY - panStart.y,
      }));
      return;
    }

    if (!isDrawing || !drawingStartRef.current) return;

    if (activeTool === 'pencil') {
      // Freehand accumulation
      const lastPoint = activePointsRef.current[activePointsRef.current.length - 1];
      if (!lastPoint || calculateDistance(lastPoint, pt) >= 3) {
        activePointsRef.current.push(pt);
        onDrawingStateChange(true, drawingStartRef.current, activePointsRef.current);
        render();
      }
    } else {
      // Geometric shapes (line, rect, circle)
      activePointsRef.current = [drawingStartRef.current, pt];
      onDrawingStateChange(true, drawingStartRef.current, activePointsRef.current);
      render();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !drawingStartRef.current) return;

    const endPt = screenToCanvas(e.clientX, e.clientY);

    let finalPoints: Point[] = [];
    if (activeTool === 'pencil') {
      finalPoints = [...activePointsRef.current];
    } else {
      finalPoints = [drawingStartRef.current, endPt];
    }

    if (finalPoints.length > 0) {
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}`,
        tool: activeTool,
        color: strokeColor,
        width: strokeWidth,
        points: finalPoints,
        completed: true,
        timestamp: Date.now(),
      };
      onAddStroke(newStroke);
    }

    setIsDrawing(false);
    drawingStartRef.current = null;
    activePointsRef.current = [];
    onDrawingStateChange(false, null, []);
    render();
  };

  const handlePointerLeave = () => {
    onCursorMove(null, null);
    if (isDrawing) {
      setIsDrawing(false);
      drawingStartRef.current = null;
      activePointsRef.current = [];
      onDrawingStateChange(false, null, []);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Complete Polyline on double click or Enter key
  const handleDoubleClick = () => {
    if (activeTool === 'polyline' && activePolylinePoints.length >= 2) {
      const newStroke: Stroke = {
        id: `polyline-${Date.now()}`,
        tool: 'polyline',
        color: strokeColor,
        width: strokeWidth,
        points: activePolylinePoints,
        completed: true,
        timestamp: Date.now(),
      };
      onAddStroke(newStroke);
      setActivePolylinePoints([]);
      onDrawingStateChange(false, null, []);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePolylinePoints.length > 0) {
          setActivePolylinePoints([]);
          onDrawingStateChange(false, null, []);
        }
        onSelectStroke(null);
      } else if (e.key === 'Enter') {
        if (activeTool === 'polyline' && activePolylinePoints.length >= 2) {
          const newStroke: Stroke = {
            id: `polyline-${Date.now()}`,
            tool: 'polyline',
            color: strokeColor,
            width: strokeWidth,
            points: activePolylinePoints,
            completed: true,
            timestamp: Date.now(),
          };
          onAddStroke(newStroke);
          setActivePolylinePoints([]);
          onDrawingStateChange(false, null, []);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, activePolylinePoints, strokeColor, strokeWidth, onAddStroke, onDrawingStateChange, onSelectStroke]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => {
      const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.25), 4);
      return { ...prev, zoom: newZoom };
    });
  };

  return (
    <div
      ref={containerRef}
      id="grid-canvas-viewport"
      className="relative w-full h-full overflow-hidden bg-[#E4E3E0] flex items-center justify-center select-none"
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        id="main-drawing-canvas"
        width={canvasWidth}
        height={canvasHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onDoubleClick={handleDoubleClick}
        className={`touch-none border-2 border-[#141414] bg-white shadow-[4px_4px_0px_#141414] ${
          activeTool === 'select'
            ? 'cursor-default'
            : activeTool === 'eraser'
            ? 'cursor-pointer'
            : 'cursor-crosshair'
        }`}
        style={{
          transform: `translate(${transform.offsetX}px, ${transform.offsetY}px)`,
        }}
      />
    </div>
  );
};
