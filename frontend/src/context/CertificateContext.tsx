import React, { createContext, useContext, useState, ReactNode } from "react";
import { CertificateData, CertificateSize } from "../types/certificate";

interface CertificateContextType {
  currentCertificate: CertificateData | null;
  setCurrentCertificate: (certificate: CertificateData | null) => void;
  createCertificateFromPreview: (size: CertificateSize, prompt: string) => CertificateData;
}

const CertificateContext = createContext<CertificateContextType | undefined>(undefined);

export const useCertificate = () => {
  const context = useContext(CertificateContext);
  if (!context) {
    throw new Error("useCertificate must be used within a CertificateProvider");
  }
  return context;
};

interface CertificateProviderProps {
  children: ReactNode;
}

const SIZE_DIMENSIONS: Record<CertificateSize, { width: number; height: number }> = {
  "a4-portrait": { width: 794, height: 1123 },
  "a4-landscape": { width: 1123, height: 794 },
  "legal-portrait": { width: 816, height: 1344 },
  "legal-landscape": { width: 1344, height: 816 },
  "letter-portrait": { width: 816, height: 1056 },
  "letter-landscape": { width: 1056, height: 816 },
};

export const CertificateProvider: React.FC<CertificateProviderProps> = ({ children }) => {
  const [currentCertificate, setCurrentCertificate] = useState<CertificateData | null>(null);

  const createCertificateFromPreview = (size: CertificateSize, prompt: string): CertificateData => {
    const dimensions = SIZE_DIMENSIONS[size];
    const newCertificate: CertificateData = {
      id: `cert_${Date.now()}`,
      name: "Untitled Certificate",
      size,
      width: dimensions.width,
      height: dimensions.height,
      backgroundColor: "#ffffff",
      elements: [],
      createdAt: new Date(),
      prompt,
    };
    return newCertificate;
  };

  return (
    <CertificateContext.Provider
      value={{
        currentCertificate,
        setCurrentCertificate,
        createCertificateFromPreview,
      }}
    >
      {children}
    </CertificateContext.Provider>
  );
};
