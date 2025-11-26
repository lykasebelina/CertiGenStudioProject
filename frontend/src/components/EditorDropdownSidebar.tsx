// src/components/EditorDropdownSidebar.tsx

import React, { useEffect, useRef } from "react";
// ADDED ListPlus, REMOVED Users
import { Sparkles, Wand2, ListPlus, Type, Image, Palette } from "lucide-react";

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface EditorDropdownSidebarProps {
  onWidthChange?: (width: number) => void;
  // NEW PROP: Function to handle the uploaded file
  onAutoBulkUpload: (file: File) => void; 
}

// Define the permanent width of the sidebar
const SIDEBAR_WIDTH = 80; 

const EditorDropdownSidebar: React.FC<EditorDropdownSidebarProps> = ({ onWidthChange, onAutoBulkUpload }) => {
  
  // NEW REF: To access the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sidebarItems: SidebarItem[] = [
    { id: "ai-autofill", icon: <Sparkles size={20} />, label: "AI Autofill" },
    { id: "ai-design", icon: <Wand2 size={20} />, label: "AI Design" },
    { id: "auto-bulk", icon: <ListPlus size={20} />, label: "Auto Bulk" },
    { id: "text", icon: <Type size={20} />, label: "Text" },
    { id: "image", icon: <Image size={20} />, label: "Image" },
    { id: "brand-kit", icon: <Palette size={20} />, label: "Brand Kit" },
  ];

  // NEW HANDLER: Triggers the hidden file input
  const handleBulkClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // NEW HANDLER: Captures the uploaded file and passes it up
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAutoBulkUpload(file);
    }
    // Reset the input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
    }
  };

  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(SIDEBAR_WIDTH); 
    }
  }, [onWidthChange]);

  return (
    <div 
      className="fixed top-20 bottom-20 right-0 z-50 flex flex-col items-center bg-slate-900 border-l border-slate-700 shadow-2xl transition-all duration-300"
      style={{ width: `${SIDEBAR_WIDTH}px` }}
    >
      <div className="flex flex-col items-center w-full h-full p-1 overflow-y-auto"> 
        
        {/* HIDDEN FILE INPUT for Bulk Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".xlsx, .xls, .csv" // Accept common spreadsheet formats
          onChange={handleFileChange}
        />

        {sidebarItems.map((item) => (
          <button
            key={item.id}
            // Use handleBulkClick for the Auto Bulk button
            onClick={item.id === 'auto-bulk' ? handleBulkClick : undefined}
            className={`w-full flex flex-col items-center justify-center gap-1.5 px-0.5 py-3 my-1 rounded-lg text-white transition hover:bg-slate-700/70 border-b border-slate-700 last:border-b-0`}
            title={item.label}
          >
            <div className="flex items-center justify-center text-cyan-400">
              {item.icon}
            </div>
            <span className="text-[10px] font-medium text-center leading-tight text-slate-300">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EditorDropdownSidebar;