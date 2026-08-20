import React, { useState } from 'react';
import { Stroke, GridConfig, Point } from '../types';
import {
  canvasToUserCoord,
  calculateDistance,
  formatCoordString,
  exportStrokesToCSV,
  exportStrokesToJSON,
} from '../utils/coordinateMath';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  FileSpreadsheet,
  FileCode,
  Crosshair,
  Pencil,
  Spline,
  Square,
  Circle,
  MapPin,
  Maximize2,
  Code,
} from 'lucide-react';

interface CoordinateInspectorProps {
  strokes: Stroke[];
  selectedStrokeId: string | null;
  onSelectStroke: (id: string | null) => void;
  onDeleteStroke: (id: string) => void;
  onClearAll: () => void;
  canvasWidth: number;
  canvasHeight: number;
  config: GridConfig;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenCssModal?: (strokeId?: string) => void;
}

export const CoordinateInspector: React.FC<CoordinateInspectorProps> = ({
  strokes,
  selectedStrokeId,
  onSelectStroke,
  onDeleteStroke,
  onClearAll,
  canvasWidth,
  canvasHeight,
  config,
  isOpen,
  onToggleOpen,
  onOpenCssModal,
}) => {
  const [expandedStrokeIds, setExpandedStrokeIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterTool, setFilterTool] = useState<string>('all');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedStrokeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyStrokeCoords = (stroke: Stroke, e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = stroke.points.map((p) => {
      const u = canvasToUserCoord(p, canvasWidth, canvasHeight, config);
      return [u.x, u.y];
    });
    copyToClipboard(JSON.stringify(coords), stroke.id);
  };

  const handleDownloadCSV = () => {
    const csv = exportStrokesToCSV(strokes, canvasWidth, canvasHeight, config);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `coordinate-data-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    const json = exportStrokesToJSON(strokes, canvasWidth, canvasHeight, config);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `coordinate-strokes-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'pencil':
        return <Pencil className="w-3.5 h-3.5 text-blue-500" />;
      case 'line':
        return <Spline className="w-3.5 h-3.5 text-emerald-500" />;
      case 'polyline':
        return <Crosshair className="w-3.5 h-3.5 text-indigo-500" />;
      case 'rect':
        return <Square className="w-3.5 h-3.5 text-amber-500" />;
      case 'circle':
        return <Circle className="w-3.5 h-3.5 text-purple-500" />;
      case 'marker':
        return <MapPin className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const filteredStrokes = strokes.filter((s) => {
    if (filterTool === 'all') return true;
    return s.tool === filterTool;
  });

  const totalPointsCount = strokes.reduce((acc, s) => acc + s.points.length, 0);

  return (
    <aside
      id="coordinate-inspector-panel"
      className={`fixed top-14 right-3 bottom-14 z-30 transition-all duration-200 flex flex-col bg-white border-2 border-[#141414] shadow-[4px_4px_0px_#141414] overflow-hidden ${
        isOpen ? 'w-80 md:w-96' : 'w-11'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b-2 border-[#141414] bg-[#E4E3E0] select-none cursor-pointer"
        onClick={onToggleOpen}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1 bg-[#141414] text-white">
            <Layers className="w-3.5 h-3.5" />
          </div>
          {isOpen && (
            <div>
              <h2 className="text-xs font-bold text-[#141414] tracking-wide uppercase font-mono">
                COORDINATE INSPECTOR
              </h2>
              <p className="text-[9px] text-[#666666] font-mono uppercase font-bold">
                {strokes.length} TRATTI • {totalPointsCount} PUNTI
              </p>
            </div>
          )}
        </div>
        <button
          id="toggle-inspector-btn"
          className="p-1 text-[#141414] hover:bg-[#141414]/10 transition cursor-pointer"
          title={isOpen ? 'Collassa pannello' : 'Espandi coordinate'}
        >
          {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Quick Actions & Filter */}
          <div className="p-2 border-b-2 border-[#141414] bg-[#E4E3E0]/40 flex flex-col gap-1.5 font-mono">
            <div className="flex items-center justify-between gap-1">
              <select
                id="filter-tool-select"
                value={filterTool}
                onChange={(e) => setFilterTool(e.target.value)}
                className="bg-white border border-[#141414] text-[#141414] text-xs px-2 py-1 focus:outline-none font-mono font-bold flex-1"
              >
                <option value="all">TUTTI I TRATTI ({strokes.length})</option>
                <option value="line">LINEE</option>
                <option value="polyline">POLIGONALI</option>
                <option value="rect">RETTANGOLI</option>
                <option value="circle">CERCHI</option>
                <option value="pencil">MANO LIBERA</option>
                <option value="marker">PUNTI</option>
              </select>

              {onOpenCssModal && (
                <button
                  id="inspector-css-btn"
                  onClick={() => onOpenCssModal(selectedStrokeId || undefined)}
                  disabled={strokes.length === 0}
                  className="px-1.5 py-1 bg-[#141414] hover:bg-[#333333] disabled:opacity-30 text-emerald-400 font-bold border border-[#141414] transition cursor-pointer text-xs flex items-center gap-1"
                  title="Genera Coordinate CSS (clip-path, motion, posizioni)"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>CSS</span>
                </button>
              )}

              <button
                id="export-csv-btn"
                onClick={handleDownloadCSV}
                disabled={strokes.length === 0}
                className="p-1 bg-white hover:bg-[#141414] hover:text-white disabled:opacity-30 text-[#141414] border border-[#141414] transition cursor-pointer"
                title="Esporta Coordinate in CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </button>
              <button
                id="export-json-btn"
                onClick={handleDownloadJSON}
                disabled={strokes.length === 0}
                className="p-1 bg-white hover:bg-[#141414] hover:text-white disabled:opacity-30 text-[#141414] border border-[#141414] transition cursor-pointer"
                title="Esporta Coordinate in JSON"
              >
                <FileCode className="w-3.5 h-3.5" />
              </button>
              {strokes.length > 0 && (
                <button
                  id="clear-all-strokes-btn"
                  onClick={onClearAll}
                  className="p-1 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-[#141414] transition cursor-pointer"
                  title="Cancella tutti i tratti"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Strokes and Coordinates List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-[#E4E3E0]/20 font-mono">
            {filteredStrokes.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-8 h-8 bg-white border border-[#141414] flex items-center justify-center mx-auto mb-2 text-[#666666]">
                  <Crosshair className="w-4 h-4" />
                </div>
                <p className="text-xs text-[#141414] font-bold uppercase font-mono">Nessun dato registrato</p>
                <p className="text-[10px] text-[#666666] mt-1 font-mono">
                  Disegna sul canvas per generare coordinate e misure in tempo reale.
                </p>
              </div>
            ) : (
              filteredStrokes.map((stroke, index) => {
                const isSelected = selectedStrokeId === stroke.id;
                const isExpanded = !!expandedStrokeIds[stroke.id];
                const firstPoint = stroke.points[0];
                const lastPoint = stroke.points[stroke.points.length - 1];
                const firstU = firstPoint ? canvasToUserCoord(firstPoint, canvasWidth, canvasHeight, config) : null;
                const lastU = lastPoint ? canvasToUserCoord(lastPoint, canvasWidth, canvasHeight, config) : null;

                return (
                  <div
                    key={stroke.id}
                    id={`stroke-item-${stroke.id}`}
                    onClick={() => onSelectStroke(isSelected ? null : stroke.id)}
                    className={`border-2 transition-all duration-100 overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'bg-[#141414] text-white border-[#141414] shadow-sm'
                        : 'bg-white hover:bg-[#E4E3E0]/60 border-[#141414] text-[#141414]'
                    }`}
                  >
                    {/* Item Header */}
                    <div className="p-2 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={(e) => toggleExpand(stroke.id, e)}
                          className={`p-0.5 transition cursor-pointer ${
                            isSelected ? 'text-white hover:bg-white/20' : 'text-[#141414] hover:bg-[#141414]/10'
                          }`}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 shrink-0 border border-neutral-400"
                            style={{ backgroundColor: stroke.color }}
                          />
                          {getToolIcon(stroke.tool)}
                        </div>
                        <div className="truncate">
                          <span className={`text-xs font-bold font-mono uppercase ${isSelected ? 'text-white' : 'text-[#141414]'}`}>
                            #{index + 1} {stroke.tool}
                          </span>
                          <span className={`text-[10px] font-mono ml-1.5 ${isSelected ? 'text-neutral-300' : 'text-[#666666]'}`}>
                            [{stroke.points.length}P]
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onOpenCssModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectStroke(stroke.id);
                              onOpenCssModal(stroke.id);
                            }}
                            className={`px-1 py-0.5 text-[9px] font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-black border-emerald-400'
                                : 'bg-[#E4E3E0] text-[#141414] border-[#141414] hover:bg-[#141414] hover:text-white'
                            }`}
                            title="Genera CSS per questo elemento"
                          >
                            CSS
                          </button>
                        )}
                        <button
                          onClick={(e) => handleCopyStrokeCoords(stroke, e)}
                          className={`p-1 transition cursor-pointer ${
                            isSelected ? 'text-neutral-300 hover:text-white' : 'text-[#666666] hover:text-[#141414]'
                          }`}
                          title="Copia Coordinate"
                        >
                          {copiedId === stroke.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStroke(stroke.id);
                          }}
                          className={`p-1 transition cursor-pointer ${
                            isSelected ? 'text-rose-300 hover:text-rose-100' : 'text-[#666666] hover:text-rose-600'
                          }`}
                          title="Elimina tratto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Summary row */}
                    {firstU && lastU && (
                      <div className={`px-2 pb-1.5 pt-0 text-[10px] font-mono flex items-center justify-between border-t ${
                        isSelected ? 'border-neutral-700 text-neutral-300' : 'border-neutral-200 text-[#666666]'
                      }`}>
                        <div>
                          <span className={isSelected ? 'text-neutral-400' : 'text-[#888888]'}>DA: </span>
                          <span className="font-bold">{formatCoordString(firstU, config.unit)}</span>
                        </div>
                        <div>
                          <span className={isSelected ? 'text-neutral-400' : 'text-[#888888]'}>A: </span>
                          <span className="font-bold">{formatCoordString(lastU, config.unit)}</span>
                        </div>
                      </div>
                    )}

                    {/* Expanded Points Table */}
                    {isExpanded && (
                      <div className="bg-[#E4E3E0] text-[#141414] p-1.5 border-t border-[#141414] max-h-48 overflow-y-auto custom-scrollbar font-mono text-[10px]">
                        <div className="grid grid-cols-4 gap-1 text-[#141414] font-bold pb-1 border-b border-[#141414]/30 px-1 uppercase text-[9px]">
                          <span>PT</span>
                          <span>X({config.unit})</span>
                          <span>Y({config.unit})</span>
                          <span>Δ L</span>
                        </div>
                        {stroke.points.map((pt, pIdx) => {
                          const u = canvasToUserCoord(pt, canvasWidth, canvasHeight, config);
                          const prevPt = pIdx > 0 ? stroke.points[pIdx - 1] : null;
                          const deltaDist = prevPt ? Math.round(calculateDistance(prevPt, pt)) : 0;

                          return (
                            <div
                              key={pIdx}
                              className="grid grid-cols-4 gap-1 py-0.5 px-1 border-b border-[#141414]/10 hover:bg-white text-[#141414] font-semibold"
                            >
                              <span className="text-[#666666]">{pIdx + 1}</span>
                              <span className="text-emerald-700 font-bold">{u.x}</span>
                              <span className="text-blue-700 font-bold">{u.y}</span>
                              <span className="text-[#141414]">
                                {pIdx === 0 ? '-' : `+${deltaDist}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </aside>
  );
};
