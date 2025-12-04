import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { CertificateProvider } from "./context/CertificateContext";
import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/public/Home";
import CertificateStudio from "./pages/app/CertificateStudio";
import HomeDashboard from "./pages/app/HomeDashboard";
import AIGenerate from "./pages/app/AIGenerate";
import CertificateEditor from "./pages/app/CertificateEditor";

import CustomTemplateHub from "./pages/app/CustomTemplateHub";
import CustomTemplateEditor from "./pages/app/CustomTemplateEditor"; // NEW FILE

import BrandKit from "./pages/app/BrandKit";
import GeneratedTemplates from "./pages/app/GeneratedTemplates";
import Favorites from "./pages/app/Favorites";
import Settings from "./pages/app/Settings";
import ResetPassword from "./pages/public/ResetPassword";

import CertificateViewer from "./pages/public/CertificateViewer";
// ⭐️ IMPORT THE NEW VERIFICATION PAGE
import CertificateVerificationPage from "./pages/app/CertificateVerificationPage";

import PublicLayout from "./layouts/PublicLayout";
import PrivateLayout from "./layouts/PrivateLayout";
import AuthModal from "./pages/public/AuthModal";

function App() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  // ✅ open modal in sign-in mode
  const openSignIn = () => {
    setAuthMode("signin");
    setIsAuthOpen(true);
  };

  // ✅ open modal in sign-up mode
  const openSignUp = () => {
    setAuthMode("signup");
    setIsAuthOpen(true);
  };

  // ✅ Create wrapper to avoid TS route prop error
  const PublicLayoutWrapper = () => (
    <PublicLayout onSignIn={openSignIn} onSignUp={openSignUp} />
  );

  return (
    
    <AuthProvider>
      <CertificateProvider>
        <Routes>
          {/* 🌍 Public Routes */}
          <Route path="/" element={<PublicLayoutWrapper />}>
            <Route index element={<Home />} />
          </Route>
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ⭐️ QR CODE TARGET: NEW PUBLIC VERIFICATION ROUTE ⭐️ 
              This route handles QR code links that contain the templateId and instanceId query.
              The path parameter must match the one used in the QR code link builder.
          */}
          <Route path="/verify/certificate/:templateId" element={<CertificateVerificationPage />} /> 

          {/* 🔑 PUBLIC VIEW LINK TARGET: Standard Certificate Viewer Route */}
         <Route path="/view/certificate/:certId" element={<CertificateViewer />} />


          {/* 🔒 Private Routes */}
          <Route path="/app" element={<PrivateLayout />}>
            <Route path="studio" element={<CertificateStudio />}>
            
              <Route path="home-dashboard" element={<HomeDashboard />} />
              <Route path="ai-generate" element={<AIGenerate />} />
              <Route path="certificate-editor" element={<CertificateEditor />} />

              <Route path="custom-template" element={<CustomTemplateHub />} />
              <Route path="custom-template/editor" element={<CustomTemplateEditor />} />


              <Route path="brand-kit" element={<BrandKit />} />
              <Route path="generated-templates" element={<GeneratedTemplates />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="settings" element={<Settings />} />

              
            </Route>
          </Route>

          {/* ❌ 404 Fallback */}
          <Route
            path="*"
            element={<div className="text-white p-10">Page Not Found</div>}
          />
        </Routes>

        {/* 🔐 Auth Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          initialMode={authMode}
        />
      </CertificateProvider>
    </AuthProvider>
  );
}

export default App;