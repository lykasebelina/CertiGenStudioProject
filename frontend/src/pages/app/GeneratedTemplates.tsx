// src/pages/MyCertificates.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import CertificateTemplate from "../../components/CertificateTemplate";
import { CertificateElement } from "../../types/certificate";
import { useCertificate } from "../../context/CertificateContext";

// Map certificate sizes to dimensions
const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "a4-portrait": { width: 794, height: 1123 },
  "a4-landscape": { width: 1123, height: 794 },
  "legal-portrait": { width: 816, height: 1248 },
  "legal-landscape": { width: 1248, height: 816 },
  "letter-portrait": { width: 816, height: 1056 },
  "letter-landscape": { width: 1056, height: 816 },
};

type CertificateRow = {
  id: string;
  user_id: string;
  title: string | null;
  prompt: string | null;
  size: string | null;
  elements: CertificateElement[];
  created_at: string;
};

export default function GeneratedTemplates() {
  const navigate = useNavigate();
  const { setCurrentCertificate } = useCertificate();
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-certificates`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const json = await res.json();

      if (res.ok) {
        setCertificates(json.certificates ?? []);
      } else {
        console.error("Failed to fetch certificates:", json);
      }
    } catch (err) {
      console.error("Error fetching certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificates = certificates.filter((c) =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase() || "")
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">My Certificates</h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Your saved certificates. Click "Edit" to modify them.
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search certificates..."
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <p>Loading certificates...</p>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-8 bg-slate-800 rounded shadow text-slate-400">
            No certificates found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col"
              >
                {/* Preview */}
                <div className="aspect-video bg-slate-700 flex items-center justify-center mb-2 overflow-hidden">
                  <CertificateTemplate elements={c.elements ?? []} />
                </div>

                {/* Info */}
                <h3 className="font-semibold mb-1">{c.title || "(untitled)"}</h3>
                <p className="text-slate-400 text-xs mb-2">{c.size}</p>
                <p className="text-slate-500 text-xs mb-2">
                  {new Date(c.created_at).toLocaleString()}
                </p>

                {/* Edit button */}
                <div className="mt-auto flex gap-2">
                  <button
                    className="px-3 py-1 bg-yellow-500 rounded text-sm hover:bg-yellow-600"
                    onClick={() => {
                      const dimensions =
                        SIZE_DIMENSIONS[c.size || "a4-portrait"];

                      setCurrentCertificate({
                        id: c.id,
                        name: c.title || "Untitled",
                        size: c.size as any,
                        width: dimensions.width,
                        height: dimensions.height,
                        backgroundColor: "#ffffff",
                        elements: c.elements || [],
                        createdAt: new Date(c.created_at),
                        prompt: c.prompt || "",
                      });

                      navigate("/app/studio/certificate-editor");
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
