import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CertificateElement } from "../../types/certificate";
import { useCertificate } from "../../context/CertificateContext";
import EditorTopBar from "../../components/EditorTopBar";
import EditorBottomBar from "../../components/EditorBottomBar";
import EditorDropdownSidebar from "../../components/EditorDropdownSidebar";
import KonvaCanvas from "../../components/KonvaCanvas";

const CertificateEditor: React.FC = () => {
  const navigate = useNavigate();
  const { currentCertificate, setCurrentCertificate } = useCertificate();

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoom, setZoom] = useState(75);
  const [activeToolTab, setActiveToolTab] = useState<"select" | "pattern">("select");
  const [rightSidebarWidth, setRightSidebarWidth] = useState(0);

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
      color?: string;
      textAlign?: string;
    }) => {
      if (!selectedElement || !currentCertificate) return;

      handleElementUpdate(selectedElement, style); // CONNECTED TO CERTIFICATE.TS TEXT ALIGNMENT
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
    <div className="h-screen w-full bg-slate-900 flex flex-col">
      <EditorTopBar
        activeToolTab={activeToolTab}
        setActiveToolTab={setActiveToolTab}
        selectedElement={selectedElement}
        onTextStyleChange={handleTextStyleChange}
        onDeleteElement={handleDeleteElement}
      />

      <div
        id="certificate-container"
        className="flex-1 overflow-auto bg-slate-900 flex justify-center items-start transition-all duration-300 p-10"
        style={{ marginRight: `${rightSidebarWidth}px` }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
          }}
        >
          <KonvaCanvas
            width={currentCertificate.width}
            height={currentCertificate.height}
            elements={currentCertificate.elements}
            onElementSelect={handleElementSelect}
            onElementUpdate={handleElementUpdate}
          />
        </div>
      </div>

      <EditorBottomBar zoom={zoom} setZoom={setZoom} />
      <EditorDropdownSidebar onWidthChange={setRightSidebarWidth} />
    </div>
  );
};

export default CertificateEditor;
