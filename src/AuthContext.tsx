import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AuthUser } from "./types";
import { DEFAULT_SUPERADMIN_PERMISSIONS } from "./lib/permissions";
import { doc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./lib/firebase";

export const DEFAULT_DIRECT_ACCESS_USER: AuthUser = {
  username: "admin_gepekris",
  displayName: "Pengurus GEPEKRIS TRETES",
  role: "superadmin",
  permissions: DEFAULT_SUPERADMIN_PERMISSIONS
};

interface AuthContextType {
  user: AuthUser | null;
  login: (userOrUsername: AuthUser | string) => void;
  logout: () => void;
  isDirectAccessMode: boolean;
  setDirectAccessMode: (enabled: boolean) => void;
  deleteCurrentAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Direct Access Mode: Default to true so user enters directly without requiring an account ("hapus akun, berlakukan disini")
  const [isDirectAccessMode, setIsDirectAccessModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("gepekris_direct_access_mode");
      // If never set, default to TRUE (Direct Access, no account required)
      return saved === null ? true : saved === "true";
    } catch (e) {
      return true;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem("gepekris_auth_session");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to restore auth session:", e);
    }
    // If in direct access mode, provide the full-privileged administrator account
    const savedMode = localStorage.getItem("gepekris_direct_access_mode");
    const isDirect = savedMode === null ? true : savedMode === "true";
    if (isDirect) {
      return DEFAULT_DIRECT_ACCESS_USER;
    }
    return null;
  });

  const setDirectAccessMode = useCallback((enabled: boolean) => {
    setIsDirectAccessModeState(enabled);
    try {
      localStorage.setItem("gepekris_direct_access_mode", enabled ? "true" : "false");
    } catch (e) {
      // ignore
    }
    if (enabled) {
      setUser(DEFAULT_DIRECT_ACCESS_USER);
      try {
        sessionStorage.setItem("gepekris_auth_session", JSON.stringify(DEFAULT_DIRECT_ACCESS_USER));
      } catch (e) {
        // ignore
      }
    } else {
      // Switch to requiring login: clear session
      sessionStorage.removeItem("gepekris_auth_session");
      setUser(null);
    }
  }, []);

  const login = useCallback((userOrUsername: AuthUser | string) => {
    let authObj: AuthUser;
    if (typeof userOrUsername === "string") {
      const uname = userOrUsername;
      const isSuper = uname === 'gpsttiaa' || uname === 'admin' || uname === 'admin_gepekris';
      authObj = {
        username: uname,
        displayName: uname === 'gpsttiaa' ? 'Administrator Pusat' : (uname === 'admin_gepekris' ? 'Pengurus GEPEKRIS TRETES' : uname),
        role: isSuper ? 'superadmin' : 'pengurus',
        permissions: isSuper ? DEFAULT_SUPERADMIN_PERMISSIONS : undefined
      };
    } else {
      authObj = userOrUsername;
    }
    setUser(authObj);
    try {
      sessionStorage.setItem("gepekris_auth_session", JSON.stringify(authObj));
    } catch (e) {
      console.error("Failed to persist auth session:", e);
    }
  }, []);

  const logout = useCallback(() => {
    setUser((currentUser) => {
      if (currentUser) {
        sessionStorage.removeItem(`greeted_${currentUser.username}`);
      }
      try {
        sessionStorage.removeItem("gepekris_auth_session");
      } catch (e) {
        // ignore
      }
      return null;
    });
  }, []);

  // Delete current account from database and switch to Direct Access Mode
  const deleteCurrentAccount = useCallback(async (): Promise<boolean> => {
    try {
      if (user?.id) {
        await deleteDoc(doc(db, "app_users", user.id));
      } else if (user?.username && user.username !== 'admin_gepekris' && user.username !== 'gpsttiaa') {
        const q = query(collection(db, "app_users"), where("username", "==", user.username));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      }
      // Clear session storage and reset to default direct access
      sessionStorage.removeItem("gepekris_auth_session");
      setDirectAccessMode(true);
      return true;
    } catch (error) {
      console.error("Failed to delete current account:", error);
      return false;
    }
  }, [user, setDirectAccessMode]);

  // Auto logout setelah 30 menit tanpa aktivitas HANYA jika bukan mode direct access
  useEffect(() => {
    if (isDirectAccessMode) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleInactivityLogout = () => {
      logout();
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleInactivityLogout, 1800000);
    };

    if (user) {
      const events = ["mousemove", "mousedown", "keypress", "touchstart", "scroll", "click"];
      
      events.forEach(event => {
        window.addEventListener(event, resetTimer, true);
      });

      resetTimer();

      return () => {
        clearTimeout(timeoutId);
        events.forEach(event => {
          window.removeEventListener(event, resetTimer, true);
        });
      };
    }
  }, [user, logout, isDirectAccessMode]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isDirectAccessMode, 
      setDirectAccessMode,
      deleteCurrentAccount 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

