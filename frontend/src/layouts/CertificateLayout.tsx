////  src/layouts/CertificateLayout.tsx

import React from "react";

export interface CertificateLayoutProps {
  size:
    | "a4-portrait"
    | "a4-landscape"
    | "legal-portrait"
    | "legal-landscape"
    | "letter-portrait"
    | "letter-landscape";
  children: React.ReactNode;
}

const SIZE_MAP: Record<
  CertificateLayoutProps["size"],
  { width: number; height: number }
> = {
  "a4-portrait": { width: 8.27, height: 11.69 },
  "a4-landscape": { width: 11.69, height: 8.27 },
  "legal-portrait": { width: 8.5, height: 13 },
  "legal-landscape": { width: 13, height: 8.5 },
  "letter-portrait": { width: 8.5, height: 11 },
  "letter-landscape": { width: 11, height: 8.5 },
};

const DPI = 96;

const CertificateLayout: React.FC<CertificateLayoutProps> = ({
  size,
  children,
}) => {
  const { width, height } = SIZE_MAP[size];

  const canvasWidth = width * DPI;
  const canvasHeight = height * DPI;

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-auto bg-transparent p-6"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="relative bg-white shadow-2xl border border-slate-300"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
        }}
      >
        <div className="w-full h-full">{children}</div>
      </div>
    </div>
  );
};

export default CertificateLayout;
