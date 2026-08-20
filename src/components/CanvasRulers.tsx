import React, { useMemo } from 'react';
import { GridConfig, Point, ViewportTransform } from '../types';
import { canvasToUserCoord } from '../utils/coordinateMath';

interface CanvasRulersProps {
  canvasWidth: number;
  canvasHeight: number;
  config: GridConfig;
  transform: ViewportTransform;
  cursorCanvasPos: Point | null;
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({
  canvasWidth,
  canvasHeight,
  config,
  transform,
  cursorCanvasPos,
}) => {
  const RULER_SIZE = 24; // height of top ruler & width of left ruler

  // Generate top ruler tick marks
  const topTicks = useMemo(() => {
    const ticks: { pos: number; label?: string; isMajor: boolean; isOrigin: boolean }[] = [];
    const step = config.size;
    if (step <= 0) return ticks;

    // Origin X in canvas pixels
    let originX = 0;
    if (config.originMode === 'center') originX = canvasWidth / 2;

    // Find start and end in canvas units
    for (let x = 0; x <= canvasWidth; x += step) {
      const isOrigin = Math.abs(x - originX) < 0.1;
      const isMajor = (Math.round((x - originX) / step) % 5 === 0) || isOrigin;
      const userPoint = canvasToUserCoord({ x, y: 0 }, canvasWidth, canvasHeight, config);
      ticks.push({
        pos: x,
        label: isMajor ? `${userPoint.x}` : undefined,
        isMajor,
        isOrigin,
      });
    }
    return ticks;
  }, [canvasWidth, canvasHeight, config]);

  // Generate left ruler tick marks
  const leftTicks = useMemo(() => {
    const ticks: { pos: number; label?: string; isMajor: boolean; isOrigin: boolean }[] = [];
    const step = config.size;
    if (step <= 0) return ticks;

    // Origin Y in canvas pixels
    let originY = 0;
    if (config.originMode === 'center') originY = canvasHeight / 2;
    else if (config.originMode === 'bottom-left') originY = canvasHeight;

    for (let y = 0; y <= canvasHeight; y += step) {
      const isOrigin = Math.abs(y - originY) < 0.1;
      const isMajor = (Math.round((y - originY) / step) % 5 === 0) || isOrigin;
      const userPoint = canvasToUserCoord({ x: 0, y }, canvasWidth, canvasHeight, config);
      ticks.push({
        pos: y,
        label: isMajor ? `${userPoint.y}` : undefined,
        isMajor,
        isOrigin,
      });
    }
    return ticks;
  }, [canvasWidth, canvasHeight, config]);

  if (!config.showRulers) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden font-mono text-[10px]">
      {/* Corner Box (0,0 info / unit badge) */}
      <div
        id="ruler-corner"
        className="absolute top-0 left-0 bg-[#141414] text-white font-bold flex items-center justify-center border-r-2 border-b-2 border-[#141414] z-20"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
        title={`Unit: ${config.unit} | Origin: ${config.originMode}`}
      >
        <span className="text-[9px] uppercase tracking-tighter">
          {config.unit === 'grid' ? 'u' : config.unit}
        </span>
      </div>

      {/* Top Horizontal Ruler */}
      <div
        id="ruler-horizontal"
        className="absolute top-0 right-0 bg-[#E4E3E0]/95 text-[#141414] border-b-2 border-[#141414] backdrop-blur-xs overflow-hidden"
        style={{
          left: RULER_SIZE,
          height: RULER_SIZE,
        }}
      >
        <div
          className="relative h-full"
          style={{
            transform: `translateX(${transform.offsetX}px) scaleX(${transform.zoom})`,
            transformOrigin: '0 0',
            width: canvasWidth,
          }}
        >
          {topTicks.map((t, idx) => (
            <div
              key={`top-${idx}`}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${t.pos}px` }}
            >
              <div
                className={`w-[1px] ${
                  t.isOrigin
                    ? 'h-full bg-[#141414] w-[2px]'
                    : t.isMajor
                    ? 'h-3 bg-[#141414]'
                    : 'h-1.5 bg-[#888888]'
                }`}
              />
              {t.label && (
                <span
                  className={`mt-0.5 transform -translate-x-1/2 text-[9px] font-mono leading-none whitespace-nowrap ${
                    t.isOrigin ? 'text-[#141414] font-black' : 'text-[#333333] font-semibold'
                  }`}
                >
                  {t.label}
                </span>
              )}
            </div>
          ))}

          {/* Mouse pointer tracker on top ruler */}
          {cursorCanvasPos && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-600 transition-transform duration-75"
              style={{
                transform: `translateX(${cursorCanvasPos.x}px)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Left Vertical Ruler */}
      <div
        id="ruler-vertical"
        className="absolute bottom-0 left-0 bg-[#E4E3E0]/95 text-[#141414] border-r-2 border-[#141414] backdrop-blur-xs overflow-hidden"
        style={{
          top: RULER_SIZE,
          width: RULER_SIZE,
        }}
      >
        <div
          className="relative w-full"
          style={{
            transform: `translateY(${transform.offsetY}px) scaleY(${transform.zoom})`,
            transformOrigin: '0 0',
            height: canvasHeight,
          }}
        >
          {leftTicks.map((t, idx) => (
            <div
              key={`left-${idx}`}
              className="absolute left-0 flex items-center justify-end"
              style={{ top: `${t.pos}px`, width: RULER_SIZE }}
            >
              {t.label && (
                <span
                  className={`mr-1 text-[8px] font-mono transform -rotate-90 origin-right whitespace-nowrap ${
                    t.isOrigin ? 'text-[#141414] font-black' : 'text-[#333333] font-semibold'
                  }`}
                >
                  {t.label}
                </span>
              )}
              <div
                className={`h-[1px] ${
                  t.isOrigin
                    ? 'w-full bg-[#141414] h-[2px]'
                    : t.isMajor
                    ? 'w-3 bg-[#141414]'
                    : 'w-1.5 bg-[#888888]'
                }`}
              />
            </div>
          ))}

          {/* Mouse pointer tracker on left ruler */}
          {cursorCanvasPos && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-red-600 transition-transform duration-75"
              style={{
                transform: `translateY(${cursorCanvasPos.y}px)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
