import { useState } from "react";
import { X } from "lucide-react";

interface AddFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (logos: File[], signatures: File[], watermark: File | null) => void;
}

export default function AddFilesModal({ isOpen, onClose, onFilesSelected }: AddFilesModalProps) {
  const [logos, setLogos] = useState<File[]>([]);
  const [signatures, setSignatures] = useState<File[]>([]);
  const [watermark, setWatermark] = useState<File | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white"
        >
          <X />
        </button>

        <h2 className="text-xl font-bold text-white mb-4">Add Files</h2>

        <div className="flex flex-col gap-4">
          {/* Logos */}
          <div>
            <label className="text-slate-300 text-sm">Logos (up to 4)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setLogos(files.slice(0, 4));
              }}
              className="mt-1 w-full text-xs text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">{logos.length} selected</p>
          </div>

          {/* Signatures */}
          <div>
            <label className="text-slate-300 text-sm">Signatures (up to 4)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSignatures(files.slice(0, 4));
              }}
              className="mt-1 w-full text-xs text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">{signatures.length} selected</p>
          </div>

          {/* Watermark */}
          <div>
            <label className="text-slate-300 text-sm">Watermark (1 only)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setWatermark(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-xs text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">{watermark ? "1 selected" : "0 selected"}</p>
          </div>

          <button
            onClick={() => {
              onFilesSelected(logos, signatures, watermark);
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md mt-3 w-full"
          >
            Add to Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
