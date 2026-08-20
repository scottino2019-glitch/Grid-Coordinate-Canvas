import React from 'react';
import { Point, GridConfig, ToolType } from '../types';
import { canvasToUserCoord, calculateDistance, calculateAngle, formatCoordString } from '../utils/coordinateMath';
import { Crosshair, MoveRight, CornerDownRight, Compass, Ruler, Hash } from 'lucide-react';

interface LiveCoordinateHUDProps {
  cursorCanvasPos: Point | null;
  drawingStartPos: Point | null;
  currentPoints: Point[];
  activeTool: ToolType;
  isDrawing: boolean;
  canvasWidth: number;
  canvasHeight: number;
  config: GridConfig;
  cursorScreenPos: { x: number; y: number } | null;
}

export const LiveCoordinateHUD: React.FC<LiveCoordinateHUDProps> = ({
  cursorCanvasPos,
  drawingStartPos,
  currentPoints,
  activeTool,
  isDrawing,
  canvasWidth,
  canvasHeight,
  config,
  cursorScreenPos,
}) => {
  if (!config.showLiveHUD || !cursorCanvasPos) return null;

  const currentU = canvasToUserCoord(cursorCanvasPos, canvasWidth, canvasHeight, config);
  const startU = drawingStartPos
    ? canvasToUserCoord(drawingStartPos, canvasWidth, canvasHeight, config)
    : null;

  // Active stroke measurements
  const distance = drawingStartPos ? calculateDistance(drawingStartPos, cursorCanvasPos) : 0;
  const convertedDistance = config.unit === 'grid'
    ? Math.round((distance / config.size) * 100) / 100
    : config.unit === 'mm'
    ? Math.round(distance * 0.264583 * 10) / 10
    : config.unit === 'cm'
    ? Math.round(distance * 0.0264583 * 100) / 100
    : Math.round(distance);

  const angle = drawingStartPos
    ? calculateAngle(drawingStartPos, cursorCanvasPos, config.originMode !== 'top-left')
    : 0;

  const deltaX = startU ? Math.round((currentU.x - startU.x) * 100) / 100 : 0;
  const deltaY = startU ? Math.round((currentU.y - startU.y) * 100) / 100 : 0;

  return (
    <>
      {/* Main Bottom HUD Bar (Docked at the bottom, never floating over the sheet) */}
      <div
        id="coordinate-hud-bar"
        className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-white text-[#141414] border-2 border-[#141414] px-3 py-1.5 shadow-[3px_3px_0px_#141414] z-30 font-mono text-xs flex items-center gap-3 flex-wrap max-w-2xl pointer-events-auto select-none"
      >
        {/* Live Cursor Position */}
        <div className="flex items-center gap-1.5 bg-[#E4E3E0] px-2 py-0.5 border border-[#141414]">
          <Crosshair className="w-3.5 h-3.5 text-[#141414]" />
          <span className="text-[#666666] text-[10px] uppercase font-bold">COORD:</span>
          <span className="text-[#141414] font-bold">X: {currentU.x}</span>
          <span className="text-[#999999]">,</span>
          <span className="text-[#141414] font-bold">Y: {currentU.y}</span>
          <span className="text-[#666666] text-[10px] uppercase font-bold">({config.unit === 'grid' ? 'u' : config.unit})</span>
        </div>

        {/* Dynamic Stroke Details when drawing */}
        {isDrawing && startU ? (
          <div className="flex items-center gap-2.5 bg-[#141414] text-white border border-[#141414] px-2.5 py-0.5">
            {/* Start Point */}
            <div className="flex items-center gap-1">
              <CornerDownRight className="w-3 h-3 text-sky-300" />
              <span className="text-neutral-400 text-[10px] uppercase">START:</span>
              <span className="text-white font-bold">{formatCoordString(startU, config.unit)}</span>
            </div>

            {/* Delta X / Delta Y */}
            <div className="flex items-center gap-1 text-[11px]">
              <MoveRight className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 font-bold">ΔX:{deltaX >= 0 ? `+${deltaX}` : deltaX}</span>
              <span className="text-amber-300 font-bold">ΔY:{deltaY >= 0 ? `+${deltaY}` : deltaY}</span>
            </div>

            {/* Distance */}
            <div className="flex items-center gap-1">
              <Ruler className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-bold">
                L:{convertedDistance}{config.unit === 'grid' ? 'u' : config.unit}
              </span>
            </div>

            {/* Angle */}
            <div className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-violet-300" />
              <span className="text-violet-200 font-bold">{angle}°</span>
            </div>

            {/* Vertices count for polyline */}
            {activeTool === 'polyline' && (
              <div className="flex items-center gap-1 text-cyan-300">
                <Hash className="w-3 h-3 text-cyan-400" />
                <span className="font-bold">PTS:{currentPoints.length + 1}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2.5 text-[#666666] text-[11px] uppercase font-mono">
            <span>ORIGIN: <strong className="text-[#141414]">{config.originMode}</strong></span>
            <span>•</span>
            <span>GRID: <strong className="text-[#141414]">{config.size}px</strong></span>
            <span>•</span>
            <span>SNAP: <strong className={config.snap ? 'text-[#141414]' : 'text-neutral-500'}>{config.snap ? 'ON' : 'OFF'}</strong></span>
          </div>
        )}
      </div>
    </>
  );
};
