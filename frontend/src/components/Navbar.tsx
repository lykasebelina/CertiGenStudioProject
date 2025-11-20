import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import certigenLogo from "@/assets/certigen_logo.png";

interface NavbarProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSignIn, onSignUp }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const buttonClasses =
    "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition-all";

  return (
    <>
      {/* --- Navbar --- */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-gray-900 px-4 sm:px-6 lg:px-8 py-2 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img
              src={certigenLogo}
              alt="Certigen Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-lg object-contain shrink-0"
            />
            <span className="text-white text-xl font-bold">CERTIGEN</span>
          </div>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button onClick={onSignIn} className={buttonClasses}>
              SIGN IN
            </button>
            <button onClick={onSignUp} className={buttonClasses}>
              GET STARTED
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="flex flex-col space-y-4">
              <button onClick={onSignIn} className={buttonClasses + " w-full"}>
                SIGN IN
              </button>
              <button onClick={onSignUp} className={buttonClasses + " w-full"}>
                GET STARTED
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
