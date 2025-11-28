import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react"; // Assuming you use lucide-react for icons

const PAPER_SIZES = {
  A4: { width: 595, height: 842 }, // 72 DPI (approx)
  LEGAL: { width: 612, height: 1008 },
  LETTER: { width: 612, height: 792 },
};

export default function CustomTemplateHub() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("A4");
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("LANDSCAPE");

  const handleCreate = () => {
    // Calculate dimensions based on selection
    const baseSize = PAPER_SIZES[selectedFormat as keyof typeof PAPER_SIZES];
    const width = orientation === "LANDSCAPE" ? baseSize.height : baseSize.width;
    const height = orientation === "LANDSCAPE" ? baseSize.width : baseSize.height;

    // Navigate to editor with state
    navigate("/app/studio/custom-template/editor", {
      state: { width, height, format: selectedFormat, orientation },
    });
  };

  return (
    <div className="p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Custom Template Hub</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={20} /> Create New Template
        </button>
      </div>

      {/* Grid of existing templates could go here */}
      <div className="text-gray-400">No custom templates yet. Create one to start.</div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-4">Select Format</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Paper Size</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                >
                  <option value="A4">A4</option>
                  <option value="LEGAL">Legal</option>
                  <option value="LETTER">US Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Orientation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrientation("PORTRAIT")}
                    className={`flex-1 p-2 rounded border ${
                      orientation === "PORTRAIT"
                        ? "bg-blue-600 border-blue-600"
                        : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setOrientation("LANDSCAPE")}
                    className={`flex-1 p-2 rounded border ${
                      orientation === "LANDSCAPE"
                        ? "bg-blue-600 border-blue-600"
                        : "bg-gray-700 border-gray-600"
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded mt-4"
              >
                Start Designing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}