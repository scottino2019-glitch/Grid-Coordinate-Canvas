import { Point, OriginMode, UnitType, Stroke, GridConfig } from '../types';

/**
 * Converts a raw canvas point (0,0 at canvas top-left) to user coordinates based on origin mode & unit.
 */
export function canvasToUserCoord(
  pt: Point,
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): Point {
  let ux = pt.x;
  let uy = pt.y;

  if (config.originMode === 'center') {
    ux = pt.x - canvasWidth / 2;
    uy = canvasHeight / 2 - pt.y; // Cartesian Y (up is positive)
  } else if (config.originMode === 'bottom-left') {
    ux = pt.x;
    uy = canvasHeight - pt.y; // Bottom is 0, Top is canvasHeight
  } else {
    // top-left
    ux = pt.x;
    uy = pt.y;
  }

  // Apply unit scaling
  if (config.unit === 'grid') {
    ux = ux / config.size;
    uy = uy / config.size;
  } else if (config.unit === 'mm') {
    // assume 96 dpi => 1 inch = 25.4mm => 1px ≈ 0.264583 mm
    const pxToMm = 0.264583;
    ux = ux * pxToMm;
    uy = uy * pxToMm;
  } else if (config.unit === 'cm') {
    const pxToCm = 0.0264583;
    ux = ux * pxToCm;
    uy = uy * pxToCm;
  }

  // Round to reasonable precision
  const precision = config.unit === 'px' ? 0 : 2;
  const factor = Math.pow(10, precision);
  return {
    x: Math.round(ux * factor) / factor,
    y: Math.round(uy * factor) / factor,
  };
}

/**
 * Converts user coordinate back to canvas pixel coordinate.
 */
export function userToCanvasCoord(
  uPt: Point,
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): Point {
  let cx = uPt.x;
  let cy = uPt.y;

  if (config.unit === 'grid') {
    cx = cx * config.size;
    cy = cy * config.size;
  } else if (config.unit === 'mm') {
    const mmToPx = 1 / 0.264583;
    cx = cx * mmToPx;
    cy = cy * mmToPx;
  } else if (config.unit === 'cm') {
    const cmToPx = 1 / 0.0264583;
    cx = cx * cmToPx;
    cy = cy * cmToPx;
  }

  if (config.originMode === 'center') {
    return {
      x: cx + canvasWidth / 2,
      y: canvasHeight / 2 - cy,
    };
  } else if (config.originMode === 'bottom-left') {
    return {
      x: cx,
      y: canvasHeight - cy,
    };
  }

  return { x: cx, y: cy };
}

/**
 * Snaps a canvas point to the nearest grid intersection if snap is active.
 */
export function snapPointToGrid(
  pt: Point,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number,
  originMode: OriginMode,
  enabled: boolean
): Point {
  if (!enabled || gridSize <= 0) return pt;

  let originX = 0;
  let originY = 0;

  if (originMode === 'center') {
    originX = canvasWidth / 2;
    originY = canvasHeight / 2;
  } else if (originMode === 'bottom-left') {
    originX = 0;
    originY = canvasHeight;
  }

  const snappedX = originX + Math.round((pt.x - originX) / gridSize) * gridSize;
  const snappedY = originY + Math.round((pt.y - originY) / gridSize) * gridSize;

  return { x: snappedX, y: snappedY };
}

/**
 * Calculate Euclidean distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle in degrees between two points (from p1 to p2)
 */
export function calculateAngle(p1: Point, p2: Point, isCartesian: boolean = false): number {
  const dx = p2.x - p1.x;
  const dy = isCartesian ? p2.y - p1.y : -(p2.y - p1.y); // invert screen dy so up is positive
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle * 10) / 10;
}

/**
 * Format coordinate point for UI display
 */
export function formatCoordString(p: Point, unit: UnitType = 'px'): string {
  const uLabel = unit === 'grid' ? 'u' : unit;
  return `(${p.x}${uLabel !== 'px' ? ' ' + uLabel : ''}, ${p.y}${uLabel !== 'px' ? ' ' + uLabel : ''})`;
}

/**
 * Export strokes list to CSV string of coordinates
 */
export function exportStrokesToCSV(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): string {
  const headers = ['Stroke ID', 'Stroke Name', 'Tool', 'Color', 'Point Index', `X (${config.unit})`, `Y (${config.unit})`, 'Canvas X (px)', 'Canvas Y (px)'];
  const rows: string[] = [headers.join(',')];

  strokes.forEach((stroke, strokeIdx) => {
    const strokeName = stroke.name || `Stroke #${strokeIdx + 1} (${stroke.tool})`;
    stroke.points.forEach((pt, ptIdx) => {
      const userCoord = canvasToUserCoord(pt, canvasWidth, canvasHeight, config);
      rows.push([
        stroke.id,
        `"${strokeName}"`,
        stroke.tool,
        stroke.color,
        (ptIdx + 1).toString(),
        userCoord.x.toString(),
        userCoord.y.toString(),
        Math.round(pt.x).toString(),
        Math.round(pt.y).toString(),
      ].join(','));
    });
  });

  return rows.join('\n');
}

/**
 * Export strokes as structured JSON
 */
export function exportStrokesToJSON(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): string {
  const data = {
    metadata: {
      generatedAt: new Date().toISOString(),
      canvasDimensions: { width: canvasWidth, height: canvasHeight },
      coordinateSystem: {
        originMode: config.originMode,
        unit: config.unit,
        gridSize: config.size,
      },
      totalStrokes: strokes.length,
    },
    strokes: strokes.map((s, idx) => ({
      id: s.id,
      index: idx + 1,
      name: s.name || `Stroke ${idx + 1}`,
      tool: s.tool,
      color: s.color,
      width: s.width,
      pointCount: s.points.length,
      coordinates: s.points.map((p) => {
        const u = canvasToUserCoord(p, canvasWidth, canvasHeight, config);
        return {
          userX: u.x,
          userY: u.y,
          canvasX: Math.round(p.x),
          canvasY: Math.round(p.y),
        };
      }),
    })),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Generate SVG with path definitions and coordinate labels
 */
export function exportStrokesToSVG(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig,
  includeGrid: boolean = true
): string {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">\n`;
  svgContent += `  <rect width="100%" height="100%" fill="#ffffff" />\n`;

  // Grid lines
  if (includeGrid && config.showGrid) {
    svgContent += `  <defs>\n`;
    svgContent += `    <pattern id="grid" width="${config.size}" height="${config.size}" patternUnits="userSpaceOnUse">\n`;
    svgContent += `      <path d="M ${config.size} 0 L 0 0 0 ${config.size}" fill="none" stroke="#e2e8f0" stroke-width="1" />\n`;
    svgContent += `    </pattern>\n`;
    svgContent += `  </defs>\n`;
    svgContent += `  <rect width="100%" height="100%" fill="url(#grid)" />\n`;

    // Origin axes
    let ox = 0;
    let oy = 0;
    if (config.originMode === 'center') {
      ox = canvasWidth / 2;
      oy = canvasHeight / 2;
    } else if (config.originMode === 'bottom-left') {
      ox = 0;
      oy = canvasHeight;
    }
    svgContent += `  <line x1="${ox}" y1="0" x2="${ox}" y2="${canvasHeight}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />\n`;
    svgContent += `  <line x1="0" y1="${oy}" x2="${canvasWidth}" y2="${oy}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />\n`;
  }

  // Draw strokes
  strokes.forEach((stroke) => {
    if (stroke.points.length === 0) return;

    if (stroke.tool === 'line' && stroke.points.length >= 2) {
      const p1 = stroke.points[0];
      const p2 = stroke.points[1];
      svgContent += `  <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" />\n`;
    } else if (stroke.tool === 'rect' && stroke.points.length >= 2) {
      const p1 = stroke.points[0];
      const p2 = stroke.points[1];
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      svgContent += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" />\n`;
    } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
      const p1 = stroke.points[0];
      const p2 = stroke.points[1];
      const r = calculateDistance(p1, p2);
      svgContent += `  <circle cx="${p1.x}" cy="${p1.y}" r="${r}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" />\n`;
    } else if (stroke.tool === 'marker') {
      stroke.points.forEach((p) => {
        svgContent += `  <circle cx="${p.x}" cy="${p.y}" r="5" fill="${stroke.color}" />\n`;
        const u = canvasToUserCoord(p, canvasWidth, canvasHeight, config);
        svgContent += `  <text x="${p.x + 8}" y="${p.y - 8}" font-size="11" font-family="monospace" fill="#334155">${formatCoordString(u, config.unit)}</text>\n`;
      });
    } else {
      // Pencil or polyline
      const pts = stroke.points.map((p) => `${p.x},${p.y}`).join(' ');
      svgContent += `  <polyline points="${pts}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }
  });

  svgContent += `</svg>`;
  return svgContent;
}

/**
 * Calculate the bounding box of a list of strokes
 */
export function getStrokesBoundingBox(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 20
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (!strokes || strokes.length === 0) {
    return { minX: 0, minY: 0, maxX: canvasWidth, maxY: canvasHeight, width: canvasWidth, height: canvasHeight };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  strokes.forEach((s) => {
    s.points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });

    if (s.tool === 'circle' && s.points.length >= 2) {
      const r = calculateDistance(s.points[0], s.points[1]);
      minX = Math.min(minX, s.points[0].x - r);
      minY = Math.min(minY, s.points[0].y - r);
      maxX = Math.max(maxX, s.points[0].x + r);
      maxY = Math.max(maxY, s.points[0].y + r);
    }
  });

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: canvasWidth, maxY: canvasHeight, width: canvasWidth, height: canvasHeight };
  }

  const boundedMinX = Math.max(0, Math.floor(minX - padding));
  const boundedMinY = Math.max(0, Math.floor(minY - padding));
  const boundedMaxX = Math.min(canvasWidth, Math.ceil(maxX + padding));
  const boundedMaxY = Math.min(canvasHeight, Math.ceil(maxY + padding));
  const width = Math.max(10, boundedMaxX - boundedMinX);
  const height = Math.max(10, boundedMaxY - boundedMinY);

  return {
    minX: boundedMinX,
    minY: boundedMinY,
    maxX: boundedMaxX,
    maxY: boundedMaxY,
    width,
    height,
  };
}

/**
 * Generate a standalone pure SVG representation of the drawing
 */
export function generatePureSvgIllustration(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  autoCrop: boolean = false
): string {
  const bbox = autoCrop
    ? getStrokesBoundingBox(strokes, canvasWidth, canvasHeight, 15)
    : { minX: 0, minY: 0, maxX: canvasWidth, maxY: canvasHeight, width: canvasWidth, height: canvasHeight };

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">\n`;

  strokes.forEach((stroke) => {
    if (stroke.points.length === 0) return;

    if (stroke.tool === 'line' && stroke.points.length >= 2) {
      const [p1, p2] = stroke.points;
      svg += `  <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" />\n`;
    } else if (stroke.tool === 'rect' && stroke.points.length >= 2) {
      const [p1, p2] = stroke.points;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      svg += `  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linejoin="round" />\n`;
    } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
      const [p1, p2] = stroke.points;
      const r = calculateDistance(p1, p2);
      svg += `  <circle cx="${p1.x}" cy="${p1.y}" r="${r}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" />\n`;
    } else if (stroke.tool === 'marker') {
      stroke.points.forEach((p) => {
        svg += `  <circle cx="${p.x}" cy="${p.y}" r="5" fill="${stroke.color}" />\n`;
      });
    } else {
      // Freehand pencil or polyline
      const pts = stroke.points.map((p) => `${p.x},${p.y}`).join(' ');
      svg += `  <polyline points="${pts}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }
  });

  svg += `</svg>`;
  return svg;
}

/**
 * Generate CSS code for embedding the entire drawing as a background-image
 */
export function generateCssBackgroundDataUri(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  autoCrop: boolean = true
): string {
  const svg = generatePureSvgIllustration(strokes, canvasWidth, canvasHeight, autoCrop);
  const bbox = autoCrop
    ? getStrokesBoundingBox(strokes, canvasWidth, canvasHeight, 15)
    : { width: canvasWidth, height: canvasHeight };

  // URI-encode SVG cleanly for CSS
  const encodedSvg = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');

  return `/* CSS Background Image del tuo disegno */
.custom-drawing-background {
  width: 100%;
  max-width: ${bbox.width}px;
  height: ${bbox.height}px;
  background-image: url("data:image/svg+xml,${encodedSvg}");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}`;
}

/**
 * Generate HTML + CSS embedding code for the exact drawing
 */
export function generateHtmlCssDrawing(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  autoCrop: boolean = true
): string {
  const svg = generatePureSvgIllustration(strokes, canvasWidth, canvasHeight, autoCrop);
  const bbox = autoCrop
    ? getStrokesBoundingBox(strokes, canvasWidth, canvasHeight, 15)
    : { width: canvasWidth, height: canvasHeight };

  return `<!-- HTML Snippet del tuo Disegno -->
<div class="custom-vector-art">
${svg
  .split('\n')
  .map((line) => '  ' + line)
  .join('\n')}
</div>

/* CSS per l'elemento */
.custom-vector-art {
  display: inline-block;
  width: 100%;
  max-width: ${bbox.width}px;
  aspect-ratio: ${bbox.width} / ${bbox.height};
}

.custom-vector-art svg {
  width: 100%;
  height: 100%;
  display: block;
}`;
}

/**
 * Convert any stroke (line, rect, circle, marker, polyline, pencil) into an array of perimeter/polygon points
 */
export function strokeToPolygonPoints(stroke: Stroke): Point[] {
  if (!stroke || stroke.points.length === 0) return [];
  
  if (stroke.tool === 'rect' && stroke.points.length >= 2) {
    const [p1, p2] = stroke.points;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    // 4 corners of rectangle
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
  }

  if (stroke.tool === 'circle' && stroke.points.length >= 2) {
    const [center, edge] = stroke.points;
    const radius = calculateDistance(center, edge);
    const pts: Point[] = [];
    const steps = 24; // 24 points to approximate circle polygon
    for (let i = 0; i < steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      pts.push({
        x: Math.round(center.x + radius * Math.cos(angle)),
        y: Math.round(center.y + radius * Math.sin(angle)),
      });
    }
    return pts;
  }

  if (stroke.tool === 'marker' && stroke.points.length === 1) {
    // 1 marker point
    return [stroke.points[0]];
  }

  return stroke.points;
}

/**
 * Generates CSS clip-path polygon format (percentage or px) for a stroke or list of points
 */
export function generateCssClipPath(
  points: Point[],
  canvasWidth: number,
  canvasHeight: number,
  usePercentage: boolean = true
): string {
  if (points.length === 0) return 'clip-path: none;';
  
  const polygonPoints = points.map((p) => {
    if (usePercentage) {
      const pctX = ((p.x / canvasWidth) * 100).toFixed(1);
      const pctY = ((p.y / canvasHeight) * 100).toFixed(1);
      return `${pctX}% ${pctY}%`;
    } else {
      return `${Math.round(p.x)}px ${Math.round(p.y)}px`;
    }
  });

  return `clip-path: polygon(${polygonPoints.join(', ')});`;
}

/**
 * Generates CSS absolute positioning rules for a stroke or collection
 */
export function generateCssAbsoluteBox(
  stroke: Stroke,
  canvasWidth: number,
  canvasHeight: number,
  usePercentage: boolean = false
): string {
  if (stroke.points.length === 0) return '/* Nessun punto */';

  const xs = stroke.points.map((p) => p.x);
  const ys = stroke.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);

  if (usePercentage) {
    const leftPct = ((minX / canvasWidth) * 100).toFixed(2);
    const topPct = ((minY / canvasHeight) * 100).toFixed(2);
    const widthPct = ((width / canvasWidth) * 100).toFixed(2);
    const heightPct = ((height / canvasHeight) * 100).toFixed(2);

    return `.shape-${stroke.tool} {
  position: absolute;
  left: ${leftPct}%;
  top: ${topPct}%;
  width: ${widthPct}%;
  height: ${heightPct}%;
  border: ${stroke.width}px solid ${stroke.color};
  ${stroke.tool === 'circle' ? 'border-radius: 50%;' : ''}
}`;
  }

  return `.shape-${stroke.tool} {
  position: absolute;
  left: ${Math.round(minX)}px;
  top: ${Math.round(minY)}px;
  width: ${Math.round(width)}px;
  height: ${Math.round(height)}px;
  border: ${stroke.width}px solid ${stroke.color};
  ${stroke.tool === 'circle' ? 'border-radius: 50%;' : ''}
}`;
}

/**
 * Generates CSS Motion Path (offset-path) for animation along the drawn coordinates
 */
export function generateCssOffsetPath(points: Point[]): string {
  if (points.length < 2) return '/* Richiede almeno 2 coordinate */';

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${Math.round(p.x)} ${Math.round(p.y)}`)
    .join(' ');

  return `/* CSS Motion Path */
.animated-element {
  offset-path: path("${d}");
  animation: moveAlongPath 4s infinite linear alternate;
}

@keyframes moveAlongPath {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}`;
}

/**
 * Generates CSS @keyframes translations for moving through all coordinates
 */
export function generateCssKeyframes(
  points: Point[],
  animationName: string = 'gridTrajectory'
): string {
  if (points.length < 2) return '/* Richiede almeno 2 coordinate */';

  const first = points[0];
  const frames = points.map((p, idx) => {
    const pct = Math.round((idx / (points.length - 1)) * 100);
    const dx = Math.round(p.x - first.x);
    const dy = Math.round(p.y - first.y);
    return `  ${pct}% {
    transform: translate(${dx}px, ${dy}px);
  }`;
  });

  return `@keyframes ${animationName} {
${frames.join('\n')}
}

.mover {
  animation: ${animationName} 3s ease-in-out infinite alternate;
}`;
}

/**
 * Generates CSS Variables / Custom Properties containing all coordinates
 */
export function generateCssVariables(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): string {
  const lines: string[] = [
    ':root {',
    `  /* Grid Canvas CSS Coordinates (${config.unit}) */`,
    `  --canvas-width: ${canvasWidth}px;`,
    `  --canvas-height: ${canvasHeight}px;`,
    `  --grid-step: ${config.size}px;`,
  ];

  strokes.forEach((stroke, sIdx) => {
    const prefix = `--stroke-${sIdx + 1}`;
    lines.push(`  /* ${stroke.tool.toUpperCase()} #${sIdx + 1} */`);
    lines.push(`  ${prefix}-color: ${stroke.color};`);
    lines.push(`  ${prefix}-width: ${stroke.width}px;`);
    stroke.points.forEach((pt, pIdx) => {
      const u = canvasToUserCoord(pt, canvasWidth, canvasHeight, config);
      lines.push(`  ${prefix}-p${pIdx + 1}-x: ${u.x}${config.unit === 'px' ? 'px' : ''};`);
      lines.push(`  ${prefix}-p${pIdx + 1}-y: ${u.y}${config.unit === 'px' ? 'px' : ''};`);
      lines.push(`  ${prefix}-p${pIdx + 1}-pct-x: ${((pt.x / canvasWidth) * 100).toFixed(1)}%;`);
      lines.push(`  ${prefix}-p${pIdx + 1}-pct-y: ${((pt.y / canvasHeight) * 100).toFixed(1)}%;`);
    });
  });

  lines.push('}');
  return lines.join('\n');
}

/**
 * Export full CSS stylesheet for all strokes on canvas
 */
export function exportStrokesToCSS(
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): string {
  const sections: string[] = [
    `/* ==========================================================================
   GRID CANVAS - CSS COORDINATES EXPORT
   Generated: ${new Date().toLocaleString()}
   Canvas: ${canvasWidth}px x ${canvasHeight}px | Origin: ${config.originMode} | Unit: ${config.unit}
   ========================================================================== */\n`,
  ];

  // 1. CSS Custom Properties / Variables
  sections.push(generateCssVariables(strokes, canvasWidth, canvasHeight, config));

  // 2. Individual Stroke Shapes
  strokes.forEach((stroke, idx) => {
    const sName = `stroke-${idx + 1}-${stroke.tool}`;
    sections.push(`\n/* ----------------------------------------------------
   Shape #${idx + 1}: ${stroke.tool.toUpperCase()} (${stroke.points.length} points)
   ---------------------------------------------------- */`);

    // Absolute positioning
    sections.push(`/* 1. Box Absolute Position (px) */\n${generateCssAbsoluteBox(stroke, canvasWidth, canvasHeight, false)}`);
    sections.push(`/* 2. Box Absolute Position (%) */\n${generateCssAbsoluteBox(stroke, canvasWidth, canvasHeight, true)}`);

    // Clip path (if polyline, rect, pencil, or multi-point)
    if (stroke.points.length >= 3) {
      sections.push(`/* 3. Clip Path Polygon (%) */\n.clip-${sName} {\n  ${generateCssClipPath(stroke.points, canvasWidth, canvasHeight, true)}\n}`);
      sections.push(`/* 4. Clip Path Polygon (px) */\n.clip-px-${sName} {\n  ${generateCssClipPath(stroke.points, canvasWidth, canvasHeight, false)}\n}`);
    }

    // Motion path if >= 2 points
    if (stroke.points.length >= 2) {
      sections.push(generateCssOffsetPath(stroke.points));
      sections.push(generateCssKeyframes(stroke.points, `animPath_${idx + 1}`));
    }
  });

  return sections.join('\n\n');
}
