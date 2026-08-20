import React, { useState, useRef, useEffect } from 'react';
import { ToolType, GridConfig, OriginMode, UnitType } from '../types';
import {
  Pencil,
  Spline,
  Square,
  Circle,
  MapPin,
  Eraser,
  MousePointer,
  Grid,
  Magnet,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Sliders,
  ChevronDown,
  Crosshair,
  FileSpreadsheet,
  FileCode,
  Image,
  Download,
  Code,
  Palette,
  Eye,
  EyeOff,
  HelpCircle,
  Settings,
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  config: GridConfig;
  setConfig: React.Dispatch<React.SetStateAction<GridConfig>>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  zoom: number;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onOpenCssModal: () => void;
}

const PRESET_COLORS = [
  '#0f172a', // Nero
  '#2563eb', // Blu
  '#059669', // Verde
  '#dc2626', // Rosso
  '#d97706', // Ambra
  '#7c3aed', // Viola
];

const GRID_SIZES = [10, 20, 25, 40, 50, 100];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  config,
  setConfig,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoom,
  onExportPNG,
  onExportSVG,
  onExportCSV,
  onExportJSON,
  onOpenCssModal,
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSnapHelp, setShowSnapHelp] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'select', label: 'Seleziona', icon: <MousePointer className="w-3.5 h-3.5" />, shortcut: 'V' },
    { id: 'pencil', label: 'Mano Libera', icon: <Pencil className="w-3.5 h-3.5" />, shortcut: 'P' },
    { id: 'line', label: 'Linea', icon: <Spline className="w-3.5 h-3.5" />, shortcut: 'L' },
    { id: 'polyline', label: 'Poligonale', icon: <Crosshair className="w-3.5 h-3.5" />, shortcut: 'K' },
    { id: 'rect', label: 'Rettangolo', icon: <Square className="w-3.5 h-3.5" />, shortcut: 'R' },
    { id: 'circle', label: 'Cerchio', icon: <Circle className="w-3.5 h-3.5" />, shortcut: 'C' },
    { id: 'marker', label: 'Punto', icon: <MapPin className="w-3.5 h-3.5" />, shortcut: 'M' },
    { id: 'eraser', label: 'Gomma', icon: <Eraser className="w-3.5 h-3.5" />, shortcut: 'E' },
  ];

  return (
    <header
      id="main-top-toolbar"
      className="w-full bg-[#E4E3E0] border-b-2 border-[#141414] p-1 sm:p-1.5 z-40 shrink-0 font-mono text-[#141414]"
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 max-w-full">
        {/* LEFT GROUP: Logo + Drawing Tools */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Logo */}
          <div className="flex items-center gap-1.5 bg-white border-2 border-[#141414] px-2 py-1 shadow-[2px_2px_0px_#141414]">
            <div className="w-5 h-5 bg-[#141414] flex items-center justify-center text-white shrink-0">
              <Grid className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[#141414] tracking-tight leading-none uppercase">
                GRID.CANVAS
              </span>
              <span className="text-[8px] text-[#666666] tracking-tighter uppercase font-semibold">CAD & CSS</span>
            </div>
          </div>

          {/* Tools Palette */}
          <div className="flex items-center gap-0.5 bg-white border-2 border-[#141414] p-0.5 shadow-[2px_2px_0px_#141414]">
            {tools.map((t) => {
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  id={`tool-btn-${t.id}`}
                  onClick={() => setActiveTool(t.id)}
                  title={`${t.label} (Tasto scorciatoia: ${t.shortcut})`}
                  className={`p-1.5 text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                    isActive
                      ? 'bg-[#141414] text-white'
                      : 'text-[#141414] hover:bg-[#141414]/10'
                  }`}
                >
                  {t.icon}
                  <span className="hidden xl:inline text-[10px] uppercase font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MIDDLE GROUP: Stroke Color + Spessore px + Snap + Griglia px */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Color Presets & Picker */}
          <div className="flex items-center gap-1 bg-white border-2 border-[#141414] px-1.5 py-1 shadow-[2px_2px_0px_#141414]">
            <span className="text-[9px] font-bold text-[#666666] uppercase hidden sm:inline">Colore:</span>
            <div className="flex items-center gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  id={`color-preset-${c.replace('#', '')}`}
                  onClick={() => setStrokeColor(c)}
                  className={`w-3.5 h-3.5 transition-transform cursor-pointer border ${
                    strokeColor === c ? 'scale-125 border-[#141414] ring-1.5 ring-[#141414]' : 'border-neutral-400 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={`Colore ${c}`}
                />
              ))}
              <input
                id="custom-color-input"
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-4 h-4 cursor-pointer bg-transparent border-0 p-0 ml-0.5"
                title="Scegli colore personalizzato"
              />
            </div>
          </div>

          {/* Stroke Width Selector (px) */}
          <div className="flex items-center gap-0.5 bg-white border-2 border-[#141414] px-1.5 py-1 shadow-[2px_2px_0px_#141414]">
            <span className="text-[9px] font-bold text-[#666666] uppercase mr-0.5">Tratto:</span>
            {[1, 2, 3, 5, 8].map((w) => (
              <button
                key={w}
                id={`width-btn-${w}`}
                onClick={() => setStrokeWidth(w)}
                className={`px-1 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                  strokeWidth === w
                    ? 'bg-[#141414] text-white'
                    : 'bg-[#E4E3E0] text-[#141414] hover:bg-[#141414]/15'
                }`}
                title={`Spessore del tratto ${w} pixel`}
              >
                {w}px
              </button>
            ))}
          </div>

          {/* Grid Size selector (px) */}
          <div className="flex items-center gap-1 bg-white border-2 border-[#141414] px-1.5 py-1 shadow-[2px_2px_0px_#141414]">
            <span className="text-[9px] font-bold text-[#666666] uppercase">Griglia:</span>
            <select
              id="toolbar-grid-size-select"
              value={config.size}
              onChange={(e) => setConfig((c) => ({ ...c, size: Number(e.target.value) }))}
              className="bg-[#E4E3E0] border border-[#141414] px-1 py-0.5 text-[10px] font-bold text-[#141414] cursor-pointer"
              title="Dimensione quadretti griglia (px)"
            >
              {GRID_SIZES.map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
          </div>

          {/* Snap Magnet Button with Help Popup */}
          <div className="flex items-center gap-0.5 bg-white border-2 border-[#141414] p-0.5 shadow-[2px_2px_0px_#141414]">
            <button
              id="quick-snap-toggle"
              onClick={() => setConfig((c) => ({ ...c, snap: !c.snap }))}
              className={`flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold transition cursor-pointer ${
                config.snap
                  ? 'bg-[#141414] text-emerald-400'
                  : 'bg-[#E4E3E0] text-[#666666] hover:bg-[#141414]/10'
              }`}
              title={
                config.snap
                  ? 'SNAP ATTIVO (Calamita ON): il cursore si aggancia agli incroci della griglia'
                  : 'SNAP DISATTIVATO (Calamita OFF): disegno continuo libero'
              }
            >
              <Magnet className={`w-3.5 h-3.5 ${config.snap ? 'text-emerald-400 animate-pulse' : 'text-[#666666]'}`} />
              <span className="text-[10px]">SNAP: {config.snap ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={() => setShowSnapHelp(true)}
              className="p-1 text-[#666666] hover:text-[#141414] hover:bg-[#E4E3E0] cursor-pointer"
              title="Spiegazione di cos'è lo SNAP"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* RIGHT GROUP: Actions, Zoom, CSS, Settings, and SCARICA / ESPORTA */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo & Clear All */}
          <div className="flex items-center gap-0.5 bg-white border-2 border-[#141414] p-0.5 shadow-[2px_2px_0px_#141414]">
            <button
              id="undo-action-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 text-[#141414] hover:bg-[#141414]/10 disabled:opacity-25 transition cursor-pointer"
              title="Annulla (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              id="redo-action-btn"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 text-[#141414] hover:bg-[#141414]/10 disabled:opacity-25 transition cursor-pointer"
              title="Ripeti (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-[#141414]/30 mx-0.5" />
            <button
              id="clear-all-toolbar-btn"
              onClick={onClear}
              className="p-1 text-red-600 hover:bg-red-600 hover:text-white transition cursor-pointer"
              title="Elimina tutto / Svuota Canvas (Ripristinabile con Annulla)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-white border-2 border-[#141414] p-0.5 shadow-[2px_2px_0px_#141414]">
            <button
              id="zoom-out-btn"
              onClick={onZoomOut}
              className="p-1 text-[#141414] hover:bg-[#141414]/10 transition cursor-pointer"
              title="Riduci Zoom (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              id="zoom-reset-btn"
              onClick={onResetZoom}
              className="px-1 py-0.5 text-[9px] font-bold text-[#141414] bg-[#E4E3E0] hover:bg-[#141414] hover:text-white transition cursor-pointer"
              title="Reimposta Zoom al 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              id="zoom-in-btn"
              onClick={onZoomIn}
              className="p-1 text-[#141414] hover:bg-[#141414]/10 transition cursor-pointer"
              title="Aumenta Zoom (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* CSS Generator Modal Button */}
          <button
            id="open-css-modal-toolbar-btn"
            onClick={onOpenCssModal}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#141414] hover:bg-[#2c2c2c] text-white text-xs font-bold border-2 border-[#141414] shadow-[2px_2px_0px_#141414] transition cursor-pointer"
            title="Generatore di codice CSS e HTML del disegno"
          >
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSS</span>
          </button>

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              id="settings-dropdown-toggle"
              onClick={() => {
                setShowSettingsMenu(!showSettingsMenu);
                setShowExportMenu(false);
              }}
              className={`p-1.5 border-2 border-[#141414] shadow-[2px_2px_0px_#141414] transition flex items-center gap-1 cursor-pointer ${
                showSettingsMenu
                  ? 'bg-[#141414] text-white'
                  : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'
              }`}
              title="Impostazioni avanzate Griglia e Assi"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showSettingsMenu && (
              <div
                id="settings-dropdown-popover"
                className="absolute right-0 top-9 w-72 max-w-[calc(100vw-20px)] max-h-[80vh] overflow-y-auto bg-white border-2 border-[#141414] shadow-[4px_4px_0px_#141414] p-3 z-50 text-xs text-[#141414] divide-y divide-[#141414]/20 space-y-2.5 custom-scrollbar"
              >
                <div>
                  <span className="font-bold text-[#141414] uppercase tracking-wider text-[11px] block mb-2">
                    Configurazione Griglia
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#666666]">Dimensione Quadretti:</span>
                      <select
                        value={config.size}
                        onChange={(e) => setConfig((c) => ({ ...c, size: Number(e.target.value) }))}
                        className="bg-[#E4E3E0] border border-[#141414] px-2 py-1 font-bold cursor-pointer"
                      >
                        {GRID_SIZES.map((s) => (
                          <option key={s} value={s}>{s} px</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#666666]">Origine (0,0):</span>
                      <select
                        value={config.originMode}
                        onChange={(e) => setConfig((c) => ({ ...c, originMode: e.target.value as OriginMode }))}
                        className="bg-[#E4E3E0] border border-[#141414] px-2 py-1 font-bold cursor-pointer"
                      >
                        <option value="top-left">In alto a sinistra (CSS)</option>
                        <option value="center">Centro Cartesiano (X,Y)</option>
                        <option value="bottom-left">In basso a sinistra (CAD)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#666666]">Unità di Misura:</span>
                      <select
                        value={config.unit}
                        onChange={(e) => setConfig((c) => ({ ...c, unit: e.target.value as UnitType }))}
                        className="bg-[#E4E3E0] border border-[#141414] px-2 py-1 font-bold cursor-pointer"
                      >
                        <option value="px">Pixel (px)</option>
                        <option value="grid">Unità Griglia (u)</option>
                        <option value="mm">Millimetri (mm)</option>
                        <option value="cm">Centimetri (cm)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-1.5">
                  <span className="font-bold text-[#141414] uppercase tracking-wider text-[11px] block">
                    Livelli Visivi
                  </span>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#666666]">Linee Griglia</span>
                    <input
                      type="checkbox"
                      checked={config.showGrid}
                      onChange={(e) => setConfig((c) => ({ ...c, showGrid: e.target.checked }))}
                      className="accent-[#141414] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#666666]">Righelli Assi</span>
                    <input
                      type="checkbox"
                      checked={config.showRulers}
                      onChange={(e) => setConfig((c) => ({ ...c, showRulers: e.target.checked }))}
                      className="accent-[#141414] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-[#666666]">Etichette Coordinate</span>
                    <input
                      type="checkbox"
                      checked={config.showCoordinatesOnCanvas}
                      onChange={(e) => setConfig((c) => ({ ...c, showCoordinatesOnCanvas: e.target.checked }))}
                      className="accent-[#141414] w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowSettingsMenu(false)}
                    className="w-full py-1.5 bg-[#141414] hover:bg-[#333333] text-white text-xs font-bold uppercase transition cursor-pointer"
                  >
                    CHIUDI
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MAIN DOWNLOAD / EXPORT BUTTON (HIGH VISIBILITY) */}
          <div className="relative" ref={exportRef}>
            <button
              id="export-dropdown-toggle"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowSettingsMenu(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold border-2 border-[#141414] shadow-[2px_2px_0px_#141414] transition cursor-pointer ${
                showExportMenu
                  ? 'bg-[#141414] text-white'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-black'
              }`}
              title="Scarica il tuo disegno (PNG, SVG, CSS, CSV, JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SCARICA</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Export Dropdown Popover */}
            {showExportMenu && (
              <div
                id="export-dropdown-popover"
                className="absolute right-0 top-9 w-64 max-w-[calc(100vw-20px)] bg-white border-2 border-[#141414] shadow-[4px_4px_0px_#141414] p-1.5 z-50 text-xs text-[#141414] divide-y divide-[#141414]/20 custom-scrollbar"
              >
                {/* CSS / HTML Option */}
                <div className="p-1">
                  <button
                    id="export-css-action"
                    onClick={() => {
                      onOpenCssModal();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 bg-[#141414] text-white hover:bg-[#333333] text-left font-bold transition cursor-pointer"
                  >
                    <Code className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span>Codice CSS & HTML</span>
                        <span className="text-[8px] bg-emerald-500 text-black px-1 font-bold">WEB</span>
                      </div>
                      <span className="text-[9px] text-neutral-300 font-normal">HTML+CSS, background, clip-path</span>
                    </div>
                  </button>
                </div>

                {/* Graphic Download Formats */}
                <div className="p-1 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#888888] px-1 block">Immagini Grafiche</span>
                  <button
                    id="export-png-action"
                    onClick={() => {
                      onExportPNG();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#141414] hover:text-white text-left font-bold transition cursor-pointer"
                  >
                    <Image className="w-4 h-4 text-emerald-600" />
                    <span>Scarica Immagine PNG</span>
                  </button>
                  <button
                    id="export-svg-action"
                    onClick={() => {
                      onExportSVG();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#141414] hover:text-white text-left font-bold transition cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span>Scarica Vettoriale SVG</span>
                  </button>
                </div>

                {/* Data Coordinates Formats */}
                <div className="p-1 space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#888888] px-1 block">Tabelle Coordinate</span>
                  <button
                    id="export-csv-action"
                    onClick={() => {
                      onExportCSV();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#141414] hover:text-white text-left font-bold transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                    <span>Scarica Foglio CSV (Excel)</span>
                  </button>
                  <button
                    id="export-json-action"
                    onClick={() => {
                      onExportJSON();
                      setShowExportMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#141414] hover:text-white text-left font-bold transition cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <span>Scarica File JSON</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snap Help Modal */}
      {showSnapHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-mono"
          onClick={() => setShowSnapHelp(false)}
        >
          <div
            className="w-full max-w-md bg-white border-2 border-[#141414] shadow-[6px_6px_0px_#141414] p-4 text-[#141414] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-[#141414] pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-[#141414] text-emerald-400">
                  <Magnet className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm uppercase">Che cos'è lo SNAP alla griglia?</h3>
              </div>
              <button
                onClick={() => setShowSnapHelp(false)}
                className="text-xs font-bold px-1.5 py-0.5 border border-[#141414] hover:bg-[#141414] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-2 text-[#333333] leading-relaxed">
              <p>
                <strong>🧲 SNAP (Calamita):</strong> È la funzione che <strong>aggancia automaticamente</strong> il mouse o la penna agli incroci esatti della griglia (ad esempio ogni 10px, 20px o 50px).
              </p>
              <div className="p-2 bg-[#E4E3E0] border border-[#141414]/30 space-y-1 text-[11px]">
                <p>
                  • <strong>SNAP: ON (Attivo)</strong>: Ideale per disegni geometrici precisi, diagrammi, linee perfettamente orizzontali/verticali o rettangoli allineati al millimetro.
                </p>
                <p>
                  • <strong>SNAP: OFF (Disattivato)</strong>: Ideale per il disegno a mano libera e per tracciare curve fluide pixel per pixel senza che il cursore venga "calamitato".
                </p>
              </div>
              <p className="text-[11px] text-[#666666]">
                Puoi attivarlo o disattivarlo in qualsiasi momento cliccando sul pulsante <strong>SNAP</strong> nella barra in alto.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSnapHelp(false)}
                className="px-4 py-1.5 bg-[#141414] text-white text-xs font-bold transition hover:bg-[#333333] cursor-pointer"
              >
                HO CAPITO
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
