import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { v4 as uuidv4 } from "uuid";

// ✅ IMPORT DALLE UTILS
import { generateImageWithDALLE, determineImageSize } from "../../lib/openai/utils/dalleUtils";

// ✅ IMPORT NEW STORAGE UTILITY
import { uploadDalleImageToSupabase } from "../../lib/storageUtils"; 

interface GeneratedCertificate {
  name: string;
  elements: CertificateElement[];
}

// --- HISTORY UTILITY ---
const MAX_HISTORY_SIZE = 50;
const pushHistory = (
  history: CertificateElement[][],
  historyIndex: number,
  newElements: CertificateElement[]
): [CertificateElement[][], number] => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(newElements);
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift();
  }
  const newIndex = newHistory.length - 1;
  return [newHistory, newIndex];
};

const CertificateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { currentCertificate, setCurrentCertificate } = useCertificate();

  // History State
  const initialElements = useMemo(() => currentCertificate?.elements || [], [currentCertificate]);
  const [history, setHistory] = useState<CertificateElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Selection State
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedCertificateIndex, setSelectedCertificateIndex] = useState<number | null>(null);

  const [zoom, setZoom] = useState(75);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0);

  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // --- BULK STATE ---
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false); 
  const [bulkGeneratedCertificates, setBulkGeneratedCertificates] = useState<GeneratedCertificate[]>([]);

  // Text Adding State
  const [isAddingText, setIsAddingText] = useState(false);

  // AI Generation State
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Load saved bulk certificates when template loads
  useEffect(() => {
    if (currentCertificate && 'generated_instances' in currentCertificate) {
      const savedInstances = currentCertificate.generated_instances as GeneratedCertificate[] | undefined;
      if (savedInstances && Array.isArray(savedInstances) && savedInstances.length > 0) {
        setBulkGeneratedCertificates(savedInstances);
      } else {
        setBulkGeneratedCertificates([]);
      }
    }
  }, [currentCertificate]); 

  // --- CORE STATE UPDATE ---
  const updateTemplateState = useCallback(
    (newElements: CertificateElement[]) => {
      if (!currentCertificate) return;

      const [newHistory, newIndex] = pushHistory(history, historyIndex, newElements);
      setHistory(newHistory);
      setHistoryIndex(newIndex);
      
      setCurrentCertificate({
        ...currentCertificate,
        elements: newElements,
      });
    },
    [currentCertificate, setCurrentCertificate, history, historyIndex]
  );

  // --- UNDO HANDLER ---
  const handleUndo = useCallback(() => {
    if (bulkGeneratedCertificates.length > 0) return;

    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const prevElements = history[prevIndex];
      setCurrentCertificate((prevCert) => prevCert ? { ...prevCert, elements: prevElements } : null);
      setSelectedElement(null);
    }
  }, [history, historyIndex, setCurrentCertificate, bulkGeneratedCertificates.length]);


  // --- SELECTION HANDLER ---
  const handleElementSelect = (index: number | null, id: string | null) => {
    setSelectedCertificateIndex(index); 
    setSelectedElement(id);
  };

  // --- GENERIC UPDATE HANDLER ---
  const handleUniversalUpdate = (
    certIndex: number | null, 
    elementId: string, 
    updates: Partial<CertificateElement>,
    isFinal: boolean
  ) => {
    
    // CASE A: Editing the Main Template
    if (certIndex === null && currentCertificate) {
        const updatedElements = currentCertificate.elements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
        );

        if (isFinal) {
            updateTemplateState(updatedElements);
        } else {
            setCurrentCertificate({ ...currentCertificate, elements: updatedElements });
        }
        return;
    }

    // CASE B: Editing a Bulk Instance
    if (certIndex !== null && bulkGeneratedCertificates.length > 0) {
        setBulkGeneratedCertificates(prev => {
            const newCertificates = [...prev];
            const targetCert = { ...newCertificates[certIndex] };
            
            targetCert.elements = targetCert.elements.map(el => 
                el.id === elementId ? { ...el, ...updates } : el
            );

            newCertificates[certIndex] = targetCert;
            return newCertificates;
        });
    }
  };

  const handleRealtimeUpdate = (certIndex: number | null) => (id: string, updates: Partial<CertificateElement>) => {
      handleUniversalUpdate(certIndex, id, updates, false);
  };

  const handleFinalUpdate = (certIndex: number | null) => (id: string, updates: Partial<CertificateElement>) => {
      handleUniversalUpdate(certIndex, id, updates, true);
  };

  const handleTextStyleChange = (style: any) => {
    if (!selectedElement) return;
    handleUniversalUpdate(selectedCertificateIndex, selectedElement, style, true);
  };

  const handleDeleteElement = () => {
    if (!selectedElement) return;

    if (selectedCertificateIndex === null && currentCertificate) {
        const updatedElements = currentCertificate.elements.filter(el => el.id !== selectedElement);
        updateTemplateState(updatedElements);
    }
    else if (selectedCertificateIndex !== null) {
        setBulkGeneratedCertificates(prev => {
            const newCertificates = [...prev];
            const targetCert = { ...newCertificates[selectedCertificateIndex] };
            targetCert.elements = targetCert.elements.filter(el => el.id !== selectedElement);
            newCertificates[selectedCertificateIndex] = targetCert;
            return newCertificates;
        });
    }
    setSelectedElement(null);
  };

  // ⭐️⭐️⭐️ GLOBAL BULK AI REGENERATION LOGIC (UPDATED) ⭐️⭐️⭐️
  const handleAiGenerate = async (prompt: string, applyToAll: boolean) => {
    if (!selectedElement) return;
    
    // 1. Identify active certificate (to get the layer info of what we selected)
    const activeCert = isBulkMode 
        ? bulkGeneratedCertificates[selectedCertificateIndex!]
        : currentCertificate;

    if (!activeCert) return;

    // 2. Find the selected element object (we need its Z-Index)
    const elementToReplace = activeCert.elements.find(el => el.id === selectedElement);
    if (!elementToReplace) return;

    setIsAiGenerating(true);

    try {
        const sizeStr = determineImageSize(currentCertificate!.width, currentCertificate!.height);
        
        // 3. Safe Prompt
        const safePrompt = `A high quality professional certificate design element, ${prompt}, abstract, soft texture, elegant style, white background`;
        console.log(`🚀 Generating DALL-E Image (Base64 Mode). ApplyToAll: ${applyToAll}`);

        // 4. Generate Image (RETURNS BASE64 DATA NOW)
        const base64Data = await generateImageWithDALLE(safePrompt, sizeStr);
        if (!base64Data) throw new Error("DALL-E returned no data");

        // 5. ⭐️ UPLOAD TO SUPABASE (PASSING BASE64 DIRECTLY) ⭐️
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id || "guest"; // Fallback for safety
        
        // We pass the base64 string, not a URL
        const permanentUrl = await uploadDalleImageToSupabase(base64Data, userId);
        
        if (!permanentUrl) throw new Error("Failed to save generated image to permanent storage.");

        // --- HELPER: Updates a specific list of elements based on Layer ID ---
        const updateLayerInElements = (elementsToUpdate: CertificateElement[]) => {
            return elementsToUpdate.map(el => {
                if (el.zIndex === elementToReplace.zIndex) {
                    return {
                        ...el,
                        type: elementToReplace.zIndex === 4 ? 'cornerFrame' : (el.type === 'background' ? 'background' : 'image'),
                        imageUrl: permanentUrl, // ✅ Using the permanent URL
                        backgroundColor: 'transparent'
                    };
                }
                return el;
            });
        };

        // 6. ⭐️ APPLY LOGIC ⭐️
        if (isBulkMode) {
             if (applyToAll) {
                 // A. GLOBAL BULK UPDATE
                 setBulkGeneratedCertificates(prevCerts => {
                     return prevCerts.map(cert => ({
                         ...cert,
                         elements: updateLayerInElements(cert.elements)
                     }));
                 });
                 alert(`✅ Updated layer in ALL ${bulkGeneratedCertificates.length} certificates!`);
             } else {
                 // B. SINGLE BULK ITEM UPDATE
                 if (selectedCertificateIndex !== null) {
                     setBulkGeneratedCertificates(prevCerts => {
                         const copy = [...prevCerts];
                         copy[selectedCertificateIndex] = {
                             ...copy[selectedCertificateIndex],
                             elements: updateLayerInElements(copy[selectedCertificateIndex].elements)
                         };
                         return copy;
                     });
                     alert("✅ Updated this certificate only.");
                 }
             }
        } else {
            // C. TEMPLATE MODE (Single)
            const newElements = updateLayerInElements(currentCertificate!.elements);
            updateTemplateState(newElements);
            alert("✅ Generation Complete!");
        }

    } catch (err: any) {
        console.error("AI Generation Error:", err);
        if (err.message?.includes("safety")) {
            alert("⚠️ Safety Block: Please try a different prompt.");
        } else {
            alert(`Failed to generate image: ${err.message}`);
        }
    } finally {
        setIsAiGenerating(false);
    }
  };


  // --- SAVING LOGIC (NO CHANGE) ---
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

      if (error) throw error;
      alert("Certificate template saved successfully!");
    } catch (err: any) {
      console.error("Error saving certificate template:", err);
      alert("Failed to save certificate template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBulkCertificates = async () => {
    if (!currentCertificate || bulkGeneratedCertificates.length === 0) return;
    if (!window.confirm(`Are you sure you want to save ${bulkGeneratedCertificates.length} generated certificates?`)) return;

    try {
      setIsSaving(true);
      const dataToSave = bulkGeneratedCertificates;
      const { error } = await supabase
        .from("certificates")
        .update({
          generated_instances: dataToSave, 
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentCertificate.id);

      if (error) throw error;
      setCurrentCertificate({
        ...currentCertificate,
        generated_instances: dataToSave,
      });
      alert(`Successfully saved ${bulkGeneratedCertificates.length} certificates!`);
    } catch (err: any) {
      console.error("Error saving bulk:", err);
      alert("Failed to save bulk certificates.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRevertToTemplate = () => {
      if (bulkGeneratedCertificates.length > 0) {
          if (window.confirm("Are you sure you want to exit the bulk view? Any unsaved changes will be lost.")) {
              setBulkGeneratedCertificates([]);
              setSelectedCertificateIndex(null);
              setSelectedElement(null);
              alert("Reverted to single template view.");
          }
      }
  };

  // --- DOWNLOAD LOGIC (NO CHANGE) ---
  const handleDownload = async (format: ExportFormat) => {
    if (!currentCertificate) return;
    if (bulkGeneratedCertificates.length > 0) {
        alert("Please revert the editor to the single template view to download properly, or implement zip download.");
        return;
    }
    const element = document.getElementById("certificate-render-target-template"); 
    if (!element) {
        alert("Could not find certificate element to capture.");
        return;
    }
    const fileName = `${currentCertificate.name || "certificate"}`;

    try {
       if (format === 'jpg' || format === 'png' || format === 'pdf') {
         const canvas = await html2canvas(element, { 
             useCORS: true, 
             scale: 2, 
             backgroundColor: currentCertificate.backgroundColor || "#ffffff" 
         });
         
         if (format === 'pdf') {
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
         } else {
             const link = document.createElement('a');
             link.download = `${fileName}.${format}`;
             link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png');
             link.click();
         }
       }
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Failed to download.`);
    }
  };

  // --- BULK AUTO UPLOAD LOGIC (NO CHANGE) ---
  const handleAutoBulkUpload = async (file: File) => {
    if (!currentCertificate || isBulkProcessing) {
      alert("Please ensure a certificate template is loaded or wait for current process to finish.");
      return;
    }
    
    if (bulkGeneratedCertificates.length > 0) {
        if (!window.confirm("A bulk view is already active. Do you want to generate a new list? (Unsaved changes will be lost)")) {
            return;
        }
    }

    // 🟢 FIXED: Strictly search for element with zIndex === 12 (Name Field)
    const placeholderElement = currentCertificate.elements.find(
        el => el.zIndex === 12 && el.type === "text"
    );

    if (!placeholderElement) {
      alert(`❌ Error: Could not find the designated Name field (Layer 12). Please ensure the name text element is set to Layer 12.`);
      setIsBulkProcessing(false);
      return;
    }

    setIsBulkProcessing(true);
    setBulkGeneratedCertificates([]);
    setSelectedCertificateIndex(null); 
    setSelectedElement(null);

    let names: string[] = [];
    
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        names = json.slice(1).map(row => row[0]) 
                    .filter(name => typeof name === 'string' && name.trim() !== '');

        if (names.length === 0) {
            alert("No names found in the first column.");
            setIsBulkProcessing(false);
            return;
        }
        
        // Filter out the old placeholder to prevent duplication
        const templateElements = currentCertificate.elements.filter(el => el.id !== placeholderElement.id);
        
        const newCertificates: GeneratedCertificate[] = names.map((name, index) => {
            const newElements: CertificateElement[] = JSON.parse(JSON.stringify(templateElements));
            const newNameElement: CertificateElement = {
                ...placeholderElement, 
                id: `bulk-name-${index}-${Date.now()}`, 
                content: name, 
                zIndex: 12 // Ensure strict Z-Index is preserved
            };
            const finalElements = [...newElements, newNameElement];
            return {
                name: name,
                elements: finalElements
            };
        });
        
        setBulkGeneratedCertificates(newCertificates);
        alert(`Successfully generated ${newCertificates.length} certificates.`);

    } catch (error) {
        console.error("Bulk upload failed:", error);
        alert("An unexpected error occurred.");
    } finally {
        setIsBulkProcessing(false);
    }
  };


  // --- CLICK TO PLACE TEXT HANDLER (NO CHANGE) ---
  const handlePlaceTextAt = (pos: { x: number; y: number }) => {
    if (!currentCertificate) {
      setIsAddingText(false);
      return;
    }
    const id = uuidv4();
    const newText: CertificateElement = {
      id,
      type: "text",
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      content: "New Text",
      fontSize: 24,
      fontFamily: "Arial",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      textAlign: "left",
      textTransform: "none",
      lineHeight: 1.2,
      color: "#000000",
      width: 200,
      height: 50,
      rotation: 0,
      draggable: true,
      zIndex: 100,
    };

    if (selectedCertificateIndex !== null && bulkGeneratedCertificates.length > 0) {
        setBulkGeneratedCertificates(prev => {
            const newCerts = [...prev];
            newCerts[selectedCertificateIndex].elements.push(newText);
            return newCerts;
        });
    } else {
        updateTemplateState([...currentCertificate.elements, newText]);
    }
    
    setSelectedElement(id);
    setIsAddingText(false);
  };

  const handleSidebarAction = (actionId: string) => {
    if (actionId === "start-add-text") {
      setIsAddingText(true);
    } 
  };


  // --- DETERMINING ACTIVE ELEMENT (NO CHANGE) ---
  const getActiveElement = (): CertificateElement | undefined => {
      if (!selectedElement) return undefined;
      if (selectedCertificateIndex !== null && bulkGeneratedCertificates.length > 0) {
          return bulkGeneratedCertificates[selectedCertificateIndex].elements.find(el => el.id === selectedElement);
      }
      return currentCertificate?.elements.find(el => el.id === selectedElement);
  };

  const activeElementObj = getActiveElement();
  const isBulkMode = bulkGeneratedCertificates.length > 0;
  
  // --- 💡 NEW: SHARE LOGIC ---
  const handleShare = () => {
    if (!currentCertificate) return;

    // Dapat naka-save muna bago i-share
    if (!currentCertificate.id || isSaving || isBulkProcessing) {
      alert("Please save the certificate first.");
      return;
    }

    // Mocking the public link creation
    const certificateId = currentCertificate.id;
    alert(`Simulating creation of public link and redirecting to Viewer Page: /view/certificate/${certificateId}`);
    
    // Navigate to the mock viewing page (needs React Router setup for this path)
    navigate(`/view/certificate/${certificateId}`);
  };

  // Render List
  const certificatesToRender = isBulkMode 
    ? bulkGeneratedCertificates 
    : [{ name: currentCertificate?.name || "Template", elements: currentCertificate?.elements || [] }];

  if (!currentCertificate) return <div>No certificate</div>;

  const scale = zoom / 100;

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col relative">
      <EditorTopBar
        selectedElement={selectedElement}
        activeStyles={activeElementObj as any} 
        onTextStyleChange={handleTextStyleChange}
        onDeleteElement={handleDeleteElement}
        onSave={isBulkMode ? handleSaveBulkCertificates : handleSaveTemplate}
        isBulkMode={isBulkMode} 
        onDownload={handleDownload}
        onRevert={handleRevertToTemplate} 
        isSaving={isSaving || isBulkProcessing}
        onUndo={handleUndo}
        onShare={handleShare} // 💡 NEW: Passed the Share Handler
      />
      
      {isBulkProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[60] text-white text-xl font-bold">
            Processing...
          </div>
      )}

      <div
        id="certificate-container"
        className="flex-1 overflow-auto bg-slate-900 flex flex-col items-center p-10 transition-all duration-300"
        style={{ marginRight: `${rightSidebarWidth}px`, scrollbarWidth: 'none' }}
      >
        {certificatesToRender.map((cert, index) => {
            const effectiveIndex = isBulkMode ? index : null;
            const renderId = isBulkMode ? `certificate-render-target-${index}` : `certificate-render-target-template`;

            return (
              <React.Fragment key={index}>
                {isBulkMode && (
                    <h2 className="text-xl font-semibold text-slate-300 my-4 pt-10">#{index + 1}: {cert.name}</h2>
                )}

                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                    marginBottom: '40px',
                    boxShadow: "0 0 40px rgba(0,0,0,0.5)",
                  }}
                >
                  <div id={renderId} className="bg-white">
                    <KonvaCanvas
                      width={currentCertificate.width}
                      height={currentCertificate.height}
                      elements={cert.elements}
                      
                      onElementSelect={(id) => handleElementSelect(effectiveIndex, id)}
                      
                      onElementUpdate={handleRealtimeUpdate(effectiveIndex)}
                      onElementFinalUpdate={handleFinalUpdate(effectiveIndex)}
                      
                      onImagesLoaded={() => index === 0 && setLoadingImages(false)}
                      
                      isEditable={true} 

                      isAddingText={isAddingText}
                      onPlaceAt={handlePlaceTextAt}
                      onCancelAddMode={() => setIsAddingText(false)}
                    />
                  </div>
                </div>
              </React.Fragment>
            );
        })}
      </div>

      <EditorBottomBar zoom={zoom} setZoom={setZoom} />
      
      <EditorDropdownSidebar 
        onWidthChange={setRightSidebarWidth} 
        onAutoBulkUpload={handleAutoBulkUpload}
        
        // NEW PROPS FOR AI DESIGN
        selectedElement={activeElementObj}
        onAiGenerate={handleAiGenerate}
        isGenerating={isAiGenerating}
        
        // ⭐️ PASS BULK PROPS
        isBulkMode={isBulkMode}
        bulkCount={bulkGeneratedCertificates.length}
      />
    </div>
  );
};

export default CertificateEditor;
