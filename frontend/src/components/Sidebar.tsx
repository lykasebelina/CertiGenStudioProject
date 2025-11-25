import {
  //Activity,
  BarChart,
  //Home
  Sparkles,
  Library,
  FileText,
  Palette,
  //Heart,
  Settings as SettingsIcon,
  Award,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import certigenLogo from "../assets/certigen_logo.png";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function Sidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed: externalCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Internal state for uncontrolled mode
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const collapsed = externalCollapsed ?? internalCollapsed;

  const [showDropdown, setShowDropdown] = useState(false);
  const { user } = useAuth();

  const menuItems = [
    { id: "ai-generate", label: "AI Generate", icon: Sparkles },
    { id: "home-dashboard", label: "My Activity", icon: BarChart },
//    { id: "template-library", label: "Template Library", icon: Library },
    { id: "custom-template", label: "Custom Template Hub", icon: FileText },
    
    { id: "generated-templates", label: "Generated Templates", icon: Library },

    
    { id: "my-certificates", label: "My Certificates", icon: Award },
    { id: "brand-kit", label: "Brand Kit", icon: Palette },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  // Disable scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // ✅ Collapse sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const clickedOutside =
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node);

      if (clickedOutside) {
        setShowDropdown(false);
        // Collapse whether controlled or not
        if (externalCollapsed === undefined) {
          setInternalCollapsed(true);
        } else if (!externalCollapsed && onToggleCollapse) {
          onToggleCollapse();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [externalCollapsed, onToggleCollapse]);

  // 🔁 Unified collapse toggle
  const toggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed(!internalCollapsed);
  };

  const handleNavigation = (path: string) => {
    if (collapsed) toggleCollapse();
    navigate(`/app/studio/${path}`);
    if (onMobileClose) onMobileClose();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    setShowDropdown(false);
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`bg-[#0b111c] text-white flex flex-col transition-all duration-300 fixed lg:static inset-y-0 left-0 z-50 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header */}
        <div
          className={`relative h-20 p-5 border-b border-slate-700 flex items-center justify-between select-none transition-colors
            ${collapsed ? "cursor-pointer hover:bg-slate-800" : "cursor-default"}
          `}
        >
          <div
            className="flex items-center gap-3"
            onClick={() => {
              if (collapsed) toggleCollapse();
            }}
          >
            <img
              src={certigenLogo}
              alt="Certigen Logo"
              className="w-10 h-10 object-contain flex-shrink-0"
            />
            {!collapsed && (
              <span className="text-xl font-bold transition-opacity duration-300">
                CERTIGEN
              </span>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse();
              }}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center ${
                  collapsed ? "justify-center px-0" : "gap-3 px-4"
                } py-3 rounded-lg mb-1 transition-all ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="relative h-20 p-5 border-t border-slate-700">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              if (collapsed) toggleCollapse();
              else setShowDropdown((prev) => !prev);
            }}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() || "?"}
            </div>

            <div
              className={`flex-1 min-w-0 transition-all duration-300 ${
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              }`}
            >
              <div className="text-sm font-medium truncate">
                {user?.email || "Unnamed User"}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {user?.user_metadata?.name || ""}
              </div>
            </div>
          </div>

          {!collapsed && showDropdown && (
            <div className="absolute bottom-24 left-5 right-5 bg-[#1a1f29] border border-slate-700 rounded-xl shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-white rounded-lg hover:bg-slate-800"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
