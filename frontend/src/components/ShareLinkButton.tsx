import React, { useState, useRef, useEffect, RefObject } from 'react';
import { Share2, Link, X, Check, Lock, Globe, Clipboard } from 'lucide-react';

// Define the type for the status setter function
type StatusSetter = React.Dispatch<React.SetStateAction<string>>;

// --- Utility: Clipboard Copy Function ---
const copyToClipboard = (text: string, setStatus: StatusSetter) => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => setStatus('Copied!'))
            .catch(() => setStatus('Error copying link.'));
    } else {
        // Fallback for older browsers
        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            setStatus('Copied!');
        } catch (err) {
            setStatus('Error copying link: Browser access denied.');
        }
        document.body.removeChild(tempInput);
    }

    setTimeout(() => setStatus(''), 2000); 
};

// Define the props type for ShareModal
interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    certificateTitle: string | null;
}

// --- Component: Share Modal ---
const ShareModal = ({ isOpen, onClose, documentId, certificateTitle }: ShareModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // ⭐️ FIX: Updated path to include '/certificate'
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    // Dati: ${origin}/view/${documentId} -> MALI
    // Ngayon:
    const publicLink = `${origin}/view/certificate/${documentId}`; 

    // State for the public link feature (Simulated toggle)
    const [isPublicLinkEnabled, setIsPublicLinkEnabled] = useState(true);
    const [copyStatus, setCopyStatus] = useState('');

    // Handle clicks outside the modal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCopy = () => {
        if (isPublicLinkEnabled) {
            copyToClipboard(publicLink, setCopyStatus);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <div
                ref={modalRef as RefObject<HTMLDivElement>}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm transform transition-all"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                        Share: {certificateTitle || 'Untitled'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Public Link Section */}
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                            {isPublicLinkEnabled ? (
                                <Globe className="text-green-500" size={18} />
                            ) : (
                                <Lock className="text-red-500" size={18} />
                            )}
                            <h4 className="font-medium text-gray-700 dark:text-gray-200">
                                Public View Link
                            </h4>
                            {isPublicLinkEnabled && (
                                <span className="text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                                    LIVE
                                </span>
                            )}
                        </div>
                        {/* Toggle Switch */}
                        <button
                            onClick={() => setIsPublicLinkEnabled(!isPublicLinkEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isPublicLinkEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                            role="switch"
                            aria-checked={isPublicLinkEnabled}
                            aria-label="Toggle public link"
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isPublicLinkEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                                aria-hidden="true"
                            />
                        </button>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isPublicLinkEnabled
                            ? 'Anyone with this link can view the document, but not edit it.'
                            : 'Public sharing is disabled.'}
                    </p>

                    {/* Link Display and Copy Button */}
                    <div className="space-y-2">
                        <div className="flex items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <Link size={16} className="text-gray-500 mr-2 flex-shrink-0" />
                            <input
                                type="text"
                                readOnly
                                value={publicLink}
                                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 truncate focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={handleCopy}
                            disabled={!isPublicLinkEnabled || copyStatus === 'Copied!'}
                            className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition duration-150 ${
                                isPublicLinkEnabled
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                            }`}
                        >
                            {copyStatus === 'Copied!' ? (
                                <>
                                    <Check size={16} className="mr-2" />
                                    Link Copied!
                                </>
                            ) : (
                                <>
                                    <Clipboard size={16} className="mr-2" />
                                    Copy Public Link
                                </>
                            )}
                        </button>
                    </div>

                    {/* Footer / Other Sharing Options Placeholder */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                            Document ID: {documentId}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Define the combined props for the button component
export interface ShareLinkButtonProps {
    certificateId: string;
    certificateTitle: string | null;
    onShareClick: (e: React.MouseEvent) => void; 
}

// --- Component: Share Button ---
const ShareLinkButton: React.FC<ShareLinkButtonProps> = ({ certificateId, certificateTitle, onShareClick }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onShareClick(e);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <>
            {/* Share Button UI */}
            <button
                onClick={openModal}
                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                title="Share Certificate"
            >
                <Share2 size={16} />
            </button>
            
            {/* Share Modal */}
            <ShareModal
                isOpen={isModalOpen}
                onClose={closeModal}
                documentId={certificateId}
                certificateTitle={certificateTitle}
            />
        </>
    );
};

export default ShareLinkButton;