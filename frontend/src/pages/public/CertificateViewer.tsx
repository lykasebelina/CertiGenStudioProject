// src/pages/public/CertificateViewer.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Certificate, CertificateElement } from "../../types/certificate";
import KonvaCanvas from "../../components/KonvaCanvas";
import { Search, Download, Share2, Facebook, Linkedin, Twitter, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface GeneratedInstance {
    name: string;
    elements: CertificateElement[];
}

const CertificateViewer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [certificateData, setCertificateData] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState<number>(-1); // -1 means showing the template

    // Derived data
    const generatedInstances = useMemo(() => {
        return (certificateData?.generated_instances as GeneratedInstance[]) || [];
    }, [certificateData]);

    const filteredInstances = useMemo(() => {
        if (!searchQuery.trim()) return generatedInstances;
        return generatedInstances.filter(instance => 
            instance.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [generatedInstances, searchQuery]);

    // Determine what elements to show based on selection
    const activeElements = useMemo(() => {
        if (!certificateData) return [];
        if (activeIndex === -1 || generatedInstances.length === 0) {
            return certificateData.elements;
        }
        // Find the actual index in the original generatedInstances array based on the filtered result
        const selectedInFilter = filteredInstances[activeIndex];
        if(!selectedInFilter) return certificateData.elements;

        return selectedInFilter.elements;
    }, [certificateData, activeIndex, filteredInstances, generatedInstances]);

    const activeName = useMemo(() => {
        if(activeIndex === -1 || !filteredInstances[activeIndex]) return certificateData?.name || "Certificate";
        return filteredInstances[activeIndex].name;
    }, [activeIndex, filteredInstances, certificateData]);


    // --- FETCH DATA ---
    useEffect(() => {
        const fetchCertificate = async () => {
            if (!id) return;
            try {
                setLoading(true);
                // Note: Ensure Supabase RLS policies allow public 'select' on certificates table for this to work without auth.
                const { data, error } = await supabase
                    .from("certificates")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                setCertificateData(data as Certificate);
                // If there are generated instances, automatically select the first one
                if (data.generated_instances && data.generated_instances.length > 0) {
                    setActiveIndex(0);
                }

            } catch (err: any) {
                console.error("Error fetching certificate:", err);
                setError("Certificate not found or is private.");
            } finally {
                setLoading(false);
            }
        };

        fetchCertificate();
    }, [id]);

    // --- DOWNLOAD LOGIC (Reused from Editor) ---
    const handleDownload = async (format: 'png' | 'pdf') => {
        if (!certificateData) return;
        const element = document.getElementById("viewer-render-target");
        if (!element) { alert("Could not find element to capture."); return; }
        const fileName = `${activeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_certificate`;

        try {
             const canvas = await html2canvas(element, { 
                 useCORS: true, 
                 scale: 2, // Higher quality
                 backgroundColor: certificateData.backgroundColor || "#ffffff" 
             });

             if (format === 'pdf') {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const imgWidth = certificateData.width;
                const imgHeight = certificateData.height;
                const orientation = imgWidth > imgHeight ? 'l' : 'p';
                const pdf = new jsPDF(orientation, 'pt', 'a4');
                const a4Width = orientation === 'l' ? 841.89 : 595.28;
                const a4Height = orientation === 'l' ? 595.28 : 841.89;
                const ratio = Math.min(a4Width / imgWidth, a4Height / imgHeight);
                const xOffset = (a4Width - (imgWidth * ratio)) / 2;
                const yOffset = (a4Height - (imgHeight * ratio)) / 2;
                pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth * ratio, imgHeight * ratio);
                pdf.save(`${fileName}.pdf`);
             } else {
                 const link = document.createElement('a');
                 link.download = `${fileName}.png`;
                 link.href = canvas.toDataURL('image/png');
                 link.click();
             }
        } catch (err) {
          console.error("Download failed:", err);
          alert(`Failed to download.`);
        }
      };

    // --- SOCIAL SHARING ---
    const shareUrl = window.location.href;
    const shareText = `Check out my certificate: ${activeName}`;

    const handleShare = (platform: 'facebook' | 'linkedin' | 'twitter') => {
        let url = '';
        switch (platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
                break;
        }
        window.open(url, '_blank', 'width=600,height=400');
    };


    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
    if (error || !certificateData) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-500">{error || "Certificate not found"}</div>;

    const scale = Math.min(
        (window.innerWidth * 0.7) / certificateData.width, // Use 70% of screen width
        (window.innerHeight * 0.8) / certificateData.height // Use 80% of screen height
    ) * 100;

    const hasBulk = generatedInstances.length > 0;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
            
            {/* SIDEBAR - Search & Actions */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col h-auto md:h-screen overflow-y-auto">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">{certificateData.name}</h1>

                {/* ACTIONS GROUP */}
                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Actions</h3>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => handleDownload('png')} className="flex items-center gap-2 w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium">
                            <Download size={16} /> Download PNG
                        </button>
                        <button onClick={() => handleDownload('pdf')} className="flex items-center gap-2 w-full p-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition text-sm font-medium">
                             <Download size={16} /> Download PDF
                        </button>

                        <div className="mt-4">
                            <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2"><Share2 size={14}/> Share</h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleShare('facebook')} className="p-2 bg-[#1877F2] text-white rounded hover:opacity-90"><Facebook size={18}/></button>
                                <button onClick={() => handleShare('linkedin')} className="p-2 bg-[#0A66C2] text-white rounded hover:opacity-90"><Linkedin size={18}/></button>
                                <button onClick={() => handleShare('twitter')} className="p-2 bg-[#1DA1F2] text-white rounded hover:opacity-90"><Twitter size={18}/></button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* SEARCH & LIST GROUP (Only if bulk exists) */}
                {hasBulk && (
                    <div className="flex-1 flex flex-col min-h-0">
                         <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Find Your Certificate</h3>
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search by name..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setActiveIndex(0); }}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {filteredInstances.length === 0 ? (
                                <p className="text-slate-400 text-sm italic text-center pt-4">No names found.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {filteredInstances.map((instance, index) => (
                                        <li key={index}>
                                            <button 
                                                onClick={() => setActiveIndex(index)}
                                                className={`w-full text-left px-4 py-3 rounded-md text-sm transition ${activeIndex === index ? 'bg-blue-100 text-blue-800 font-medium border-l-4 border-blue-600' : 'hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                {instance.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
                 {!hasBulk && (
                     <div className="text-slate-500 text-sm italic">
                        Viewing template version.
                     </div>
                 )}
            </div>

            {/* MAIN CANVAS AREA */}
            <div className="flex-1 bg-slate-200 flex items-center justify-center p-8 overflow-auto relative">
                 {/* Watermark / Branding overlay (Optional) */}
                 <div className="absolute bottom-4 right-4 text-slate-400 font-semibold select-none pointer-events-none z-10 flex items-center gap-1">
                    <Sparkles size={16} /> Created with CertiBuilder
                 </div>

                <div 
                    style={{ 
                        transform: `scale(${scale / 100})`, 
                        transformOrigin: 'center center',
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" // Tailwind shadow-xl
                    }}
                >
                    <div id="viewer-render-target">
                        <KonvaCanvas
                            width={certificateData.width}
                            height={certificateData.height}
                            elements={activeElements}
                            // ⭐️ CRITICAL: Set to false for read-only viewing ⭐️
                            isEditable={false} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Small helper icon for branding
const Sparkles = ({size}: {size:number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
)

export default CertificateViewer;