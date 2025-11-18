import { useState, useEffect } from "react";
import { FileText, Trash2, Edit } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Template } from "../../types/template";
import mammoth from "mammoth";
import * as htmlToImage from "html-to-image";
import { useNavigate } from "react-router-dom";
import { useCertificate } from "../../context/CertificateContext";
import { CertificateElement } from "../../types/certificate";
import JSZip from 'jszip';

export default function CustomTemplateHub() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    file: null as File | null,
  });

  const navigate = useNavigate();
  const { setCurrentCertificate, createCertificateFromPreview } = useCertificate();

  const fetchTemplates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData({ ...formData, file });
  };

  const generateThumbnail = async (file: File) => {
    try {
      if (file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        const tempDiv = document.createElement("div");
        tempDiv.style.width = "400px";
        tempDiv.style.height = "200px";
        tempDiv.style.background = "#1d4ed8";
        tempDiv.style.color = "#fff";
        tempDiv.style.display = "flex";
        tempDiv.style.alignItems = "center";
        tempDiv.style.justifyContent = "center";
        tempDiv.style.fontSize = "32px";
        tempDiv.style.fontWeight = "bold";
        tempDiv.innerText = "PPTX TEMPLATE";
        document.body.appendChild(tempDiv);
        const dataUrl = await htmlToImage.toPng(tempDiv);
        document.body.removeChild(tempDiv);
        return dataUrl;
      }

      const arrayBuffer = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      tempDiv.style.width = "400px";
      tempDiv.style.height = "200px";
      tempDiv.style.background = "#f9f9f9";
      tempDiv.style.color = "#000";
      tempDiv.style.fontSize = "14px";
      tempDiv.style.padding = "8px";
      document.body.appendChild(tempDiv);
      const dataUrl = await htmlToImage.toPng(tempDiv);
      document.body.removeChild(tempDiv);
      return dataUrl;
    } catch (err) {
      console.error("Thumbnail generation error:", err);
      return null;
    }
  };

  const getUniqueFilename = async (bucket: string, folder: string, filename: string) => {
    const name = filename.replace(/\.[^/.]+$/, "");
    const extension = filename.split(".").pop();
    let newName = filename;
    let counter = 1;

    while (true) {
      const { data } = await supabase.storage.from(bucket).list(folder);
      if (!data?.find((file) => file.name === newName)) break;
      newName = `${name} (${counter}).${extension}`;
      counter++;
    }

    return newName;
  };

  const handleUploadOrUpdate = async () => {
    if (!formData.name || !formData.file) {
      alert("Please provide a name and select a file");
      return;
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedTypes.includes(formData.file.type)) {
      alert("Only DOCX or PPTX templates are allowed");
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    try {
      const file = formData.file;
      const uniqueName = await getUniqueFilename("templates", "templates", file.name);
      const filePath = `templates/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from("templates")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("templates").getPublicUrl(filePath);
      const publicUrl = publicData.publicUrl;

      const thumbDataUrl = await generateThumbnail(file);
      let thumbnailUrl = "";
      if (thumbDataUrl) {
        const blob = await (await fetch(thumbDataUrl)).blob();
        const uniqueThumbName = await getUniqueFilename("templates", "templates/thumbnails", `${uniqueName}.png`);
        const thumbPath = `templates/thumbnails/${uniqueThumbName}`;
        const { error: thumbError } = await supabase.storage.from("templates").upload(thumbPath, blob);
        if (thumbError) throw thumbError;
        const { data: thumbPublic } = supabase.storage.from("templates").getPublicUrl(thumbPath);
        thumbnailUrl = thumbPublic.publicUrl;
      }

      await supabase.from("templates").insert({
        name: formData.name,
        description: formData.description,
        file_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        user_id: userId,
      });

      setFormData({ name: "", description: "", file: null });
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert("Error uploading template");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const getStoragePath = (publicUrl?: string) => {
        if (!publicUrl) return null;
        const url = new URL(publicUrl);
        const pathname = url.pathname;
        const match = pathname.match(/\/object\/public\/templates\/(.+)$/);
        return match ? match[1] : null;
      };

      const filePath = getStoragePath(template.file_url);
      const thumbPath = getStoragePath(template.thumbnail_url);

      if (filePath) await supabase.storage.from("templates").remove([filePath]);
      if (thumbPath) await supabase.storage.from("templates").remove([thumbPath]);
      await supabase.from("templates").delete().eq("id", template.id);
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert("Error deleting template");
    }
  };



const handleEdit = async (template: Template) => {
  try {
    if (!template.file_url) {
      alert("Template file URL is missing.");
      return;
    }

    let elements: CertificateElement[] = [];

    // --- DOCX parsing ---
    if (template.file_url.endsWith(".docx")) {
      // ... (keep your existing DOCX parsing code)
    } 
    // --- PPTX parsing ---
    else if (template.file_url.endsWith(".pptx")) {
      const response = await fetch(template.file_url);
      if (!response.ok) {
        alert("Failed to fetch the PPTX template file.");
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // PPTX files store slides in ppt/slides/slide*.xml
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.match(/ppt\/slides\/slide\d+\.xml$/)
      );
      
      console.log("📊 Found slides:", slideFiles);

      if (slideFiles.length === 0) {
        elements = [
          {
            id: `el_empty_pptx_${crypto.randomUUID()}`,
            type: "text",
            x: 562,
            y: 300,
            width: 800,
            height: 40,
            zIndex: 1,
            content: "Empty PPTX - No slides found",
            fontSize: 24,
            fontFamily: "Arial",
            color: "#000000",
            fontWeight: "normal",
            textAlign: "center",
            opacity: 1,
          },
        ];
      } else {
        // Parse first slide only
        const firstSlide = slideFiles[0];
        const slideXml = await zip.files[firstSlide].async("string");
        
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(slideXml, "text/xml");
        
        // Extract text from all text elements (a:t tags)
        const textNodes = xmlDoc.querySelectorAll("a\\:t, t");
        
        console.log("📝 Text nodes found:", textNodes.length);
        
        let yPos = 100;
        const parsedElements: CertificateElement[] = [];
        
        textNodes.forEach((node, index) => {
          const text = node.textContent?.trim() || "";
          
          if (!text) return;
          
          console.log(`Text ${index}:`, text);
          
          // Detect if it's likely a title (heuristic: first few elements or larger text)
          const isTitle = index === 0;
          const fontSize = isTitle ? 32 : 18;
          
          const el: CertificateElement = {
            id: `el_pptx_${crypto.randomUUID()}`,
            type: "text",
            x: 562,
            y: yPos,
            width: 1000,
            height: fontSize * 2,
            zIndex: index + 1,
            content: text,
            fontSize: fontSize,
            fontFamily: "Arial",
            color: isTitle ? "#1d4ed8" : "#000000",
            fontWeight: isTitle ? "bold" : "normal",
            textAlign: "center",
            opacity: 1,
          };
          
          parsedElements.push(el);
          console.log(`✅ PPTX Element created:`, { id: el.id, content: text.substring(0, 30) });
          
          yPos += fontSize * 3;
        });
        
        if (parsedElements.length === 0) {
          elements = [
            {
              id: `el_pptx_notext_${crypto.randomUUID()}`,
              type: "text",
              x: 562,
              y: 300,
              width: 800,
              height: 40,
              zIndex: 1,
              content: "PPTX loaded but no text found - double click to edit",
              fontSize: 20,
              fontFamily: "Arial",
              color: "#64748b",
              fontWeight: "normal",
              textAlign: "center",
              opacity: 1,
            },
          ];
        } else {
          elements = parsedElements;
        }
        
        console.log(`📊 Total PPTX elements created: ${elements.length}`);
      }
    } else {
      alert("Unsupported template file type.");
      return;
    }

    console.log("🎯 Final elements array:", elements);
    console.log("🎯 Element IDs:", elements.map(e => ({ id: e.id, content: e.content?.substring(0, 30) })));

    const cert = createCertificateFromPreview("a4-landscape", template.name || "Untitled");
    cert.name = template.name || "Untitled Certificate";
    cert.elements = [...elements];
    cert.backgroundColor = "#ffffff";

    console.log("🎨 Certificate created with elements:", cert.elements.length);

    setCurrentCertificate(cert);

    setTimeout(() => {
      navigate("/app/studio/certificate-editor");
    }, 150);

  } catch (err) {
    console.error("❌ Error opening template:", err);
    alert("Failed to open template for editing.");
  }
};


  return (
    <div className="h-full bg-slate-900 text-white p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-1">Custom Template Hub</h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Upload and manage your own certificate templates. Supports DOCX & PPTX.
          </p>
        </div>
        <FileText className="w-10 h-10 text-blue-400" />
      </div>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Template Name"
          className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Description"
          className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
        <input
          type="file"
          accept=".docx,.pptx"
          onChange={handleFileChange}
          className="p-2 bg-slate-700 border border-slate-600 rounded text-white cursor-pointer"
        />
        <button
          onClick={handleUploadOrUpdate}
          className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {loading ? (
        <p>Loading templates...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col"
            >
              <div className="aspect-video bg-slate-700 flex items-center justify-center mb-2">
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url}
                    alt={template.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <FileText className="w-16 h-16 text-slate-500" />
                )}
              </div>
              <h3 className="font-semibold mb-1">{template.name}</h3>
              <p className="text-slate-400 mb-2 line-clamp-2">{template.description}</p>
              <div className="flex gap-2 mt-auto">
                <a
                  href={template.file_url}
                  target="_blank"
                  className="px-3 py-1 bg-blue-500 rounded text-sm hover:bg-blue-600"
                >
                  Download
                </a>
                <button
                  onClick={() => handleEdit(template)}
                  className="px-3 py-1 bg-yellow-500 rounded text-sm hover:bg-yellow-600"
                >
                  <Edit className="w-4 h-4 inline" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(template)}
                  className="px-3 py-1 bg-red-500 rounded text-sm hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4 inline" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
