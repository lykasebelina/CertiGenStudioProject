// components/CertificatePreview.tsx
import { useState, useRef, useEffect } from "react";
import { Share2, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import CertificateLayout from "../layouts/CertificateLayout";
import CertificateTemplate from "./CertificateTemplate";
import { CertificateElement } from "../types/certificate";
import { supabase } from "../lib/supabaseClient";

type CertificateSize =
  | "a4-portrait"
  | "a4-landscape"
  | "legal-portrait"
  | "legal-landscape"
  | "letter-portrait"
  | "letter-landscape";

interface CertificatePreviewProps {
  size: CertificateSize;
  prompt: string;
  onPromptChange?: (value: string) => void;
  onGenerate?: () => void;
  onBack?: () => void;
  onUseTemplate?: () => void;
  generatedElements?: CertificateElement[];
}

export default function CertificatePreview({
  size,
  prompt,
  onPromptChange,
  onGenerate,
  onUseTemplate,
  generatedElements = [],
}: CertificatePreviewProps) {
  const [localPrompt, setLocalPrompt] = useState(prompt || "");
  const [isHovered, setIsHovered] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(75);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPrompt(value);
    onPromptChange?.(value);
  };

  const handleElementClick = (name: string) => {
    setSelectedElement(name);
  };

  const zoomOut = () => setZoom((z) => Math.max(25, z - 5));
  const zoomIn = () => setZoom((z) => Math.min(100, z + 5));
  const scale = zoom / 100;

  // ————— Save flow —————
  const openSaveModal = () => {
    setSaveTitle("");
    setIsSaveOpen(true);
  };

  const closeSaveModal = () => {
    setIsSaveOpen(false);
    setSaving(false);
  };

// inside components/CertificatePreview.tsx — replace handleSave implementation with:
const handleSave = async () => {
  if (!generatedElements || generatedElements.length === 0) {
    alert("No generated elements to save.");
    return;
  }

  setSaving(true);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    alert("You must be signed in to save a certificate.");
    setSaving(false);
    return;
  }

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-certificate`;
    console.log("Saving to:", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: saveTitle || null,
        prompt: localPrompt || null,
        size,
        elements: generatedElements,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("Save error:", json);
      alert(json?.error || "Failed to save certificate");
      return;
    }

    // json.certificate should contain the inserted row with updated elements
    console.log("Saved certificate:", json.certificate);
    alert("Certificate saved!");

    // If you want, automatically open the editor with the saved certificate:
    // navigate(`/editor?id=${json.certificate.id}`); // <-- optional

    setIsSaveOpen(false);
  } catch (err) {
    console.error("Save failed:", err);
    alert("Save failed.");
  } finally {
    setSaving(false);
  }
};


  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <div className="flex-1 overflow-auto bg-transparent relative">
        <div className="min-h-full w-full flex items-start justify-center p-10 relative">
          <div
            className="relative"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              transition: "transform 0.1s ease",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div ref={layoutRef}>
              <CertificateLayout size={size}>
                <div className="w-full h-full bg-white relative shadow-lg overflow-hidden">
                  <div className="absolute top-4 left-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-md z-10">
                    {size.toUpperCase().replace("-", " ")}
                  </div>

                  {selectedElement && (
                    <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-md z-10">
                      Selected: {selectedElement.replace(/-/g, " ").toUpperCase()}
                    </div>
                  )}

                  <CertificateTemplate
                    elements={generatedElements || []}
                    onElementSelect={handleElementClick}
                  />

                  <div
                    className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
                      isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="flex gap-3">
                      <button
                        onClick={onUseTemplate}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium text-sm py-3 px-6 rounded-lg shadow-md transition-all"
                      >
                        USE TEMPLATE
                      </button>



                      {/* TOP RIGHT SAVE BUTTON */}
  <button
    onClick={openSaveModal}
    className="absolute top-6 right-6 z-50 flex items-center gap-2 bg-white/95 hover:bg-white text-slate-900 font-medium text-sm py-2.5 px-5 rounded-lg shadow-lg transition-all border border-slate-300"
  >
    SAVE GENERATED CERTIFICATE
  </button>
                    </div>
                  </div>
                </div>
              </CertificateLayout>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-6 pt-4 flex items-center justify-between gap-4 border-t border-slate-700">
        <div className="flex items-center w-full max-w-3xl bg-[#1e2635] border border-slate-500 rounded-full px-5 py-3">
          <input
            type="text"
            placeholder="Describe your design idea or adjustments..."
            value={localPrompt}
            onChange={handlePromptChange}
            className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none placeholder-slate-500"
          />
          <Share2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </div>

        <button
          onClick={onGenerate}
          className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors flex items-center justify-center"
        >
          <Sparkles className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-2 rounded-md bg-[#1e2635] text-slate-300 hover:bg-slate-700 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={25}
            max={100}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24 accent-blue-500"
          />

          <button
            onClick={zoomIn}
            className="p-2 rounded-md bg-[#1e2635] text-slate-300 hover:bg-slate-700 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="text-slate-300 text-sm w-12 text-center">{zoom}%</span>
        </div>
      </div>

      {/* Save Modal */}
      {isSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!saving) closeSaveModal();
            }}
          />
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg p-6 z-10">
            <h3 className="text-lg font-semibold mb-3">Save Generated Certificate</h3>

            <label className="text-xs text-slate-600">Title</label>
            <input
              className="w-full border rounded px-3 py-2 mt-1 mb-3"
              placeholder="Enter a title (optional)"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              disabled={saving}
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                onClick={() => closeSaveModal()}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => handleSave()}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
