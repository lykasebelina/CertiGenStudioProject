import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';
import { Download, Facebook } from "lucide-react"; 
import KonvaCanvas from "../../components/KonvaCanvas";
import { supabase } from "../../lib/supabaseClient"; 
import { CertificateElement } from "../../types/certificate"; // Assuming this type is correct


// Muling I-define ang Types
interface GeneratedCertificateInstance {
  name: string;
  elements: CertificateElement[];
}

interface PublicCertificateData {
  id: string;
  name: string; // Ito ay 'title' sa Supabase
  width: number;
  height: number;
  template_elements: CertificateElement[]; // Ito ay 'elements' sa Supabase
  generated_instances: GeneratedCertificateInstance[] | null;
}

const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "a4-portrait": { width: 794, height: 1123 },
  "a4-landscape": { width: 1123, height: 794 },
  "legal-portrait": { width: 816, height: 1248 },
  "legal-landscape": { width: 1248, height: 816 },
  "letter-portrait": { width: 816, height: 1056 },
  "letter-landscape": { width: 1056, height: 816 },
};


// ⭐️ CRITICAL FIX: REAL SUPABASE DATA FETCH FUNCTION ⭐️
const fetchPublicCertificateData = async (certId: string): Promise<PublicCertificateData | null> => {
  try {
    // Selects only the available columns in your table
    const { data, error } = await supabase
      .from("certificates")
      .select("id, title, size, elements, generated_instances") 
      .eq("id", certId)
      .single();

    if (error) {
      console.error("Supabase fetch error:", error);
      return null;
    }

    if (!data) return null;

    // Determines dimensions based on the 'size' column
    const dims = SIZE_DIMENSIONS[data.size as string] || SIZE_DIMENSIONS["a4-landscape"];

    return {
      id: data.id,
      name: data.title || "Untitled Certificate",
      width: dims.width,
      height: dims.height,
      template_elements: data.elements,
      // Ensures the data type matches the required interface
      generated_instances: data.generated_instances as GeneratedCertificateInstance[] | null,
    };

  } catch (e) {
    console.error("Error fetching certificate data:", e);
    return null;
  }
};


const CertificateViewer: React.FC = () => {
  const { certId } = useParams<{ certId: string }>();
  const [data, setData] = useState<PublicCertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (certId) {
      setLoading(true);
      // ⭐️ Ginamit na ang totoong Supabase fetch function ⭐️
      fetchPublicCertificateData(certId)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [certId]);

  const certificatesToRender: GeneratedCertificateInstance[] = useMemo(() => {
    if (!data) return [];
    
    // CHECK 1: Render Bulk Certificates if available and valid
    if (data.generated_instances && Array.isArray(data.generated_instances) && data.generated_instances.length > 0) {
      return data.generated_instances;
    }
    
    // CHECK 2: Fallback to the single template (elements column)
    if (data.template_elements && Array.isArray(data.template_elements) && data.template_elements.length > 0) {
      return [{ name: data.name, elements: data.template_elements }];
    }
    
    return [];
  }, [data]);


  // --- DOWNLOAD LOGIC ---
  const handleDownload = useCallback(async (index: number, name: string, format: 'image' | 'pdf') => {
    if (!data) return;
    
    const element = document.getElementById(`certificate-view-${index}`);
    if (!element) {
      alert("Could not find certificate element to capture.");
      return;
    }

    setDownloading(name);

    try {
      // Use html2canvas to capture the rendered Konva Canvas
      const canvas = await html2canvas(element, { 
          useCORS: true, 
          scale: 2, 
          backgroundColor: "#ffffff" // Default background
      });

      const fileName = `${data.name} - ${name}`;

      if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = data.width;
        const imgHeight = data.height;
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
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      setDownloading(null);
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Failed to download ${name}.`);
      setDownloading(null);
    } 
  }, [data]);


  // --- FACEBOOK SHARE LOGIC ---
  const handleShareFacebook = (index: number, name: string) => {
    const url = window.location.href; 
    const shareTitle = `A Certificate for ${name} from ${data?.name}!`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareTitle)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-lg font-medium">Loading Certificate(s)...</div>;
  }

  if (!data || certificatesToRender.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-lg text-red-600 font-medium">404 | Certificate not found or no instances available.</div>;
  }
  
  // Scaling factor for display preview
  const scale = data.width > 1000 ? 0.75 : 1.0; 

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">{data.name}</h1>
          <p className="mt-2 text-xl text-gray-600">
            {certificatesToRender.length > 1 ? 'Generated Certificates' : 'Certificate Preview'}
          </p>
          <p className="text-sm text-red-500 mt-1">
            (Read-only view. Download or share the official certificate below.)
          </p>
        </header>

        {/* Scrollable Certificate List */}
        <div className="space-y-16">
          {certificatesToRender.map((cert, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-2xl border border-gray-300">
              <h2 className="text-2xl font-semibold text-center mb-6 text-indigo-700">
                {certificatesToRender.length > 1 ? `#${index + 1}: ${cert.name}` : cert.name}
              </h2>

              {/* Konva Canvas Render Area (Read-only) */}
              <div 
                id={`certificate-view-${index}`} 
                className="mx-auto shadow-xl border-4 border-gray-400 bg-white"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  width: data!.width,
                  height: data!.height,
                  marginBottom: `${data!.height * scale * 0.2}px`
                }}
              >
                <KonvaCanvas
                  width={data!.width}
                  height={data!.height}
                  elements={cert.elements}
                  isEditable={false}
                  onElementSelect={() => {}}
                />
              </div>

              {/* Download and Share Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => handleDownload(index, cert.name, 'pdf')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Download size={20} />
                  {downloading === cert.name ? 'Preparing PDF...' : 'Download as PDF'}
                </button>
                
                <button
                  onClick={() => handleDownload(index, cert.name, 'image')}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Download size={20} />
                  {downloading === cert.name ? 'Preparing Image...' : 'Download as Image (PNG)'}
                </button>

                <button
                  onClick={() => handleShareFacebook(index, cert.name)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Facebook size={20} /> Share to Facebook
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default CertificateViewer;
