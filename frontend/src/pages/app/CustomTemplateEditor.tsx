import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Stage, Layer, Rect } from "react-konva";
import { URLImage, TransformerComponent } from "../../components/CanvasHelpers";
import { ArrowLeft, Undo, Redo, Upload, Plus, Trash2, Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

// --- TYPES ---
interface TemplateElement {
  id: string;
  type: "background" | "innerFrame" | "border" | "corner" | "watermark" | "logo";
  src?: string;      // If image
  color?: string;    // If plain shape
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity?: number;
}

// Unified State for History Tracking
interface CanvasState {
  background: TemplateElement | null;
  innerFrame: TemplateElement | null;
  border: TemplateElement | null;
  cornerFrames: TemplateElement | null;
  watermark: TemplateElement | null;
  logos: TemplateElement[];
}

const INITIAL_STATE: CanvasState = {
  background: null,
  innerFrame: null,
  border: null,
  cornerFrames: null,
  watermark: null,
  logos: [],
};

export default function CustomTemplateEditor() {
  const location = useLocation();
  const { width = 842, height = 595 } = location.state || {};

  // --- ZOOM STATE ---
  const [scale, setScale] = useState(1);

  // --- HISTORY STATE MANAGEMENT ---
  const [history, setHistory] = useState<CanvasState[]>([INITIAL_STATE]);
  const [historyStep, setHistoryStep] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const currentState = history[historyStep];

  const pushToHistory = (newState: CanvasState) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  // --- ACTIONS ---

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3)); // Max 300%
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5)); // Min 50%
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      setSelectedId(null);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      setSelectedId(null);
    }
  };

  const handleChange = (id: string, newAttrs: Partial<TemplateElement>) => {
    const nextState = { ...currentState };
    const updateObj = (el: TemplateElement | null) => el?.id === id ? { ...el, ...newAttrs } as TemplateElement : el;

    if (nextState.background?.id === id) nextState.background = updateObj(nextState.background);
    else if (nextState.innerFrame?.id === id) nextState.innerFrame = updateObj(nextState.innerFrame);
    else if (nextState.border?.id === id) nextState.border = updateObj(nextState.border);
    else if (nextState.cornerFrames?.id === id) nextState.cornerFrames = updateObj(nextState.cornerFrames);
    else if (nextState.watermark?.id === id) nextState.watermark = updateObj(nextState.watermark);
    else {
      nextState.logos = nextState.logos.map(logo => logo.id === id ? { ...logo, ...newAttrs } as TemplateElement : logo);
    }
    pushToHistory(nextState);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    const nextState = { ...currentState };

    if (nextState.background?.id === selectedId) nextState.background = null;
    if (nextState.innerFrame?.id === selectedId) nextState.innerFrame = null;
    if (nextState.border?.id === selectedId) nextState.border = null;
    if (nextState.cornerFrames?.id === selectedId) nextState.cornerFrames = null;
    if (nextState.watermark?.id === selectedId) nextState.watermark = null;
    nextState.logos = nextState.logos.filter(l => l.id !== selectedId);

    pushToHistory(nextState);
    setSelectedId(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string, option: "fit" | "keep") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;

    img.onload = () => {
      let w = img.width;
      let h = img.height;
      let x = 0;
      let y = 0;

      if (option === "fit") { w = width; h = height; }
      if (option === "keep") { x = (width - w) / 2; y = (height - h) / 2; }

      const newEl: TemplateElement = {
        id: `${type}-${Date.now()}`,
        type: type as any,
        src: url,
        x, y, width: w, height: h,
        rotation: 0
      };

      const nextState = { ...currentState };

      if (type === "background") nextState.background = newEl;
      else if (type === "innerFrame") {
        nextState.innerFrame = option === 'fit' 
           ? { ...newEl, width: width * 0.9, height: height * 0.9, x: width * 0.05, y: height * 0.05 } 
           : newEl;
      }
      else if (type === "border") nextState.border = newEl;
      else if (type === "corner") nextState.cornerFrames = newEl;
      else if (type === "watermark") nextState.watermark = { ...newEl, opacity: 0.3 };
      else if (type === "logo") {
        nextState.logos = [...nextState.logos, newEl];
      }

      pushToHistory(nextState);
    };
    e.target.value = ""; 
  };

  const handleColor = (type: string, color: string) => {
    const newEl: TemplateElement = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      color: color,
      x: type === 'innerFrame' ? width * 0.05 : 0,
      y: type === 'innerFrame' ? height * 0.05 : 0,
      width: type === 'innerFrame' ? width * 0.9 : width,
      height: type === 'innerFrame' ? height * 0.9 : height,
      rotation: 0,
    };

    const nextState = { ...currentState };
    if (type === "background") nextState.background = newEl;
    if (type === "innerFrame") nextState.innerFrame = newEl;
    pushToHistory(nextState);
  };

  const renderElement = (el: TemplateElement | null) => {
    if (!el) return null;
    const isSelected = selectedId === el.id;

    const commonProps = {
      id: el.id,
      x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation, opacity: el.opacity ?? 1,
      draggable: true,
      onClick: () => setSelectedId(el.id),
      onTap: () => setSelectedId(el.id),
      onDragStart: () => {
         if(selectedId !== el.id) setSelectedId(el.id);
      },
      onDragEnd: (e: any) => {
        handleChange(el.id, { x: e.target.x(), y: e.target.y() });
      },
      onTransformEnd: (e: any) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        // Reset node scale and update width/height manually
        node.scaleX(1); node.scaleY(1);
        handleChange(el.id, {
          x: node.x(), y: node.y(), width: Math.max(5, node.width() * scaleX), height: Math.max(5, node.height() * scaleY), rotation: node.rotation(),
        });
      },
    };

    if (el.color) {
      return <Rect {...commonProps} fill={el.color} stroke={isSelected ? "#0096FF" : "transparent"} strokeWidth={isSelected ? 2 : 0} />;
    }
    if (el.src) {
      return <URLImage {...commonProps} src={el.src} isSelected={isSelected} />;
    }
    return null;
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if((e.ctrlKey || e.metaKey) && e.key === 'z') {
              e.preventDefault();
              handleUndo();
          }
          if((e.ctrlKey || e.metaKey) && e.key === 'y') {
              e.preventDefault();
              handleRedo();
          }
          if(e.key === 'Delete' || e.key === 'Backspace') {
              if(selectedId) handleDelete();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history, selectedId]);

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      
      {/* --- LEFT PANEL: CANVAS PREVIEW --- */}
      <div className="flex-1 bg-gray-950 flex flex-col relative min-w-0">
        
        {/* Toolbar */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-6 justify-between z-10">
            <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">
                    {width}px × {height}px
                </span>
                
                {/* ZOOM CONTROLS */}
                <div className="flex items-center bg-gray-900 rounded border border-gray-700 ml-4">
                   <button 
                       onClick={handleZoomOut}
                       className="p-2 text-gray-200 hover:bg-gray-700 border-r border-gray-700"
                       title="Zoom Out"
                   >
                       <ZoomOut size={16} />
                   </button>
                   <span className="px-3 text-xs text-gray-300 w-16 text-center select-none">
                       {Math.round(scale * 100)}%
                   </span>
                   <button 
                       onClick={handleZoomIn}
                       className="p-2 text-gray-200 hover:bg-gray-700 border-l border-gray-700"
                       title="Zoom In"
                   >
                       <ZoomIn size={16} />
                   </button>
                </div>

                <div className="flex items-center bg-gray-900 rounded border border-gray-700 ml-2">
                    <button 
                        onClick={handleUndo} 
                        disabled={historyStep === 0}
                        className={`p-2 border-r border-gray-700 ${historyStep === 0 ? 'text-gray-600' : 'text-gray-200 hover:bg-gray-700'}`}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button 
                        onClick={handleRedo} 
                        disabled={historyStep === history.length - 1}
                        className={`p-2 ${historyStep === history.length - 1 ? 'text-gray-600' : 'text-gray-200 hover:bg-gray-700'}`}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={16} />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                 <button 
                    onClick={handleDelete} 
                    disabled={!selectedId}
                    className={`p-2 rounded transition-colors ${selectedId ? 'text-red-400 hover:bg-red-900/30' : 'text-gray-600 cursor-not-allowed'}`}
                    title="Delete Selected Element"
                 >
                    <Trash2 size={18} />
                 </button>
                 <div className="h-6 w-px bg-gray-700 mx-2"></div>
                 <button className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded text-sm font-medium transition-colors">
                    Save Template
                 </button>
            </div>
        </div>

        {/* Canvas Area */}
        <div 
            className="flex-1 overflow-auto flex justify-center items-center p-12 bg-gray-900"
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if(target.tagName === 'DIV' || target.className.includes('bg-gray-900')) setSelectedId(null);
            }}
        >
            <div className="shadow-2xl border border-gray-700 bg-white relative">
                <Stage 
                    width={width * scale}   // Scale width for scrollbars
                    height={height * scale} // Scale height for scrollbars
                    scaleX={scale}          // Scale content X
                    scaleY={scale}          // Scale content Y
                    onMouseDown={(e) => {
                        const clickedOnEmpty = e.target === e.target.getStage();
                        if (clickedOnEmpty) setSelectedId(null);
                    }}
                >
                    <Layer>
                        {renderElement(currentState.background)}
                        {renderElement(currentState.innerFrame)}
                        {renderElement(currentState.border)}
                        {renderElement(currentState.cornerFrames)}
                        {renderElement(currentState.watermark)}
                        
                        {currentState.logos.map((logo) => (
                            <React.Fragment key={logo.id}>
                                {renderElement(logo)}
                            </React.Fragment>
                        ))}

                        <TransformerComponent selectedId={selectedId} />
                    </Layer>
                </Stage>
            </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: TEMPLATE SETUP --- */}
      <div className="w-80 h-full bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto scrollbar-thin flex-shrink-0 z-20 shadow-xl">
        <div className="p-4 font-bold border-b border-gray-700 flex items-center gap-2">
           <ArrowLeft className="cursor-pointer hover:text-blue-400" size={20} /> Template Setup
        </div>
        
        <Section title="1. Background (Z1)" onUpload={(e: any, opt: any) => handleUpload(e, "background", opt)} onColor={(c: string) => handleColor("background", c)} />
        <Section title="2. Inner Frame (Z2)" onUpload={(e: any, opt: any) => handleUpload(e, "innerFrame", opt)} onColor={(c: string) => handleColor("innerFrame", c)} />
        <Section title="3. Border (Z3)" onUpload={(e: any, opt: any) => handleUpload(e, "border", opt)} hideColor />
        <Section title="4. Corner Frames (Z4)" onUpload={(e: any, opt: any) => handleUpload(e, "corner", opt)} hideColor />
        <Section title="5. Watermark (Z5)" onUpload={(e: any, opt: any) => handleUpload(e, "watermark", opt)} hideColor />
        
        <div className="p-4 border-b border-gray-700">
             <h3 className="font-semibold mb-3 text-blue-400 text-sm">6. Logos (Z18)</h3>
             <label className="flex items-center justify-center gap-2 bg-blue-600 p-2 rounded cursor-pointer hover:bg-blue-700 transition-colors w-full">
                <Plus size={16}/> Add Logo
                <input type="file" hidden accept="image/*" onChange={(e) => handleUpload(e, "logo", "keep")} />
             </label>
        </div>
      </div>

    </div>
  );
}

// --- SUB-COMPONENTS ---
const Section = ({ title, onUpload, onColor, hideColor }: any) => (
    <div className="p-4 border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
        <div className="flex justify-between items-center mb-2">
             <h3 className="font-semibold text-blue-400 text-sm">{title}</h3>
        </div>
        
        {!hideColor && (
            <div className="flex items-center gap-3 mb-3 bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <div className="relative overflow-hidden w-8 h-8 rounded-full border border-gray-600 shadow-sm">
                    <input 
                        type="color" 
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 cursor-pointer border-none" 
                        onChange={(e) => onColor(e.target.value)} 
                    />
                </div>
                <span className="text-xs text-gray-400">Pick Color</span>
            </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
            <label className="bg-gray-700 hover:bg-gray-600 py-2 px-3 rounded text-xs cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                <Maximize size={12} className="text-gray-300"/> 
                <span className="font-medium">Fit to Page</span>
                <input type="file" hidden accept="image/*" onChange={(e) => onUpload(e, "fit")} />
            </label>
            <label className="bg-gray-700 hover:bg-gray-600 py-2 px-3 rounded text-xs cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                <Upload size={12} className="text-gray-300"/> 
                <span className="font-medium">Original</span>
                <input type="file" hidden accept="image/*" onChange={(e) => onUpload(e, "keep")} />
            </label>
        </div>
    </div>
);