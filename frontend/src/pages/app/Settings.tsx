//Settings.tsx 

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<ProfileData & PasswordData>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || user!.email || "",
        });
      } else {
        setProfileData({
          first_name: user!.user_metadata?.first_name || "",
          last_name: user!.user_metadata?.last_name || "",
          email: user!.email || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      setMessage({ type: "error", text: "Failed to load profile data" });
    } finally {
      setIsFetching(false);
    }
  };

  const validateProfileForm = (): boolean => {
    const newErrors: Partial<ProfileData> = {};

    if (!profileData.first_name?.trim()) {
      newErrors.first_name = "First name is required";
    }
    if (!profileData.last_name?.trim()) {
      newErrors.last_name = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: Partial<PasswordData> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      newErrors.newPassword = "Password must include uppercase, lowercase, and a number";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (passwordData.confirmPassword !== passwordData.newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleProfileSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateProfileForm()) return;

  setIsLoading(true);
  setMessage(null);

  try {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user!.id)
      .maybeSingle();

    // 1️⃣ Update or insert into profiles table
    if (existingProfile) {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profileData.first_name.trim(),
          last_name: profileData.last_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("profiles")
        .insert({
          id: user!.id,
          email: user!.email!,
          first_name: profileData.first_name.trim(),
          last_name: profileData.last_name.trim(),
        });

      if (error) throw error;
    }

    // 2️⃣ ALSO UPDATE AUTH USER METADATA (THIS FIXES DISPLAY NAME)
    const { error: metaError } = await supabase.auth.updateUser({
      data: {
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        full_name: `${profileData.first_name.trim()} ${profileData.last_name.trim()}`,
        display_name: `${profileData.first_name.trim()} ${profileData.last_name.trim()}`
      }
    });

    if (metaError) throw metaError;

    // 3️⃣ Refresh user session so UI updates
    await supabase.auth.refreshSession();
    
    setMessage({ type: "success", text: "Profile updated successfully!" });
    setTimeout(() => setMessage(null), 3000);
  } catch (error: any) {
    console.error("Error updating profile:", error);
    setMessage({ type: "error", text: error.message || "Failed to update profile" });
  } finally {
    setIsLoading(false);
  }
};


  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setMessage({ type: "error", text: "Current password is incorrect" });
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setMessage({ type: "success", text: "Password updated successfully!" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      setMessage({ type: "error", text: error.message || "Failed to update password" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 border-b border-gray-700">
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <p className="mt-2 text-gray-400">Manage your profile and security settings</p>
          </div>

          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "profile"
                  ? "text-white bg-gray-700 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-750"
              }`}
            >
              <User className="inline-block w-5 h-5 mr-2" />
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab("password")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition ${
                activeTab === "password"
                  ? "text-white bg-gray-700 border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-750"
              }`}
            >
              <Lock className="inline-block w-5 h-5 mr-2" />
              Change Password
            </button>
          </div>

          {message && (
            <div
              className={`mx-6 mt-6 p-4 rounded-lg flex items-center ${
                message.type === "success"
                  ? "bg-green-900/30 text-green-400 border border-green-700"
                  : "bg-red-900/30 text-red-400 border border-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 mr-3" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-3" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="p-6 sm:p-8">
            {activeTab === "profile" ? (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full pl-11 pr-4 py-3 bg-gray-700 border border-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Email cannot be changed</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input
                        type="text"
                        value={profileData.first_name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, first_name: e.target.value })
                        }
                        className={`w-full pl-11 pr-4 py-3 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                          errors.first_name
                            ? "border-red-500 bg-red-900/20"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        placeholder="John"
                      />
                    </div>
                    {errors.first_name && (
                      <p className="mt-1 text-sm text-red-400">{errors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input
                        type="text"
                        value={profileData.last_name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, last_name: e.target.value })
                        }
                        className={`w-full pl-11 pr-4 py-3 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                          errors.last_name
                            ? "border-red-500 bg-red-900/20"
                            : "border-gray-600 hover:border-gray-500"
                        }`}
                        placeholder="Doe"
                      />
                    </div>
                    {errors.last_name && (
                      <p className="mt-1 text-sm text-red-400">{errors.last_name}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className={`w-full pl-11 pr-12 py-3 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                        errors.currentPassword
                          ? "border-red-500 bg-red-900/20"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className={`w-full pl-11 pr-12 py-3 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                        errors.newPassword
                          ? "border-red-500 bg-red-900/20"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className={`w-full pl-11 pr-12 py-3 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                        errors.confirmPassword
                          ? "border-red-500 bg-red-900/20"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {isLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

