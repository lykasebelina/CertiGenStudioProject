// src/components/EditorTopBar.tsx

import React, { useState } from "react";
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
  ChevronDown, // New Import for the dropdown icon
} from "lucide-react";

// Define the supported export formats
export type ExportFormat = "jpg" | "png" | "pdf" | "pptx";

interface EditorTopBarProps {
  activeToolTab: "select" | "pattern";
  setActiveToolTab: (tab: "select" | "pattern") => void;
  selectedElement?: string | null;
  onTextStyleChange?: (style: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
    textAlign?: string;
  }) => void;
  onDeleteElement?: () => void;
  onSave?: () => void;
  // CHANGED: onDownload now accepts the format as an argument
  onDownload?: (format: ExportFormat) => void;
  isSaving?: boolean;
}

const EditorTopBar: React.FC<EditorTopBarProps> = ({
  selectedElement,
  onTextStyleChange,
  onDeleteElement,
  onSave,
  onDownload,
  isSaving = false,
}) => {
  const [fontSize, setFontSize] = useState(16.3);
  const [selectedFont, setSelectedFont] = useState("Canva Sans");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  // NEW STATE: For managing the download dropdown visibility
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

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

  const handleFontChange = (font: string) => {
    setSelectedFont(font);
    onTextStyleChange?.({ fontFamily: font });
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    onTextStyleChange?.({ fontSize: size });
  };

  const handleBoldToggle = () => {
    const newBold = !isBold;
    setIsBold(newBold);
    onTextStyleChange?.({ fontWeight: newBold ? "bold" : "normal" });
  };

  const handleItalicToggle = () => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    onTextStyleChange?.({ fontStyle: newItalic ? "italic" : "normal" });
  };

  const handleUnderlineToggle = () => {
    const newUnderline = !isUnderline;
    setIsUnderline(newUnderline);
    onTextStyleChange?.({ textDecoration: newUnderline ? "underline" : "none" });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setTextColor(color);
    onTextStyleChange?.({ color: color });
  };

  // NEW FUNCTION: Handles the format selection from the dropdown
  const handleExport = (format: ExportFormat) => {
    onDownload?.(format);
    setIsDownloadOpen(false); // Close the dropdown after selection
  };

  // List of export options for the dropdown
  const exportOptions: { label: string; format: ExportFormat }[] = [
    { label: "JPG (High Quality)", format: "jpg" },
    { label: "PNG (Transparency)", format: "png" },
    { label: "PDF (Standard Print)", format: "pdf" },
    { label: "PPTX (PowerPoint - Beta)", format: "pptx" },
  ];

  return (
    <div className="flex-none w-full h-20 flex flex-wrap justify-between items-center gap-4 px-5 py-3 bg-slate-900 border-b border-slate-700 z-30">
      
      {/* LEFT: Page Indicator */}
      <div className="px-3 py-1 border-2 border-cyan-400 rounded-full text-white text-sm font-medium">
        Page 1
      </div>

      {/* CENTER: Formatting Tools */}
      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-xl px-4 py-2.5 border-2 border-slate-200">
        
        {/* Font Family */}
        <select
          value={selectedFont}
          onChange={(e) => handleFontChange(e.target.value)}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {fonts.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>

        <div className="w-px h-8 bg-slate-300"></div>

        {/* Font Size */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleFontSizeChange(Math.max(8, fontSize - 0.5))}
            className="p-1.5 hover:bg-slate-100 rounded transition"
          >
            <Minus size={16} className="text-slate-800" />
          </button>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="w-14 px-2 py-1 text-center border border-slate-300 rounded text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            step="0.1"
          />
          <button
            onClick={() => handleFontSizeChange(fontSize + 0.5)}
            className="p-1.5 hover:bg-slate-100 rounded transition"
          >
            <Plus size={16} className="text-slate-800" />
          </button>
        </div>

        <div className="w-px h-8 bg-slate-300"></div>

        {/* Color Picker (Functional) */}
        <div className="relative group">
          <div 
            className="w-9 h-9 rounded-lg border-2 border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden relative"
            style={{ backgroundColor: textColor }}
          >
            {/* The actual input is hidden but covers the button area */}
            <input 
              type="color" 
              value={textColor}
              onChange={handleColorChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Change Text Color"
            />
             {/* Icon only visible if color is very light or transparent, otherwise obscured by bg color */}
            <div className="pointer-events-none mix-blend-difference">
               <Palette size={16} className="text-white filter invert" /> 
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-300"></div>

        {/* Bold */}
        <button
          onClick={handleBoldToggle}
          className={`p-2 rounded-lg transition ${
            isBold ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          }`}
          title="Bold"
        >
          <Bold size={18} />
        </button>

        {/* Italic */}
        <button
          onClick={handleItalicToggle}
          className={`p-2 rounded-lg transition ${
            isItalic ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          }`}
          title="Italic"
        >
          <Italic size={18} />
        </button>

        {/* Underline (New) */}
        <button
          onClick={handleUnderlineToggle}
          className={`p-2 rounded-lg transition ${
            isUnderline ? "bg-slate-800 text-white" : "hover:bg-slate-100 text-slate-800"
          }`}
          title="Underline"
        >
          <Underline size={18} />
        </button>

      </div>

      {/* RIGHT: Actions */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Save Button */}
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg transition text-white font-medium text-sm"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save"}
        </button>

        {/* NEW Download Button Group with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsDownloadOpen(!isDownloadOpen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition text-white font-medium text-sm"
          >
            <Download size={18} />
            Export
            <ChevronDown size={16} className={`transition-transform ${isDownloadOpen ? 'rotate-180' : 'rotate-0'}`}/>
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