import React, { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  Palette,
  Trash2,
  Save,
  Download,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Share,
} from "lucide-react";

export type ExportFormat = "jpg" | "png" | "pdf" | "pptx";

interface EditorTopBarProps {
  activeStyles?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
    textAlign?: string;
    textTransform?: "normal" | "upper" | "lower" | "title";
  };
  selectedElement?: string | null;
  onTextStyleChange?: (style: any) => void;
  onDeleteElement?: () => void;
  onSave?: () => void;
  onDownload?: (format: ExportFormat) => void;
  onUndo?: () => void;
  isSaving?: boolean;
  activeToolTab?: "select" | "pattern";
  setActiveToolTab?: (tab: "select" | "pattern") => void;
  onRevert?: () => void;
  isBulkMode?: boolean;
  onShare?: () => void;
}

const EditorTopBar: React.FC<EditorTopBarProps> = ({
  activeStyles = {},
  selectedElement,
  onTextStyleChange,
  onDeleteElement,
  onSave,
  onDownload,
  onUndo,
  isSaving = false,
  onShare,
}) => {
  const [fontSize, setFontSize] = useState(16.3);
  const [selectedFont, setSelectedFont] = useState("Canva Sans");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [textAlign, setTextAlign] = useState("left");
  const [textCase, setTextCase] = useState("normal");

  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [showTransformMenu, setShowTransformMenu] = useState(false);

  useEffect(() => {
    if (activeStyles.fontSize) setFontSize(activeStyles.fontSize);
    if (activeStyles.fontFamily) setSelectedFont(activeStyles.fontFamily);
    if (activeStyles.color) setTextColor(activeStyles.color);
    setIsBold(activeStyles.fontWeight === "bold");
    setIsItalic(activeStyles.fontStyle === "italic");
    setIsUnderline(activeStyles.textDecoration === "underline");
    if (activeStyles.textAlign) setTextAlign(activeStyles.textAlign);
    if (activeStyles.textTransform) setTextCase(activeStyles.textTransform as string);
  }, [activeStyles]);

  useEffect(() => {
    setShowTransformMenu(false);
    setIsDownloadOpen(false);
  }, [selectedElement]);

  const fonts = [
    "Canva Sans",
    "Arial",
    "Times New Roman",
    "Georgia",
    "Helvetica",
    "Courier New",
    "Verdana",
    "Roboto",
    "Open Sans",
  ];

  const update = (style: any) => {
    if (!selectedElement) return;
    onTextStyleChange?.(style);
  };

  const handleExport = (format: ExportFormat) => {
    onDownload?.(format);
    setIsDownloadOpen(false);
  };

  const exportOptions: { label: string; format: ExportFormat }[] = [
    { label: "JPG (High Quality)", format: "jpg" },
    { label: "PNG (Transparency)", format: "png" },
    { label: "PDF (Standard Print)", format: "pdf" },
    { label: "PPTX (PowerPoint - Beta)", format: "pptx" },
  ];

  return (
    <div className="flex-none w-full h-20 flex flex-wrap justify-between items-center gap-4 px-5 py-3 bg-slate-900 border-b border-slate-700 z-30">

      <div className="px-3 py-1 border-2 border-cyan-400 rounded-full text-white text-sm font-medium">
        Page 1
      </div>

      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-xl px-4 py-2.5 border-2 border-slate-200">

        <select
          value={selectedFont}
          onChange={(e) => {
            setSelectedFont(e.target.value);
            update({ fontFamily: e.target.value });
          }}
          disabled={!selectedElement}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        >
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        <div className="w-px h-8 bg-slate-300"></div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const newSize = Math.max(8, fontSize - 1);
              setFontSize(newSize);
              update({ fontSize: newSize });
            }}
            disabled={!selectedElement}
            className="p-1.5 hover:bg-slate-100 rounded transition disabled:opacity-50"
          >
            <Minus size={16} className="text-slate-800" />
          </button>

          <input
            type="number"
            value={fontSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setFontSize(newSize);
              update({ fontSize: newSize });
            }}
            disabled={!selectedElement}
            className="w-14 px-2 py-1 text-center border border-slate-300 rounded text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          <button
            onClick={() => {
              const newSize = fontSize + 1;
              setFontSize(newSize);
              update({ fontSize: newSize });
            }}
            disabled={!selectedElement}
            className="p-1.5 hover:bg-slate-100 rounded transition disabled:opacity-50"
          >
            <Plus size={16} className="text-slate-800" />
          </button>
        </div>

        <div className="w-px h-8 bg-slate-300"></div>

        <div className="relative group">
          <div
            className={`w-9 h-9 rounded-lg border-2 border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden relative ${
              !selectedElement ? "opacity-50" : ""
            }`}
            style={{ backgroundColor: textColor }}
          >
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                update({ color: e.target.value });
              }}
              disabled={!selectedElement}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="pointer-events-none mix-blend-difference">
              <Palette size={16} className="text-white filter invert" />
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-300"></div>

        <button
          onClick={() => {
            const next = !isBold;
            setIsBold(next);
            update({ fontWeight: next ? "bold" : "normal" });
          }}
          disabled={!selectedElement}
          className={`p-2 rounded-lg transition ${
            isBold ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          } disabled:opacity-50`}
        >
          <Bold size={18} />
        </button>

        <button
          onClick={() => {
            const next = !isItalic;
            setIsItalic(next);
            update({ fontStyle: next ? "italic" : "normal" });
          }}
          disabled={!selectedElement}
          className={`p-2 rounded-lg transition ${
            isItalic ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          } disabled:opacity-50`}
        >
          <Italic size={18} />
        </button>

        <button
          onClick={() => {
            const next = !isUnderline;
            setIsUnderline(next);
            update({ textDecoration: next ? "underline" : "none" });
          }}
          disabled={!selectedElement}
          className={`p-2 rounded-lg transition ${
            isUnderline ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          } disabled:opacity-50`}
        >
          <Underline size={18} />
        </button>

        <div className="w-px h-8 bg-slate-300"></div>

        <div className="relative">
          <button
            onClick={() => {
              if (selectedElement) {
                setShowTransformMenu(!showTransformMenu);
              }
            }}
            className={`p-2 rounded-lg transition ${
              showTransformMenu ? "bg-slate-200" : "hover:bg-slate-100"
            } disabled:opacity-50`}
            disabled={!selectedElement}
          >
            <span className="text-slate-800 font-semibold text-sm">aA</span>
          </button>

          {showTransformMenu && selectedElement && (
            <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-lg border border-slate-200 w-40 z-50 overflow-hidden">
              {["normal", "upper", "lower", "title"].map((value) => (
                <button
                  key={value}
                  onClick={() => {
                    setTextCase(value);
                    update({ textTransform: value });
                    setShowTransformMenu(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-100 text-sm text-slate-800 border-b border-slate-100 last:border-0 ${
                    textCase === value ? "bg-slate-100 font-bold text-blue-600" : ""
                  }`}
                >
                  {value === "normal" && "Normal"}
                  {value === "upper" && "UPPERCASE"}
                  {value === "lower" && "lowercase"}
                  {value === "title" && "Capitalize Words"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-slate-300"></div>

        <div className="flex items-center gap-0.5">
          {[
            { type: "left", icon: <AlignLeft size={18} className="text-slate-800" /> },
            { type: "center", icon: <AlignCenter size={18} className="text-slate-800" /> },
            { type: "right", icon: <AlignRight size={18} className="text-slate-800" /> },
          ].map((btn) => (
            <button
              key={btn.type}
              onClick={() => {
                setTextAlign(btn.type);
                update({ textAlign: btn.type });
              }}
              className={`p-2 rounded-lg transition ${
                textAlign === btn.type ? "bg-slate-200" : "hover:bg-slate-100"
              } disabled:opacity-50`}
              disabled={!selectedElement}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">

        {onUndo && (
          <button
            onClick={onUndo}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-white"
            title="Undo"
          >
            <RotateCcw size={20} />
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition text-white font-medium text-sm"
            title="Share Certificate"
          >
            <Share size={18} />
            Share
          </button>
        )}

        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg transition text-white font-medium text-sm"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save"}
        </button>

        <div className="relative">
          <button
            onClick={() => setIsDownloadOpen(!isDownloadOpen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition text-white font-medium text-sm"
          >
            <Download size={18} />
            Export
            <ChevronDown size={16} className={`transition-transform ${isDownloadOpen ? "rotate-180" : "rotate-0"}`} />
          </button>

          {isDownloadOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-1 z-40 border border-slate-200">
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleExport(option.format)}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-600 mx-2"></div>

        {selectedElement && (
          <button
            onClick={onDeleteElement}
            className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
            title="Delete Element"
          >
            <Trash2 size={20} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default EditorTopBar;
