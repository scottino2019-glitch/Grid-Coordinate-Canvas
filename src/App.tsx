import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Stroke,
  ToolType,
  GridConfig,
  ViewportTransform,
  Point,
} from './types';
import { GridCanvas } from './components/GridCanvas';
import { CanvasRulers } from './components/CanvasRulers';
import { Toolbar } from './components/Toolbar';
import { CoordinateInspector } from './components/CoordinateInspector';
import { LiveCoordinateHUD } from './components/LiveCoordinateHUD';
import { CssCoordinatesModal } from './components/CssCoordinatesModal';
import {
  exportStrokesToCSV,
  exportStrokesToJSON,
  exportStrokesToSVG,
} from './utils/coordinateMath';

const DEFAULT_CONFIG: GridConfig = {
  size: 25,
  subdivisions: 5,
  snap: true,
  showGrid: true,
  showRulers: true,
  showCoordinatesOnCanvas: false,
  showLiveHUD: true,
  showMeasurements: true,
  originMode: 'top-left',
  unit: 'px',
  unitScale: 1,
};

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persistence Load
  const [strokes, setStrokes] = useState<Stroke[]>(() => {
    try {
      const saved = localStorage.getItem('grid_canvas_strokes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState<GridConfig>(() => {
    try {
      const saved = localStorage.getItem('grid_canvas_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CONFIG, ...parsed, showCoordinatesOnCanvas: false };
      }
      return DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Undo / Redo History
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Drawing state
  const [activeTool, setActiveTool] = useState<ToolType>('line');
  const [strokeColor, setStrokeColor] = useState<string>('#2563eb');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);

  // Inspector & HUD state
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [isCssModalOpen, setIsCssModalOpen] = useState<boolean>(false);
  const [cssModalStrokeId, setCssModalStrokeId] = useState<string | null>(null);
  const [cursorCanvasPos, setCursorCanvasPos] = useState<Point | null>(null);
  const [cursorScreenPos, setCursorScreenPos] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStartPos, setDrawingStartPos] = useState<Point | null>(null);
  const [currentDrawingPoints, setCurrentDrawingPoints] = useState<Point[]>([]);

  // Viewport Transform (Zoom & Pan)
  const [transform, setTransform] = useState<ViewportTransform>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('grid_canvas_strokes', JSON.stringify(strokes));
    } catch (err) {
      console.warn('Could not save strokes to localStorage', err);
    }
  }, [strokes]);

  useEffect(() => {
    try {
      localStorage.setItem('grid_canvas_config', JSON.stringify(config));
    } catch (err) {
      console.warn('Could not save config to localStorage', err);
    }
  }, [config]);

  // Stroke Management Handlers with Undo/Redo
  const handleAddStroke = useCallback((newStroke: Stroke) => {
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes((prev) => [...prev, newStroke]);
  }, [strokes]);

  const handleUpdateStroke = useCallback((updatedStroke: Stroke) => {
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes((prev) => prev.map((s) => (s.id === updatedStroke.id ? updatedStroke : s)));
  }, [strokes]);

  const handleDeleteStroke = useCallback((id: string) => {
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes((prev) => prev.filter((s) => s.id !== id));
    if (selectedStrokeId === id) {
      setSelectedStrokeId(null);
    }
  }, [strokes, selectedStrokeId]);

  const handleClearAll = useCallback(() => {
    if (strokes.length === 0) return;
    setHistory((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);
    setSelectedStrokeId(null);
  }, [strokes]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, strokes]);
    setStrokes(previous);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setSelectedStrokeId(null);
  }, [history, strokes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, strokes]);
    setStrokes(next);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setSelectedStrokeId(null);
  }, [redoStack, strokes]);

  // Zoom Helpers
  const handleZoomIn = () => {
    setTransform((prev) => ({ ...prev, zoom: Math.min(prev.zoom * 1.2, 4) }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({ ...prev, zoom: Math.max(prev.zoom / 1.2, 0.25) }));
  };

  const handleResetZoom = () => {
    setTransform({ zoom: 1, offsetX: 0, offsetY: 0 });
  };

  // Export handlers
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `grid-drawing-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  const handleExportSVG = () => {
    const svgString = exportStrokesToSVG(strokes, CANVAS_WIDTH, CANVAS_HEIGHT, config, true);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `grid-drawing-${Date.now()}.svg`;
    link.href = url;
    link.click();
  };

  const handleExportCSV = () => {
    const csv = exportStrokesToCSV(strokes, CANVAS_WIDTH, CANVAS_HEIGHT, config);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `coordinates-${Date.now()}.csv`;
    link.href = url;
    link.click();
  };

  const handleExportJSON = () => {
    const json = exportStrokesToJSON(strokes, CANVAS_WIDTH, CANVAS_HEIGHT, config);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `coordinates-${Date.now()}.json`;
    link.href = url;
    link.click();
  };

  // Keyboard Shortcuts Listener (Undo, Redo, Tools, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/selects
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedStrokeId) {
          e.preventDefault();
          handleDeleteStroke(selectedStrokeId);
        }
      }

      // Tool hotkeys
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'p':
          setActiveTool('pencil');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'k':
          setActiveTool('polyline');
          break;
        case 'r':
          setActiveTool('rect');
          break;
        case 'c':
          setActiveTool('circle');
          break;
        case 'm':
          setActiveTool('marker');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteStroke, selectedStrokeId]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#E4E3E0] text-[#141414] flex flex-col font-sans select-none">
      {/* Top Toolbar */}
      <Toolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        config={config}
        setConfig={setConfig}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearAll}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        zoom={transform.zoom}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onOpenCssModal={() => {
          setCssModalStrokeId(selectedStrokeId);
          setIsCssModalOpen(true);
        }}
      />

      {/* Main Canvas Viewport with Top and Left Rulers */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#E4E3E0] drafting-grid">
        <CanvasRulers
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          config={config}
          transform={transform}
          cursorCanvasPos={cursorCanvasPos}
        />

        <GridCanvas
          strokes={strokes}
          onAddStroke={handleAddStroke}
          onUpdateStroke={handleUpdateStroke}
          onDeleteStroke={handleDeleteStroke}
          selectedStrokeId={selectedStrokeId}
          onSelectStroke={setSelectedStrokeId}
          activeTool={activeTool}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          config={config}
          transform={transform}
          setTransform={setTransform}
          onCursorMove={(canvasPos, screenPos) => {
            setCursorCanvasPos(canvasPos);
            setCursorScreenPos(screenPos);
          }}
          onDrawingStateChange={(drawing, startPos, points) => {
            setIsDrawing(drawing);
            setDrawingStartPos(startPos);
            setCurrentDrawingPoints(points);
          }}
          canvasRef={canvasRef}
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
        />

        {/* Live Coordinate HUD */}
        <LiveCoordinateHUD
          cursorCanvasPos={cursorCanvasPos}
          drawingStartPos={drawingStartPos}
          currentPoints={currentDrawingPoints}
          activeTool={activeTool}
          isDrawing={isDrawing}
          canvasWidth={CANVAS_WIDTH}
          canvasHeight={CANVAS_HEIGHT}
          config={config}
          cursorScreenPos={cursorScreenPos}
        />
      </div>

      {/* Right Coordinate Inspector Panel */}
      <CoordinateInspector
        strokes={strokes}
        selectedStrokeId={selectedStrokeId}
        onSelectStroke={setSelectedStrokeId}
        onDeleteStroke={handleDeleteStroke}
        onClearAll={handleClearAll}
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        config={config}
        isOpen={inspectorOpen}
        onToggleOpen={() => setInspectorOpen(!inspectorOpen)}
        onOpenCssModal={(strokeId) => {
          setCssModalStrokeId(strokeId || selectedStrokeId);
          setIsCssModalOpen(true);
        }}
      />

      {/* CSS Coordinates Generator Modal */}
      <CssCoordinatesModal
        isOpen={isCssModalOpen}
        onClose={() => setIsCssModalOpen(false)}
        strokes={strokes}
        selectedStrokeId={cssModalStrokeId}
        canvasWidth={CANVAS_WIDTH}
        canvasHeight={CANVAS_HEIGHT}
        config={config}
      />
    </main>
  );
}
