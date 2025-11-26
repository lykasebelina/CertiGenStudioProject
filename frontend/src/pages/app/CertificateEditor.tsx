// src/pages/app/CertificateEditor.tsx

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas"; // Import html2canvas
import jsPDF from 'jspdf'; // NEW: Import jsPDF for PDF generation
import { CertificateElement } from "../../types/certificate";
import { useCertificate } from "../../context/CertificateContext";
import { supabase } from "../../lib/supabaseClient"; // Ensure path is correct
// Import ExportFormat type from EditorTopBar
import EditorTopBar, { ExportFormat } from "../../components/EditorTopBar"; 
import EditorBottomBar from "../../components/EditorBottomBar";
import EditorDropdownSidebar from "../../components/EditorDropdownSidebar";
import KonvaCanvas from "../../components/KonvaCanvas";

// NEW IMPORT: Spreadsheet library (Must be installed: npm install xlsx)
import * as XLSX from 'xlsx'; 

const CertificateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { currentCertificate, setCurrentCertificate } = useCertificate();

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(75);
  const [activeToolTab, setActiveToolTab] = useState<"select" | "pattern">("select");
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0);

  // Loading states
  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // NEW STATE: To prevent multiple bulk uploads simultaneously
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false); 

  const handleElementSelect = useCallback((id: string | null) => {
    setSelectedElement(id);
  }, []);

  const handleElementUpdate = useCallback(
    (id: string, updates: Partial<CertificateElement>) => {
      if (!currentCertificate) return;

      const updatedElements = currentCertificate.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );

      setCurrentCertificate({
        ...currentCertificate,
        elements: updatedElements,
      });
    },
    [currentCertificate, setCurrentCertificate]
  );

  const handleTextStyleChange = useCallback(
    (style: {
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: string;
      fontStyle?: string;
      textDecoration?: string; // Added for Underline
      color?: string; // Added for Color
      textAlign?: string;
    }) => {
      if (!selectedElement || !currentCertificate) return;
      handleElementUpdate(selectedElement, style);
    },
    [selectedElement, currentCertificate, handleElementUpdate]
  );

  const handleDeleteElement = useCallback(() => {
    if (!selectedElement || !currentCertificate) return;
    const updatedElements = currentCertificate.elements.filter((el) => el.id !== selectedElement);
    setCurrentCertificate({
      ...currentCertificate,
      elements: updatedElements,
    });
    setSelectedElement(null);
  }, [selectedElement, currentCertificate, setCurrentCertificate]);

  // --- SAVE FUNCTIONALITY (No change) ---
  const handleSaveCertificate = async () => {
    if (!currentCertificate) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("certificates")
        .update({
          elements: currentCertificate.elements,
          updated_at: new Date().toISOString(), 
        })
        .eq("id", currentCertificate.id);

      if (error) {
        throw error;
      }

      alert("Certificate saved successfully!");
    } catch (err: any) {
      console.error("Error saving certificate:", err);
      alert("Failed to save certificate. See console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- DOWNLOAD FUNCTIONALITY (Updated with PDF) ---
  const handleDownload = async (format: ExportFormat) => {
    if (!currentCertificate) return;

    const element = document.getElementById("certificate-render-target");
    if (!element) {
      alert("Could not find certificate element to capture.");
      return;
    }

    const fileName = `${currentCertificate.name || "certificate"}`;

    try {
      switch (format) {
        case "jpg":
        case "png": {
          const isJpg = format === "jpg";
          const mimeType = isJpg ? "image/jpeg" : "image/png";
          const quality = isJpg ? 0.9 : 1.0;
          const extension = isJpg ? ".jpg" : ".png";

          const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 2, 
            backgroundColor: currentCertificate.backgroundColor || "#ffffff",
          });

          const image = canvas.toDataURL(mimeType, quality);

          const link = document.createElement("a");
          link.href = image;
          link.download = `${fileName}${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          break;
        }

        case "pdf": {
          // 1. Capture the certificate as a high-res image
          const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 2, // High resolution for better PDF quality
            backgroundColor: currentCertificate.backgroundColor || "#ffffff",
          });

          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const imgWidth = currentCertificate.width; // Use actual canvas dimensions
          const imgHeight = currentCertificate.height;

          // Determine orientation based on certificate size
          const orientation = imgWidth > imgWidth ? 'l' : 'p';
          
          // Create PDF instance (units in points (pt), default A4 size)
          const pdf = new jsPDF(orientation, 'pt', 'a4'); 

          // Calculate A4 dimensions in points (72 points per inch)
          const a4Width = orientation === 'l' ? 841.89 : 595.28;
          const a4Height = orientation === 'l' ? 595.28 : 841.89;

          // Calculate aspect ratio
          const ratio = Math.min(a4Width / imgWidth, a4Height / imgHeight);
          const pdfImgWidth = imgWidth * ratio;
          const pdfImgHeight = imgHeight * ratio;
          
          // Center the image on the PDF page
          const xOffset = (a4Width - pdfImgWidth) / 2;
          const yOffset = (a4Height - pdfImgHeight) / 2;

          // Add the image to the PDF
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, pdfImgWidth, pdfImgHeight);

          // Save the PDF
          pdf.save(`${fileName}.pdf`);
          break;
        }

        case "pptx": {
          alert("PPTX export is not yet implemented (requires server-side or complex client-side generation).");
          break;
        }

        default:
          alert("Invalid export format selected.");
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Failed to download ${format.toUpperCase()}.`);
    }
  };


  // --- NEW HANDLER: Bulk Generation Logic ---
  const handleAutoBulkUpload = async (file: File) => {
    if (!currentCertificate || isBulkProcessing) {
      alert("Please ensure a certificate template is loaded or wait for current process to finish.");
      return;
    }

    setIsBulkProcessing(true);
    let names: string[] = [];

    // 1. Find the name placeholder element
    // Assuming the name placeholder is the text element with content "Alex Plainwhite"
    const PLACEHOLDER_TEXT = "Alex Plainwhite";
    const placeholderElement = currentCertificate.elements.find(
      el => el.content === PLACEHOLDER_TEXT && el.type === "text"
    );

    if (!placeholderElement) {
      alert(`Could not find the name placeholder element (content: "${PLACEHOLDER_TEXT}") in the template.`);
      setIsBulkProcessing(false);
      return;
    }
    
    try {
        // 2. Read the file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assume the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet data to JSON array (assuming header row exists)
        // Set header: 1 to get array of arrays (easier for simple column access)
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Assuming names are in the first column (index 0), skipping header row (index 0)
        // Filter out non-string/empty values
        names = json.slice(1).map(row => row[0])
                    .filter(name => typeof name === 'string' && name.trim() !== '');

    } catch (error) {
        console.error("Error reading file:", error);
        alert("Failed to read the spreadsheet file. Ensure it's a valid Excel/CSV file.");
        setIsBulkProcessing(false);
        return;
    }

    if (names.length === 0) {
        alert("No names found in the first column of the spreadsheet after the header row.");
        setIsBulkProcessing(false);
        return;
    }

    // 3. Prepare the new certificate data structure
    
    // Filter out the original placeholder element
    const templateElements = currentCertificate.elements.filter(el => el.id !== placeholderElement.id);
    
    let processedCount = 0;
    
    // In a real application, you would iterate and send this data to a server API to save 
    // new certificates to the database.
    names.forEach((name) => {
        // Create a deep copy of the template elements
        const newElements: CertificateElement[] = JSON.parse(JSON.stringify(templateElements));
        
        // Create the new name element based on the placeholder template
        const newNameElement: CertificateElement = {
            ...placeholderElement,
            id: `name-${Date.now()}-${processedCount}`, // Ensure unique ID
            content: name, // Insert the new name
        };
        
        const finalElements = [...newElements, newNameElement];
        
        // --- TEMPORARY ACTION FOR DEMONSTRATION: Update current view to the last generated name ---
        // You would typically save this 'finalElements' list as a new certificate in the database.
        
        if (processedCount === names.length - 1) {
             setCurrentCertificate({
                ...currentCertificate,
                elements: finalElements,
                name: `${currentCertificate.name || 'Certificate'} - ${name} (Last Processed)`
             });
        }
        processedCount++;
    });

    alert(`${processedCount} certificates processed! The last generated name has been loaded into the editor.`);

    setIsBulkProcessing(false);
  };
  
  if (!currentCertificate) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-300">
        <p className="text-xl mb-4">No certificate loaded</p>
        <button
          onClick={() => navigate("/")}
          className="mt-8 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition"
        >
          Create New Certificate
        </button>
      </div>
    );
  }

  const scale = zoom / 100;

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col relative">
      <EditorTopBar
        activeToolTab={activeToolTab}
        setActiveToolTab={setActiveToolTab}
        selectedElement={selectedElement}
        onTextStyleChange={handleTextStyleChange}
        onDeleteElement={handleDeleteElement}
        onSave={handleSaveCertificate}
        onDownload={handleDownload} // Uses the updated handler
        isSaving={isSaving || isBulkProcessing}
      />
      {/* Show processing state if bulk uploading */}
      {isBulkProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[60] text-white text-xl font-bold">
            Processing bulk certificates...
          </div>
      )}


      <div
        id="certificate-container"
        className="flex-1 overflow-auto bg-slate-900 flex justify-center items-start transition-all duration-300 p-10"
        style={{ 
          marginRight: `${rightSidebarWidth}px`,
          // --- FIX: Invisible Scrollbar CSS Properties ---
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
            boxShadow: "0 0 40px rgba(0,0,0,0.5)",
          }}
        >
          {/* WRAPPER ID for html2canvas. */}
          <div id="certificate-render-target" className="bg-white">
            <KonvaCanvas
              width={currentCertificate.width}
              height={currentCertificate.height}
              elements={currentCertificate.elements}
              onElementSelect={handleElementSelect}
              onElementUpdate={handleElementUpdate}
              onImagesLoaded={() => setLoadingImages(false)}
            />
          </div>

          {/* Loading overlay */}
          {loadingImages && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-lg font-semibold z-50 pointer-events-none">
              Loading images...
            </div>
          )}
        </div>
      </div>

      <EditorBottomBar zoom={zoom} setZoom={setZoom} />
      {/* PASS THE NEW HANDLER */}
      <EditorDropdownSidebar 
        onWidthChange={setRightSidebarWidth} 
        onAutoBulkUpload={handleAutoBulkUpload}
      />
    </div>
  );
};

export default CertificateEditor;