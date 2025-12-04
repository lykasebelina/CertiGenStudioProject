//src/pages/app/AIGenerate.tsx

import { useState } from "react";
import { Lightbulb, Palette, Plus, Layout, Sparkles, X, Upload, Image as ImageIcon, FileSignature } from "lucide-react";
import CertificatePreview from "../../components/CertificatePreview";
import { useCertificate } from "../../context/CertificateContext";
import { generateCertificateElements } from "../../lib/openai/openai";
import { CertificateElement } from "../../types/certificate";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

console.log("Plain background detected — using solid color fill instead of AI image");

type CertificateSize =
  | "a4-portrait"
  | "a4-landscape"
  | "legal-portrait"
  | "legal-landscape"
  | "letter-portrait"
  | "letter-landscape";

interface Position { x: number; y: number; }


const getDimensions = (size: CertificateSize) => {
  switch (size) {

    case "a4-landscape": return { width: 1123, height: 794 };
    case "a4-portrait": return { width: 794, height: 1123 };
    case "legal-landscape": return { width: 1248, height: 816 };
    case "legal-portrait": return { width: 816, height: 1248 };
    case "letter-landscape": return { width: 1056, height: 816 };
    case "letter-portrait": return { width: 816, height: 1056 };
    default: return { width: 800, height: 600 };
  }
};

/**
 * Calculates the X, Y positions for the logos based on the certificate size and count.
 * Includes updated logic for centering two logos on the left side in Landscape mode,
 * and fixes ESLint warnings by using 'const' for variables that are not reassigned.
 */
const getLogoPositions = (
  size: CertificateSize, 
  width: number, 
  height: number, 
  count: number, 
  logoSize: number, 
  margin: number,
  elements: CertificateElement[] 
): Position[] => {
  const positions: Position[] = [];
  const isPortrait = size.includes("portrait");
  
  // 1. Find the Text Frame to reference (e.g., 'inst' frame - Institution/Head Text)
  const referenceFrame = elements.find(el => el.id === 'inst') || 
                         elements.find(el => el.id === 'dept') ||
                         elements.find(el => el.id === 'title');
  
  let areaX = margin;
  let areaWidth = width - (2 * margin);
  let yPos = margin; // Fallback top margin

  // CONFIGURATION: Define vertical adjustment for all logos (Positive = DOWN, Negative = UP)
  const verticalLogoShift = 10; 

  // --- PORTRAIT MODE LOGIC (Center Alignment) ---
  if (isPortrait && referenceFrame && referenceFrame.textFrameWidth) {
    areaWidth = referenceFrame.textFrameWidth;
    areaX = referenceFrame.x || (width / 2) - (areaWidth / 2); // Use frame's X or recalculate center
    
    // Position logos 20px above the reference frame's top edge
    yPos = (referenceFrame.y || margin) - logoSize - 20; 
    
    if (yPos < margin) {
        yPos = margin;
    }
    yPos += verticalLogoShift;
    
    // CONFIGURATION: Define a fixed gap size you want between logos (Adjust this value)
    const LOGO_GAP_SPACING = 10; 
    
    // --- Portrait Positioning ---
    if (count === 1) {
      // NOTE: Horizontal shift will be applied later in handleGenerate
      positions.push({ x: areaX + (areaWidth / 2) - (logoSize / 2), y: yPos });
    } else if (count === 2) {
      const totalContentWidth = (2 * logoSize) + LOGO_GAP_SPACING;
      const startX = areaX + (areaWidth / 2) - (totalContentWidth / 2);
      positions.push({ x: startX, y: yPos });
      positions.push({ x: startX + logoSize + LOGO_GAP_SPACING, y: yPos });
    } else if (count === 3) {
      const totalContentWidth = (3 * logoSize) + (2 * LOGO_GAP_SPACING);
      const startX = areaX + (areaWidth / 2) - (totalContentWidth / 2);
      positions.push({ x: startX, y: yPos });
      positions.push({ x: startX + logoSize + LOGO_GAP_SPACING, y: yPos });
      positions.push({ x: startX + (2 * (logoSize + LOGO_GAP_SPACING)), y: yPos });
    } else if (count === 4) {
      const totalContentWidth = (4 * logoSize) + (3 * LOGO_GAP_SPACING);
      const startX = areaX + (areaWidth / 2) - (totalContentWidth / 2);
      let currentX = startX;
      for (let i = 0; i < 4; i++) {
        positions.push({ x: currentX, y: yPos });
        currentX += logoSize + LOGO_GAP_SPACING;
      }
    }
  } 
  // --- LANDSCAPE MODE LOGIC (Left/Right Alignment on Text Frame EdGES) ---
  else {
    
    // ⭐️ ADJUSTMENT POINT 1: Define Landscape Horizontal Shift (Controls entire group's X offset) ⭐️
    const LANDSCAPE_LOGO_HORIZONTAL_SHIFT = -265; 

    // ⭐️ ADJUSTMENT POINT 2: Define Landscape Vertical Shift ⭐️
    const LANDSCAPE_LOGO_VERTICAL_SHIFT = 62; 

    // ⭐️ ADJUSTMENT POINT 3: Define Right Logo Inset (Controls gap between text and right logos) ⭐️
    const RIGHT_LOGO_INSET = -75; 


    // Reference frame geometry for landscape
    let refX = referenceFrame?.x || margin;
    const refWidth = referenceFrame?.width || (width - 2 * margin);
    
    // Apply the horizontal shift to the reference point (affects leftStart)
    refX += LANDSCAPE_LOGO_HORIZONTAL_SHIFT;

    // leftStart remains the anchor for the left group
    const leftStart = refX; // <-- Changed to const
    
    // Calculate the start position for the right group.
    const rightGroupStart = refX + refWidth - (logoSize + RIGHT_LOGO_INSET); 
    
    // Vertical position calculation
    const textFrameY = referenceFrame?.y || margin * 2;
    const LOGO_VERTICAL_OFFSET = 0;
    
    // Apply initial positioning based on the text frame and vertical shift
    yPos = textFrameY - logoSize - LOGO_VERTICAL_OFFSET;
    yPos += LANDSCAPE_LOGO_VERTICAL_SHIFT; 

    if (yPos < margin) {
        yPos = margin;
    }
    
    // Spacing between multiple logos on one side
    const INNER_GAP = 5; 

    // --- Landscape Positioning ---
    switch (count) {
      case 1:
        // 1 Logo: Place on the Left Side (No shift needed)
        positions.push({ x: leftStart, y: yPos });
        break;

      case 2:
        // 2 Logos: Left and Right Sides (Single logo on each side)
        positions.push({ x: leftStart, y: yPos }); // Left
        positions.push({ x: rightGroupStart, y: yPos }); // Right
        break;

      case 3:
        // 3 Logos: 2 Left, 1 Right
        
        // ⭐️ UPDATED LEFT SIDE LOGIC: Shift left to center the group ⭐️
        {
          const leftGroupWidth = (2 * logoSize) + INNER_GAP;
          const leftShift = leftGroupWidth / 2;
          
          const currentX = leftStart - leftShift; // <-- Changed to const

          // Left side (2 logos - Logo 1 then Logo 2 to the right)
          positions.push({ x: currentX, y: yPos });
          positions.push({ x: currentX + logoSize + INNER_GAP, y: yPos });
        }

        // Right side (1 logo)
        positions.push({ x: rightGroupStart, y: yPos });
        break;

      case 4:
        // 4 Logos: 2 Left, 2 Right
        
        // ⭐️ UPDATED LEFT SIDE LOGIC: Shift left to center the group ⭐️
        {
          const leftGroupWidth = (2 * logoSize) + INNER_GAP;
          const leftShift = leftGroupWidth / 2;

          const currentX = leftStart - leftShift; // <-- Changed to const
          
          // Left side (2 logos - Logo 1 then Logo 2 to the right)
          positions.push({ x: currentX, y: yPos });
          positions.push({ x: currentX + logoSize + INNER_GAP, y: yPos });
        }
        
        // Right side (2 logos - Logo 3 then Logo 4 to the right) 
        positions.push({ x: rightGroupStart, y: yPos }); 
        positions.push({ x: rightGroupStart + logoSize + INNER_GAP, y: yPos });
        break;
    }
  }

  return positions.slice(0, count);
};


interface UploadedAssets {
  logos: string[];
  signatures: string[];
  watermark: string | null;
}

function AIGenerate() {
  const navigate = useNavigate();
  const { createCertificateFromPreview, setCurrentCertificate } = useCertificate();

  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || "User";

  const [prompt, setPrompt] = useState("");
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [selectedSize, setSelectedSize] = useState<CertificateSize>("a4-landscape");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedElements, setGeneratedElements] = useState<CertificateElement[]>([]);


  const [showFileModal, setShowFileModal] = useState(false);
  const [assets, setAssets] = useState<UploadedAssets>({
    logos: [],
    signatures: [],
    watermark: null,
  });

  const sizes = [
    { id: "a4-portrait" as CertificateSize, label: "A4 (Portrait)" },
    { id: "a4-landscape" as CertificateSize, label: "A4 (Landscape)" },
    { id: "legal-portrait" as CertificateSize, label: "Legal Size (Portrait)" },
    { id: "legal-landscape" as CertificateSize, label: "Legal Size (Landscape)" },
    { id: "letter-portrait" as CertificateSize, label: "US Letter (Portrait)" },
    { id: "letter-landscape" as CertificateSize, label: "US Letter (Landscape)" },
  ];

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'watermark') => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    
    try {
      const base64Files = await Promise.all(files.map(readFileAsBase64));

      setAssets(prev => {
        if (type === 'logo') {
          const combined = [...prev.logos, ...base64Files].slice(0, 4);
          return { ...prev, logos: combined };
        }
        if (type === 'signature') {
          const combined = [...prev.signatures, ...base64Files].slice(0, 4);
          return { ...prev, signatures: combined };
        }
        if (type === 'watermark') {
          return { ...prev, watermark: base64Files[0] };
        }
        return prev;
      });
    } catch (error) {
      console.error("Error reading files:", error);
      alert("Error reading file uploads");
    }
  };

  const removeAsset = (type: 'logo' | 'signature' | 'watermark', index?: number) => {
    setAssets(prev => {
      if (type === 'logo') return { ...prev, logos: prev.logos.filter((_, i) => i !== index) };
      if (type === 'signature') return { ...prev, signatures: prev.signatures.filter((_, i) => i !== index) };
      if (type === 'watermark') return { ...prev, watermark: null };
      return prev;
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
  
      const elements = await generateCertificateElements(prompt, selectedSize);
      
      const { width, height } = getDimensions(selectedSize); // Get dimensions here
      const newElements: CertificateElement[] = [...elements];

      const logoCount = assets.logos.length;
      const logoSize = 70; // Changed to 70 as per the original user code in the request
      const logoMargin = 50;
      
      const logoPositions = getLogoPositions(selectedSize, width, height, logoCount, logoSize, logoMargin, newElements);

      const isPortrait = selectedSize.includes('portrait');

      const horizontalLogoShift = -270; 

      assets.logos.forEach((logo, i) => {
        const pos = logoPositions[i];
        if (!pos) return;


        const finalX = pos.x + (isPortrait ? horizontalLogoShift : 0);

        newElements.push({
          id: `custom-logo-${Date.now()}-${i}`,
          type: "image",
          x: finalX, // <-- Using the conditionally shifted X position
          y: pos.y,
          width: logoSize,
          height: logoSize,
          imageUrl: logo,
          zIndex: 18,
          draggable: true
        });
      });

      if (assets.watermark) {
        // Define fixed size for the watermark image (e.g., 600x600 is used as a base)
        const watermarkWidth = 600;
        const watermarkHeight = 600;
        
        // Calculate the center point for the watermark:
        // This ensures centering regardless of portrait/landscape or paper size.
        const centerX = (width / 2) - (watermarkWidth / 2);
        const centerY = (height / 2) - (watermarkHeight / 2);

        newElements.push({
          id: `custom-watermark-${Date.now()}`,
          type: "image",
          x: centerX, // Centered X
          y: centerY, // Centered Y
          width: watermarkWidth,
          height: watermarkHeight,
          imageUrl: assets.watermark,
          opacity: 0.15, // Low opacity for watermark
          zIndex: 5, // Above background, below text
          draggable: true
        });
      }

      const sigCount = assets.signatures.length;
      const sigWidth = 120; // Standard image width (can be adjusted)
      const sigHeight = 60; // Standard image height (can be adjusted)

      const signatureFramePositions: Position[] = [];

      for (let i = 0; i < sigCount; i++) {

        const sigFrame = elements.find(el => el.id === `sig-${i}`);
        
        // FIX: Check if sigFrame is defined AND has a width property
        if (sigFrame && sigFrame.width) {
          
          // 1. Calculate X Position
          const centerX = sigFrame.x + (sigFrame.width / 2);
          let imageX = centerX - (sigWidth / 2);
    
          let horizontalOffset = -150; // Base shift left 15px

          // ⭐️ EXISTING LOGIC: Apply additional shift for Portrait mode only ⭐️
          if (isPortrait) {
              // Add a positive value to shift it right in portrait mode
              horizontalOffset += 20; // For example, shift an additional 10px right in portrait
          }

          imageX += horizontalOffset; 
          
          // 2. Calculate Y Position
          let imageY = sigFrame.y - sigHeight; 
          
          // Adjust Y: Move the signature image DOWN by 20 pixels
          imageY += 20;

          // You can also add a conditional vertical adjustment if needed:
          // if (isPortrait) {
          //     imageY -= 5; // Move up 5px more in portrait
          // }

          signatureFramePositions.push({ x: imageX, y: imageY });
        } else {
          // Fallback if the AI didn't generate a text frame OR if it didn't include a width
          console.warn(`Signature text frame sig-${i} not found or missing width. Using simple fallback position.`);
          
          // Simple fallback: place them horizontally near the bottom
          const margin = 80;
          const totalSigWidth = sigCount * sigWidth + (sigCount > 0 ? (sigCount - 1) * margin : 0);
          const startX = (width / 2) - (totalSigWidth / 2) + i * (sigWidth + margin);
          const fallbackY = height - 150 - sigHeight; 
          
          signatureFramePositions.push({ x: startX, y: fallbackY });
        }
      }

      assets.signatures.forEach((sig, i) => {
        const pos = signatureFramePositions[i];
        if (!pos) return;

        newElements.push({
          id: `custom-sig-${Date.now()}-${i}`,
          type: "image", 
          x: pos.x,
          y: pos.y,
          width: sigWidth,
          height: sigHeight,
          imageUrl: sig,
          zIndex: 19,
          draggable: true
        });
      });

      setGeneratedElements(newElements);
      setShowPreview(true);
    } catch (error) {
      console.error("Error generating certificate:", error);
      alert("Failed to generate certificate layout. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseTemplate = () => {
    const certificate = createCertificateFromPreview(selectedSize, prompt);
    certificate.elements = generatedElements;
    setCurrentCertificate(certificate);
    navigate("/certificate-editor");
  };

  if (isGenerating) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Generating certificate with AI...</p>
          <p className="text-slate-500 text-sm mt-2">
            This may take 30–60 seconds as we generate each layer
          </p>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <CertificatePreview
        size={selectedSize}
        prompt={prompt}
        onPromptChange={setPrompt}
        onBack={() => setShowPreview(false)}
        onUseTemplate={handleUseTemplate}
        onGenerate={handleGenerate}
        generatedElements={generatedElements}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 p-10 relative">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-blue-400 mb-1"> Hello, {firstName}</h1>
          <p className="text-slate-400 text-center mb-6 text-xl">Let's create beautiful certificates today!</p>
        </div>

        <div className="relative mb-5 flex justify-center">
          <div className="bg-slate-800 rounded-xl p-1.5 border border-slate-700 w-full max-w-3xl">
            <div className="flex">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your certificate... (e.g., elegant blue background with golden borders, vintage ornaments, professional award design)"
                className="flex-[1.5] bg-transparent text-slate-300 placeholder-slate-500 p-4 min-h-[120px] resize-none focus:outline-none text-sm"
              />

              <div className="flex flex-col gap-2 p-2 border-l border-slate-700 relative">
                
                {/* --- ADD FILES BUTTON --- */}
                <div className="relative group">
                  <button 
                    onClick={() => setShowFileModal(true)}
                    className="p-2 rounded-md transition-colors group/icon hover:bg-slate-700"
                  >
                    <Plus className={`w-4 h-4 ${assets.logos.length || assets.signatures.length || assets.watermark ? "text-blue-400" : "text-slate-400"}`} />
                    {(assets.logos.length > 0 || assets.signatures.length > 0 || assets.watermark) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 whitespace-nowrap">
                      Add Assets (Logos, Signatures)
                    </div>
                  </div>
                </div>

                {/* Existing Buttons 
                <div className="relative group">
                  <button className="p-2 rounded-md transition-colors group/icon hover:bg-slate-700">
                    <Lightbulb className="w-4 h-4 text-slate-400 group-hover/icon:text-blue-400" />
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 whitespace-nowrap">
                      Use Predefined Prompts
                    </div>
                  </div>
                </div>

                {/* --- BRANDKIT BUTTON (COMMENTED OUT) --- */}
                {/* <div className="relative group">
                  <button className="p-2 rounded-md transition-colors group/icon hover:bg-slate-700">
                    <Palette className="w-4 h-4 text-slate-400 group-hover/icon:text-blue-400" />
                  </button>
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg border border-slate-700 flex items-center justify-between gap-2 whitespace-nowrap">
                      Brand Preset
                      <div className="w-9 h-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-0.5">
                        <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                      </div>
                    </div>
                  </div>
                </div> */}

                <div className="relative">
                  <button
                    onClick={() => setShowSizeMenu(!showSizeMenu)}
                    className="p-2 rounded-md transition-colors group/icon hover:bg-slate-700"
                  >
                    <Layout className="w-4 h-4 text-slate-400 group-hover/icon:text-blue-400" />
                  </button>

                  {showSizeMenu && (
                    <div className="absolute left-full ml-2 top-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 p-2 w-48">
                      {sizes.map((size) => (
                        <button
                          key={size.id}
                          onClick={() => {
                            setSelectedSize(size.id);
                            setShowSizeMenu(false);
                          }}
                          className={`block w-full text-left px-4 py-1.5 text-xs rounded-md transition-colors ${
                            selectedSize === size.id
                              ? "bg-blue-600 text-white"
                              : "text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Display Attached Files Summary */}
        {(assets.logos.length > 0 || assets.signatures.length > 0 || assets.watermark) && (
           <div className="flex justify-center mb-4 gap-2 flex-wrap">
             {assets.logos.length > 0 && (
                <div className="bg-blue-900/30 border border-blue-800 rounded-full px-3 py-1 text-blue-300 text-xs flex items-center gap-2">
                   <ImageIcon className="w-3 h-3" /> {assets.logos.length} Logo(s) Attached
                </div>
             )}
             {assets.signatures.length > 0 && (
                <div className="bg-purple-900/30 border border-purple-800 rounded-full px-3 py-1 text-purple-300 text-xs flex items-center gap-2">
                   <FileSignature className="w-3 h-3" /> {assets.signatures.length} Sig(s) Attached
                </div>
             )}
             {assets.watermark && (
    <div className="bg-cyan-800/50 border border-cyan-700 rounded-full px-3 py-1 text-cyan-400 text-xs flex items-center gap-2">
       <Sparkles className="w-3 h-3" /> Watermark Attached
    </div>
)}
           </div>
        )}

        <div className="flex justify-center mb-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-300 text-xs">
            Selected Size:{" "}
            <span className="text-blue-400 font-medium">
              {sizes.find((s) => s.id === selectedSize)?.label}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="w-1/2 max-w-md flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium text-sm py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Sparkles className="w-4 h-4 text-white" />
            GENERATE CERTIFICATE
          </button>
        </div>
      </div>

      {/* --- MODAL: File Uploads --- */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Attach Assets</h3>
              <button onClick={() => setShowFileModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              
              {/* Logos Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-200 font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-400" /> Logos
                    <span className="text-slate-500 text-xs">(Max 4)</span>
                  </label>
                  <span className="text-xs text-slate-500">{assets.logos.length}/4 used</span>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {assets.logos.map((logo, idx) => (
                    <div key={idx} className="relative aspect-square bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center group overflow-hidden">
                      <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                      <button 
                        onClick={() => removeAsset('logo', idx)}
                        className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {assets.logos.length < 4 && (
                    <label className="aspect-square border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/50 transition-all">
                      <Upload className="w-6 h-6 text-slate-500 mb-2" />
                      <span className="text-xs text-slate-500">Upload</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleAssetUpload(e, 'logo')}
                        multiple
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Signatures Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-200 font-medium flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-purple-400" /> Signatures
                    <span className="text-slate-500 text-xs">(Max 4)</span>
                  </label>
                  <span className="text-xs text-slate-500">{assets.signatures.length}/4 used</span>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  {assets.signatures.map((sig, idx) => (
                    <div key={idx} className="relative aspect-video bg-white/5 rounded-lg border border-slate-700 flex items-center justify-center group overflow-hidden">
                      <img src={sig} alt="Signature" className="max-w-full max-h-full object-contain p-2 invert" />
                      <button 
                        onClick={() => removeAsset('signature', idx)}
                        className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {assets.signatures.length < 4 && (
                    <label className="aspect-video border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/50 transition-all">
                      <Upload className="w-6 h-6 text-slate-500 mb-2" />
                      <span className="text-xs text-slate-500">Upload</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleAssetUpload(e, 'signature')}
                        multiple
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Watermark Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-200 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" /> Watermark
                    <span className="text-slate-500 text-xs">(Max 1)</span>
                  </label>
                </div>
                
                <div className="flex gap-4">
                  {assets.watermark ? (
                    <div className="relative w-32 h-32 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center group overflow-hidden">
                      <img src={assets.watermark} alt="Watermark" className="max-w-full max-h-full object-contain p-2 opacity-50" />
                      <button 
                        onClick={() => removeAsset('watermark')}
                        className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all">
                      <Upload className="w-6 h-6 text-slate-500 mb-2" />
                      <span className="text-xs text-slate-500">Upload</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleAssetUpload(e, 'watermark')}
                      />
                    </label>
                  )}
                  <div className="flex-1 text-sm text-slate-500 flex items-center">
                    <p>The watermark will be placed in the center of the certificate with reduced opacity automatically.</p>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-6 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setShowFileModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIGenerate;