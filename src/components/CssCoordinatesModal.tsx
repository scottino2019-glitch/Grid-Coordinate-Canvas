import React, { useState } from 'react';
import { Stroke, GridConfig, Point } from '../types';
import {
  generatePureSvgIllustration,
  generateCssBackgroundDataUri,
  generateHtmlCssDrawing,
  generateCssClipPath,
  generateCssAbsoluteBox,
  generateCssOffsetPath,
  generateCssVariables,
  exportStrokesToCSS,
  strokeToPolygonPoints,
  getStrokesBoundingBox,
} from '../utils/coordinateMath';
import {
  X,
  Copy,
  Check,
  Download,
  Code,
  Scissors,
  Box,
  Play,
  FileCode,
  CheckCircle2,
  Crop,
  Image as ImageIcon,
  Palette,
} from 'lucide-react';

interface CssCoordinatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  strokes: Stroke[];
  selectedStrokeId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  config: GridConfig;
}

type CssTab = 'drawing' | 'bg-image' | 'clip-path' | 'absolute' | 'motion' | 'variables' | 'full';

export const CssCoordinatesModal: React.FC<CssCoordinatesModalProps> = ({
  isOpen,
  onClose,
  strokes,
  selectedStrokeId,
  canvasWidth,
  canvasHeight,
  config,
}) => {
  const [activeTab, setActiveTab] = useState<CssTab>('drawing');
  const [targetScope, setTargetScope] = useState<'all' | 'selected'>('all');
  const [autoCrop, setAutoCrop] = useState(true);
  const [usePercentage, setUsePercentage] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Safe Fallback demo shape points if canvas has 0 strokes
  const defaultDemoPoints: Point[] = [
    { x: Math.round(canvasWidth * 0.2), y: Math.round(canvasHeight * 0.2) },
    { x: Math.round(canvasWidth * 0.8), y: Math.round(canvasHeight * 0.25) },
    { x: Math.round(canvasWidth * 0.85), y: Math.round(canvasHeight * 0.75) },
    { x: Math.round(canvasWidth * 0.5), y: Math.round(canvasHeight * 0.9) },
    { x: Math.round(canvasWidth * 0.15), y: Math.round(canvasHeight * 0.7) },
  ];

  const hasStrokes = strokes && strokes.length > 0;
  const selectedStroke = strokes.find((s) => s.id === selectedStrokeId) || (hasStrokes ? strokes[0] : null);
  const effectiveStrokes = targetScope === 'selected' && selectedStroke ? [selectedStroke] : (hasStrokes ? strokes : []);

  // Demo fallback strokes if nothing is drawn yet
  const displayStrokes: Stroke[] = effectiveStrokes.length > 0 ? effectiveStrokes : [
    {
      id: 'demo-1',
      tool: 'polyline',
      color: '#2563eb',
      width: 3,
      points: defaultDemoPoints,
      completed: true,
      timestamp: Date.now(),
    },
  ];

  // Bounding box calculation
  const bbox = getStrokesBoundingBox(displayStrokes, canvasWidth, canvasHeight, 15);

  // Extract points for polygon / clip-path
  let activePoints: Point[] = [];
  if (selectedStroke && targetScope === 'selected') {
    activePoints = strokeToPolygonPoints(selectedStroke);
  } else if (hasStrokes) {
    activePoints = strokes.flatMap((s) => strokeToPolygonPoints(s));
  } else {
    activePoints = defaultDemoPoints;
  }

  // Generate code based on active tab
  let generatedCode = '';
  let previewClipPath = '';
  let previewMotionPath = '';

  // Generate exact SVG representation for preview
  const previewSvg = generatePureSvgIllustration(displayStrokes, canvasWidth, canvasHeight, autoCrop);

  if (activeTab === 'drawing') {
    generatedCode = generateHtmlCssDrawing(displayStrokes, canvasWidth, canvasHeight, autoCrop);
  } else if (activeTab === 'bg-image') {
    generatedCode = generateCssBackgroundDataUri(displayStrokes, canvasWidth, canvasHeight, autoCrop);
  } else if (activeTab === 'clip-path') {
    const cssClip = generateCssClipPath(activePoints, canvasWidth, canvasHeight, usePercentage);
    const color = selectedStroke ? selectedStroke.color : '#4f46e5';
    generatedCode = `/* CSS Clip-Path Polygon (${usePercentage ? 'Percentuale %' : 'Pixel px'}) */
/* Nota: clip-path riempie la forma come un poligono solido continuo */
/* Foglio: ${canvasWidth}px × ${canvasHeight}px | Vertici: ${activePoints.length} */

.custom-clipped-polygon {
  width: 100%;
  height: 100%;
  background: ${color};
  ${cssClip}
  -webkit-clip-path: ${cssClip.replace('clip-path: ', '')}
}`;
    previewClipPath = generateCssClipPath(activePoints, canvasWidth, canvasHeight, true)
      .replace('clip-path: ', '')
      .replace(';', '');
  } else if (activeTab === 'absolute') {
    if (selectedStroke && targetScope === 'selected') {
      generatedCode = `/* CSS Absolute Positioning (${usePercentage ? '%' : 'px'}) */\n${generateCssAbsoluteBox(selectedStroke, canvasWidth, canvasHeight, usePercentage)}`;
    } else {
      generatedCode = displayStrokes
        .map(
          (s, idx) =>
            `/* Elemento #${idx + 1}: ${s.name || s.tool.toUpperCase()} */\n${generateCssAbsoluteBox(s, canvasWidth, canvasHeight, usePercentage)}`
        )
        .join('\n\n');
    }
  } else if (activeTab === 'motion') {
    const motionPts = selectedStroke?.points || (displayStrokes[0]?.points || defaultDemoPoints);
    generatedCode = generateCssOffsetPath(motionPts);
    if (motionPts.length >= 2) {
      const d = motionPts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${Math.round(p.x * 0.3)} ${Math.round(p.y * 0.3)}`)
        .join(' ');
      previewMotionPath = d;
    }
  } else if (activeTab === 'variables') {
    generatedCode = generateCssVariables(displayStrokes, canvasWidth, canvasHeight, config);
  } else if (activeTab === 'full') {
    generatedCode = exportStrokesToCSS(displayStrokes, canvasWidth, canvasHeight, config);
  }

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const extension = activeTab === 'drawing' ? 'html' : 'css';
    const mime = activeTab === 'drawing' ? 'text/html' : 'text/css';
    const blob = new Blob([generatedCode], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `drawing-code-${Date.now()}.${extension}`;
    link.href = url;
    link.click();
  };

  const tabs: { id: CssTab; label: string; icon: React.ReactNode }[] = [
    { id: 'drawing', label: 'Disegno Fedele (HTML+CSS)', icon: <Palette className="w-3.5 h-3.5 text-emerald-500" /> },
    { id: 'bg-image', label: 'CSS Background', icon: <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> },
    { id: 'clip-path', label: 'Clip-Path Polygon', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'absolute', label: 'Box Absolute', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'motion', label: 'Motion Path', icon: <Play className="w-3.5 h-3.5" /> },
    { id: 'variables', label: 'Variabili CSS', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'full', label: 'File CSS Completo', icon: <FileCode className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      id="css-coordinates-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs font-mono select-none"
      onClick={onClose}
    >
      <div
        id="css-coordinates-modal-container"
        className="relative w-full max-w-4xl max-h-[92vh] bg-white border-2 border-[#141414] shadow-[6px_6px_0px_#141414] flex flex-col overflow-hidden text-[#141414]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#E4E3E0] border-b-2 border-[#141414]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#141414] text-emerald-400 flex items-center justify-center font-bold text-xs">
              {'{ }'}
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight uppercase">ESPORTAZIONE CODICE CSS & DISEGNO WEB</h2>
              <p className="text-[10px] text-[#666666] uppercase font-bold">
                Esporta il tuo disegno reale in HTML/CSS, SVG inline, Background-image, Clip-Path o coordinate
              </p>
            </div>
          </div>
          <button
            id="close-css-modal-btn"
            onClick={onClose}
            className="p-1.5 text-[#141414] hover:bg-[#141414] hover:text-white border border-[#141414] transition cursor-pointer"
            title="Chiudi finestra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope selector & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#E4E3E0]/50 border-b-2 border-[#141414] text-xs">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                id={`css-tab-${t.id}`}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#141414] text-white border-[#141414]'
                    : 'bg-white text-[#141414] border-[#141414] hover:bg-[#E4E3E0]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Scope & Auto-Crop controls */}
          <div className="flex flex-wrap items-center gap-2">
            {(activeTab === 'drawing' || activeTab === 'bg-image') && (
              <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer bg-white px-2 py-1 border border-[#141414]">
                <input
                  type="checkbox"
                  checked={autoCrop}
                  onChange={(e) => setAutoCrop(e.target.checked)}
                  className="accent-[#141414] w-3.5 h-3.5 cursor-pointer"
                />
                <Crop className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ritaglia margini ({bbox.width}×{bbox.height}px)</span>
              </label>
            )}

            {selectedStroke && strokes.length > 1 && (
              <div className="flex items-center border border-[#141414] bg-white text-[11px] font-bold">
                <button
                  onClick={() => setTargetScope('all')}
                  className={`px-2 py-0.5 cursor-pointer ${targetScope === 'all' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
                >
                  Tutti ({strokes.length})
                </button>
                <button
                  onClick={() => setTargetScope('selected')}
                  className={`px-2 py-0.5 cursor-pointer ${targetScope === 'selected' ? 'bg-[#141414] text-white' : 'text-[#141414]'}`}
                >
                  Elemento Selezionato
                </button>
              </div>
            )}

            {(activeTab === 'clip-path' || activeTab === 'absolute') && (
              <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer bg-white px-2 py-1 border border-[#141414]">
                <input
                  type="checkbox"
                  checked={usePercentage}
                  onChange={(e) => setUsePercentage(e.target.checked)}
                  className="accent-[#141414] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Formato % (Percentuale)</span>
              </label>
            )}
          </div>
        </div>

        {/* Content Area: Code + Preview */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 bg-[#f7f7f6]">
          {/* Code Viewer (7 cols on large) */}
          <div className="lg:col-span-7 flex flex-col border-2 border-[#141414] bg-[#141414] text-white shadow-xs">
            <div className="flex items-center justify-between px-3 py-2 bg-[#262626] border-b border-neutral-700 text-xs font-bold text-neutral-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="uppercase tracking-wider text-[11px] text-white">CODICE GENERATO PRONTO</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="copy-css-code-btn"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold transition cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIATO!' : 'COPIA CODICE'}</span>
                </button>
                <button
                  id="download-css-code-btn"
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#404040] hover:bg-[#555555] text-white text-xs font-bold transition cursor-pointer"
                  title="Scarica file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>SCARICA</span>
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={generatedCode}
              className="w-full flex-1 min-h-[280px] p-3 text-xs leading-relaxed font-mono bg-[#141414] text-emerald-400 border-none outline-none resize-none select-text custom-scrollbar focus:ring-0"
              spellCheck={false}
            />
          </div>

          {/* Interactive Preview Panel (5 cols on large) */}
          <div className="lg:col-span-5 flex flex-col border-2 border-[#141414] bg-white p-3">
            <span className="text-[11px] font-bold uppercase text-[#141414] mb-2 flex items-center justify-between">
              <span>ANTEPRIMA FEDELE DEL DISEGNO</span>
              <span className="text-[9px] text-[#666666]">
                {hasStrokes ? `${strokes.length} elementi` : 'Demo'}
              </span>
            </span>

            {/* Visual Box Container */}
            <div className="flex-1 min-h-[220px] bg-[#ffffff] border-2 border-[#141414] flex flex-col items-center justify-center p-3 relative overflow-hidden shadow-inner">
              {activeTab === 'clip-path' && previewClipPath ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div
                    className="w-36 h-36 bg-gradient-to-br from-indigo-600 to-rose-500 shadow-md transition-all duration-300 border border-[#141414]"
                    style={{
                      clipPath: previewClipPath,
                      WebkitClipPath: previewClipPath,
                    }}
                    title="Anteprima clip-path CSS"
                  />
                  <span className="text-[9px] font-mono text-neutral-600 mt-2">clip-path: polygon(...)</span>
                </div>
              ) : activeTab === 'motion' && previewMotionPath ? (
                <div className="relative w-full h-40 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                    <path d={previewMotionPath} fill="none" stroke="#141414" strokeWidth="2" strokeDasharray="3,3" />
                  </svg>
                  <div
                    className="w-3.5 h-3.5 bg-red-600 rounded-full shadow"
                    style={{
                      offsetPath: `path("${previewMotionPath}")`,
                      animation: 'moveAlongPath 3s infinite linear alternate',
                    }}
                  />
                </div>
              ) : activeTab === 'absolute' ? (
                <div className="relative w-full h-44 bg-[#f8fafc] border border-neutral-300 overflow-hidden">
                  <div
                    className="absolute border-2 border-indigo-600 bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-900"
                    style={{
                      left: '15%',
                      top: '15%',
                      width: '70%',
                      height: '70%',
                      borderRadius: selectedStroke?.tool === 'circle' ? '50%' : '0px',
                    }}
                  >
                    {selectedStroke ? selectedStroke.tool.toUpperCase() : 'BOX POSITION'}
                  </div>
                </div>
              ) : (
                /* Pure Real SVG Vector Drawing of what the user drew! */
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div
                    className="w-full max-h-48 flex items-center justify-center p-2 border border-dashed border-neutral-300 rounded bg-[#fdfdfd]"
                    dangerouslySetInnerHTML={{ __html: previewSvg }}
                  />
                  <span className="text-[9px] text-neutral-500 font-mono mt-1.5">
                    {autoCrop ? `Ritagliato su ${bbox.width}×${bbox.height}px` : `Dimensioni totali ${canvasWidth}×${canvasHeight}px`}
                  </span>
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="mt-3 p-2 bg-[#E4E3E0]/70 border border-[#141414]/20 text-[10px] text-[#222222] space-y-1">
              <p><strong>💡 Come usare nel codice:</strong></p>
              {activeTab === 'drawing' && (
                <p>Copia l'HTML e CSS per inserire il tuo disegno direttamente in qualsiasi pagina o componente React/Vue/HTML.</p>
              )}
              {activeTab === 'bg-image' && (
                <p>Applica la classe CSS <code className="bg-white px-1 font-bold">.custom-drawing-background</code> su qualsiasi elemento per usarlo come sfondo vettoriale.</p>
              )}
              {activeTab === 'clip-path' && (
                <p>Usa la proprietà <code className="bg-white px-1 font-bold">clip-path: polygon(...)</code> per ritagliare forme poligonali piene.</p>
              )}
              {activeTab === 'absolute' && (
                <p>Usa le coordinate <code className="bg-white px-1 font-bold">position: absolute</code> per posizionare i singoli elementi grafici nel layout.</p>
              )}
              {activeTab === 'variables' && (
                <p>Importa le Custom Properties CSS per riutilizzare le coordinate matematiche nei tuoi fogli di stile.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#E4E3E0] border-t-2 border-[#141414] text-xs">
          <span className="text-[10px] text-[#444444] font-bold">
            {strokes.length} tratti attivi • Canvas {canvasWidth}×{canvasHeight}px • Sistema {config.originMode}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#141414] hover:bg-[#333333] text-white text-xs font-bold transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIATO!' : 'COPIA CODICE'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-neutral-100 border border-[#141414] text-[#141414] text-xs font-bold transition cursor-pointer"
            >
              CHIUDI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
