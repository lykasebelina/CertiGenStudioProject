// src/pages/app/CertificateEditor.tsx

import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';
import { CertificateElement } from "../../types/certificate";
import { useCertificate } from "../../context/CertificateContext";
import { supabase } from "../../lib/supabaseClient"; 
import EditorTopBar, { ExportFormat } from "../../components/EditorTopBar"; 
import EditorBottomBar from "../../components/EditorBottomBar";
import EditorDropdownSidebar from "../../components/EditorDropdownSidebar";
import KonvaCanvas from "../../components/KonvaCanvas";
import * as XLSX from 'xlsx'; 
import { Session } from '@supabase/supabase-js'; 

// Define a type for a single generated certificate for easier handling
interface GeneratedCertificate {
  name: string;
  elements: CertificateElement[];
}

const CertificateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { currentCertificate, setCurrentCertificate } = useCertificate();

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(75);
  const [activeToolTab, setActiveToolTab] = useState<"select" | "pattern">("select");
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0);

  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false); 
  
  const [bulkGeneratedCertificates, setBulkGeneratedCertificates] = useState<GeneratedCertificate[]>([]);

  // 🚀 FIX: Load saved bulk certificates when the template changes
  useEffect(() => {
    // Check if currentCertificate exists and has generated_instances property
    if (currentCertificate && 'generated_instances' in currentCertificate) {
      
      const savedInstances = currentCertificate.generated_instances as GeneratedCertificate[] | undefined;
      
      if (savedInstances && Array.isArray(savedInstances) && savedInstances.length > 0) {
        setBulkGeneratedCertificates(savedInstances);
      } else {
        // If the current template has no saved instances, clear the local view
        setBulkGeneratedCertificates([]);
      }
    }
  }, [currentCertificate]); 


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
      textDecoration?: string;
      color?: string; 
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


  // --- Saves the original certificate template (elements only) ---
  const handleSaveTemplate = async () => {
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

      alert("Certificate template saved successfully!");
    } catch (err: any) {
      console.error("Error saving certificate template:", err);
      alert("Failed to save certificate template. See console for details.");
    } finally {
      setIsSaving(false);
    }
  };


  // --- UPDATED: Saves bulk certificates to the 'generated_instances' column of the current template ---
  const handleSaveBulkCertificates = async () => {
    if (!currentCertificate || bulkGeneratedCertificates.length === 0) return;

    if (!window.confirm(`Are you sure you want to save ${bulkGeneratedCertificates.length} generated certificates to this template? This will overwrite any previously saved bulk exports for this template.`)) {
        return;
    }

    try {
      setIsSaving(true);
      
      // 1. Prepare the data: The bulk generated certificates array
      const dataToSave = bulkGeneratedCertificates;
      
      // 2. Perform the UPDATE on the current template ID
      const { error } = await supabase
        .from("certificates")
        .update({
          generated_instances: dataToSave, 
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentCertificate.id);

      if (error) {
        throw error;
      }
      
      // 3. Update the local context/state to reflect the saved data 
      setCurrentCertificate({
        ...currentCertificate,
        generated_instances: dataToSave,
      });

      alert(`Successfully saved ${bulkGeneratedCertificates.length} generated certificates to the template record!`);

    } catch (err: any) {
      console.error("Error saving bulk certificates:", err);
      alert("Failed to save bulk certificates. Please ensure the 'generated_instances' JSONB column exists in your 'certificates' table.");
    } finally {
      setIsSaving(false);
    }
  };
  // --- END UPDATED SAVE FUNCTION ---
  
  
  // --- NEW: Function to clear the local bulk view and revert to the template ---
  const handleRevertToTemplate = () => {
      if (bulkGeneratedCertificates.length > 0) {
          if (window.confirm("Are you sure you want to exit the bulk view? Any unsaved changes to the generated certificates will be lost.")) {
              setBulkGeneratedCertificates([]);
              alert("Reverted to single template view.");
          }
      }
  };


  const handleDownload = async (format: ExportFormat) => {
    if (!currentCertificate) return;

    if (bulkGeneratedCertificates.length > 0) {
        alert("Please revert the editor to the single template view or implement bulk download logic for all generated certificates.");
        return;
    }

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
          const canvas = await html2canvas(element, {
            useCORS: true,
            scale: 2,
            backgroundColor: currentCertificate.backgroundColor || "#ffffff",
          });

          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const imgWidth = currentCertificate.width;
          const imgHeight = currentCertificate.height;

          const orientation = imgWidth > imgHeight ? 'l' : 'p';
          
          const pdf = new jsPDF(orientation, 'pt', 'a4'); 

          const a4Width = orientation === 'l' ? 841.89 : 595.28;
          const a4Height = orientation === 'l' ? 595.28 : 841.89;

          const ratio = Math.min(a4Width / imgWidth, a4Height / imgHeight);
          const pdfImgWidth = imgWidth * ratio;
          const pdfImgHeight = imgHeight * ratio;
          
          const xOffset = (a4Width - pdfImgWidth) / 2;
          const yOffset = (a4Height - pdfImgHeight) / 2;

          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, pdfImgWidth, pdfImgHeight);

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


  // --- **UPDATED HANDLER**: Bulk Generation with SILENT Auto-Detection ---
  const handleAutoBulkUpload = async (file: File) => {
    if (!currentCertificate || isBulkProcessing) {
      alert("Please ensure a certificate template is loaded or wait for current process to finish.");
      return;
    }
    
    // Clear any existing bulk view before generating new ones
    if (bulkGeneratedCertificates.length > 0) {
        if (!window.confirm("A bulk view is already active. Do you want to generate a new list? (Unsaved changes will be lost)")) {
            return;
        }
    }


    const PLACEHOLDER_TEXT = "{{NAME}}";
    let placeholderElement: CertificateElement | undefined;

    // 1. SEARCH METHOD 1: Look for the explicit {{NAME}} token (Highest Priority)
    placeholderElement = currentCertificate.elements.find(
      el => el.content === PLACEHOLDER_TEXT && el.type === "text"
    );

    // 2. SEARCH METHOD 2: If token is not found, check if a text element is currently SELECTED (Second Highest Priority)
    if (!placeholderElement && selectedElement) {
        const selectedEl = currentCertificate.elements.find(el => el.id === selectedElement && el.type === "text");
        
        if (selectedEl) {
            // SILENTLY use the selected element
            placeholderElement = selectedEl;
        }
    }


    // 3. SEARCH METHOD 3 (A): Font Size Range (Targeting 29-30px - Third Priority)
    if (!placeholderElement) {
        const targetRangeElements = currentCertificate.elements.filter(
            // Check for text elements with font size between 29.0 and 30.0 (inclusive)
            el => el.type === "text" && (el.fontSize ?? 0) >= 29.0 && (el.fontSize ?? 0) <= 30.0
        );

        if (targetRangeElements.length > 0) {
            // Sort by font size descending within the range (in case of multiple matches)
            targetRangeElements.sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0));
            // SILENTLY use the best element in the 29-30px range
            placeholderElement = targetRangeElements[0];
        }
    }

    // 4. SEARCH METHOD 3 (B): Absolute Largest Font Fallback (Lowest Priority)
    if (!placeholderElement) {
        const allTextElements = currentCertificate.elements.filter(
            el => el.type === "text" && (el.fontSize ?? 0) >= 18
        );

        if (allTextElements.length > 0) {
            // Sort by font size descending
            allTextElements.sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0));
            // SILENTLY use the largest element found
            placeholderElement = allTextElements[0];
        }
    }


    // 5. Final Fail Check
    if (!placeholderElement) {
      alert(`❌ Error: Cannot find a target text element to replace. Please ensure:
      1. You have selected the recipient name field in the editor.
      2. The recipient name field has a font size near 30px.
      3. Alternatively, manually set the recipient field content to exactly "${PLACEHOLDER_TEXT}".`);
      setIsBulkProcessing(false);
      return;
    }
    // --- END Final Check ---

    
    setIsBulkProcessing(true);
    setBulkGeneratedCertificates([]); 
    let names: string[] = [];
    
    try {
        // 2. Read the file
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // IMPORTANT: Use json.slice(1) to SKIP the header row (Row 1), reading names from Row 2 onwards.
        names = json.slice(1).map(row => row[0]) 
                    .filter(name => typeof name === 'string' && name.trim() !== '');

        if (names.length === 0) {
            alert("No names found in the first column of the spreadsheet after the header row (Row 1).");
            setIsBulkProcessing(false);
            return;
        }
        
        // 3. Perform In-Memory Duplication
        const templateElements = currentCertificate.elements.filter(el => el.id !== placeholderElement?.id);
        
        const newCertificates: GeneratedCertificate[] = names.map((name, index) => {
            const newElements: CertificateElement[] = JSON.parse(JSON.stringify(templateElements));
            
            const newNameElement: CertificateElement = {
                ...placeholderElement!, 
                id: `bulk-name-${index}-${Date.now()}`, 
                content: name, 
            };
            
            const finalElements = [...newElements, newNameElement];
            
            return {
                name: name,
                elements: finalElements
            };
        });
        
        // 4. Update state to render the scrollable list
        setBulkGeneratedCertificates(newCertificates);
        
        alert(`Successfully generated ${newCertificates.length} certificates. Scroll down to review them.`);

    } catch (error) {
        console.error("Bulk upload failed:", error);
        alert("An unexpected error occurred during bulk processing.");
    } finally {
        setIsBulkProcessing(false);
    }
  };
  
  // --- Rendering Logic based on Bulk State ---

  const certificatesToRender = bulkGeneratedCertificates.length > 0 
    ? bulkGeneratedCertificates 
    : [
        { 
            name: currentCertificate?.name || "Template", 
            elements: currentCertificate?.elements || [] 
        }
    ];

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
        // Save logic is conditional: Save Bulk if in bulk mode, otherwise Save Template
        onSave={bulkGeneratedCertificates.length > 0 ? handleSaveBulkCertificates : handleSaveTemplate}
        isBulkMode={bulkGeneratedCertificates.length > 0} 
        onDownload={handleDownload}
        onRevert={handleRevertToTemplate} 
        isSaving={isSaving || isBulkProcessing}
      />
      {/* Show processing state if bulk uploading */}
      {isBulkProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[60] text-white text-xl font-bold">
            Processing bulk certificates...
          </div>
      )}

      {/* RENDER VIEW: Single Template vs. Bulk Preview List */}
      <div
        id="certificate-container"
        className="flex-1 overflow-auto bg-slate-900 flex flex-col items-center p-10 transition-all duration-300"
        style={{ 
          marginRight: `${rightSidebarWidth}px`,
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
        }}
      >
        {certificatesToRender.map((cert, index) => (
          <React.Fragment key={index}>
            {/* Template Title */}
            {bulkGeneratedCertificates.length > 0 && (
                <h2 className="text-xl font-semibold text-slate-300 my-4 pt-10">
                    Certificate #{index + 1}: {cert.name}
                </h2>
            )}

            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
                boxShadow: "0 0 40px rgba(0,0,0,0.5)",
                marginBottom: '40px',
              }}
            >
              <div 
                id={`certificate-render-target-${index}`} 
                className="bg-white"
              >
                <KonvaCanvas
                  width={currentCertificate.width}
                  height={currentCertificate.height}
                  elements={cert.elements}
                  onElementSelect={handleElementSelect}
                  onElementUpdate={handleElementUpdate}
                  onImagesLoaded={() => index === 0 && setLoadingImages(false)}
                  isEditable={bulkGeneratedCertificates.length === 0} 
                  
                />
              </div>

              {/* Loading overlay - only show for the first certificate */}
              {loadingImages && index === 0 && (
                <div 
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-lg font-semibold z-50 pointer-events-none"
                    style={{ 
                        width: currentCertificate.width, 
                        height: currentCertificate.height,
                        top: 0,
                        left: 0,
                    }}
                >
                  Loading images...
                </div>
              )}
            </div>
            
            {/* Visual separator between certificates */}
            {index < certificatesToRender.length - 1 && bulkGeneratedCertificates.length > 0 && (
                <div className="w-1/2 h-1 bg-slate-700 my-8 rounded-full"></div>
            )}
            
          </React.Fragment>
        ))}
      </div>

      <EditorBottomBar zoom={zoom} setZoom={setZoom} />
      <EditorDropdownSidebar 
        onWidthChange={setRightSidebarWidth} 
        onAutoBulkUpload={handleAutoBulkUpload}
      />
    </div>
  );
};

export default CertificateEditor;