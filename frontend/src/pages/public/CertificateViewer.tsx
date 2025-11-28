import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';
import { Download, Facebook, Share2 } from "lucide-react";
import KonvaCanvas from "../../components/KonvaCanvas";
import { supabase } from "../../lib/supabaseClient";
import { CertificateElement } from "../../types/certificate";

interface GeneratedCertificateInstance {
  name: string;
  elements: CertificateElement[];
}

interface PublicCertificateData {
  id: string;
  name: string;
  width: number;
  height: number;
  template_elements: CertificateElement[];
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

const fetchPublicCertificateData = async (
  certId: string
): Promise<PublicCertificateData | null> => {
  try {
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

    const dims =
      SIZE_DIMENSIONS[data.size as string] ||
      SIZE_DIMENSIONS["a4-landscape"];

    return {
      id: data.id,
      name: data.title || "Untitled Certificate",
      width: dims.width,
      height: dims.height,
      template_elements: data.elements,
      generated_instances:
        data.generated_instances as GeneratedCertificateInstance[] | null,
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

  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    if (certId) {
      setLoading(true);
      fetchPublicCertificateData(certId)
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [certId]);

  const certificatesToRender: GeneratedCertificateInstance[] = useMemo(() => {
    if (!data) return [];

    if (
      data.generated_instances &&
      Array.isArray(data.generated_instances) &&
      data.generated_instances.length > 0
    ) {
      return data.generated_instances;
    }

    if (
      data.template_elements &&
      Array.isArray(data.template_elements) &&
      data.template_elements.length > 0
    ) {
      return [{ name: data.name, elements: data.template_elements }];
    }

    return [];
  }, [data]);

  // ⭐ NEW FUNCTION: UPLOAD IMAGE TO SUPABASE + RETURN PUBLIC URL
  const uploadCertificateImage = async (canvas: HTMLCanvasElement, fileName: string) => {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (!blob) {
      alert("Failed to convert image.");
      return null;
    }

    const filePath = `shared/${fileName}-${Date.now()}.png`;

    const { error } = await supabase.storage
      .from("certificates")
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload failed:", error);
      alert("Upload failed.");
      return null;
    }

    const { data: publicURL } = supabase.storage
      .from("certificates")
      .getPublicUrl(filePath);

    return publicURL.publicUrl;
  };

  // ⭐ NEW SHARE FUNCTION: SHARE IMAGE TO FACEBOOK
  const handleFacebookPost = async (index: number, name: string) => {
    const element = document.getElementById(`certificate-view-${index}`);
    if (!element) return alert("Certificate not found!");

    const canvas = await html2canvas(element, { scale: 2 });

    const fileName = `${data?.name}-${name}`;
    const imageUrl = await uploadCertificateImage(canvas, fileName);

    if (!imageUrl) return;

    const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      imageUrl
    )}`;

    window.open(fbShare, "_blank", "width=600,height=400");
  };

  // ⭐ NEW SHARE FUNCTION: SHARE IMAGE TO LINKEDIN
  const handleLinkedInPost = async (index: number, name: string) => {
    const element = document.getElementById(`certificate-view-${index}`);
    if (!element) return alert("Certificate not found!");

    const canvas = await html2canvas(element, { scale: 2 });

    const fileName = `${data?.name}-${name}`;
    const imageUrl = await uploadCertificateImage(canvas, fileName);

    if (!imageUrl) return;

    const title = `${name} - Achievement Certificate`;
    const summary = `I earned a certificate in ${data?.name}! Proud to share my progress.`;

    const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
      imageUrl
    )}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(
      summary
    )}`;

    window.open(linkedInUrl, "_blank", "width=600,height=600");
  };

  // ------------------ (KEEPING YOUR FULL CODE) -----------------------------

  const handleDownload = useCallback(
    async (index: number, name: string, format: "image" | "pdf") => {
      if (!data) return;

      const element = document.getElementById(`certificate-view-${index}`);
      if (!element) {
        alert("Could not find certificate element to capture.");
        return;
      }

      setDownloading(index);

      try {
        const canvas = await html2canvas(element, {
          useCORS: true,
          scale: 2,
          backgroundColor: "#ffffff",
        });

        const fileName = `${data.name} - ${name}`;

        if (format === "pdf") {
          const imgData = canvas.toDataURL("image/jpeg", 1.0);
          const imgWidth = data.width;
          const imgHeight = data.height;
          const orientation = imgWidth > imgHeight ? "l" : "p";
          const pdf = new jsPDF(orientation, "pt", "a4");

          const a4Width = orientation === "l" ? 841.89 : 595.28;
          const a4Height = orientation === "l" ? 595.28 : 841.89;
          const ratio = Math.min(a4Width / imgWidth, a4Height / imgHeight);
          const pdfImgWidth = imgWidth * ratio;
          const pdfImgHeight = imgHeight * ratio;
          const xOffset = (a4Width - pdfImgWidth) / 2;
          const yOffset = (a4Height - pdfImgHeight) / 2;

          pdf.addImage(imgData, "JPEG", xOffset, yOffset, pdfImgWidth, pdfImgHeight);
          pdf.save(`${fileName}.pdf`);
        } else {
          const link = document.createElement("a");
          link.download = `${fileName}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }

        setDownloading(null);
      } catch (err) {
        console.error("Download failed:", err);
        alert(`Failed to download ${name}.`);
        setDownloading(null);
      }
    },
    [data]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-lg font-medium">
        Loading Certificate(s)...
      </div>
    );
  }

  if (!data || certificatesToRender.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-lg text-red-600 font-medium">
        404 | Certificate not found or no instances available.
      </div>
    );
  }

  const scale = data.width > 1000 ? 0.75 : 1.0;

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">{data.name}</h1>
          <p className="mt-2 text-xl text-gray-600">
            {certificatesToRender.length > 1
              ? "Generated Certificates"
              : "Certificate Preview"}
          </p>
          <p className="text-sm text-red-500 mt-1">
            (Read-only view. Download or share the official certificate below.)
          </p>
        </header>

        <div className="space-y-16">
          {certificatesToRender.map((cert, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-2xl border border-gray-300"
            >
              <h2 className="text-2xl font-semibold text-center mb-6 text-indigo-700">
                {certificatesToRender.length > 1
                  ? `#${index + 1}: ${cert.name}`
                  : cert.name}
              </h2>

              <div
                id={`certificate-view-${index}`}
                className="mx-auto shadow-xl border-4 border-gray-400 bg-white"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  width: data!.width,
                  height: data!.height,
                  marginBottom: `${data!.height * scale * 0.2}px`,
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

              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => handleDownload(index, cert.name, "pdf")}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Download size={20} />
                  {downloading === index
                    ? "Preparing PDF..."
                    : "Download as PDF"}
                </button>

                <button
                  onClick={() => handleDownload(index, cert.name, "image")}
                  disabled={downloading !== null}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Download size={20} />
                  {downloading === index
                    ? "Preparing Image..."
                    : "Download as Image (PNG)"}
                </button>

                {/* ⭐ NEW SHARE BUTTONS (IMAGE POST) */}
                <button
                  onClick={() => handleFacebookPost(index, cert.name)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Facebook size={20} /> Post Image to Facebook
                </button>

                <button
                  onClick={() => handleLinkedInPost(index, cert.name)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-800 hover:bg-blue-900 rounded-lg text-white font-medium transition duration-150 shadow-md"
                >
                  <Share2 size={20} /> Post Image to LinkedIn
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
