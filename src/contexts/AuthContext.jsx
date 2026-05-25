import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signInWithEmailAndPassword, signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { createOrGetProfessional, isSuperAdmin, getPlanConfig } from "../services/firestoreService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [planConfig, setPlanConfig] = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null); setProfile(null); setSuperAdmin(false); return;
      }
      try {
        // É super admin? (conta email/password registada em superAdmins)
        const sa = await isSuperAdmin(firebaseUser.uid);
        // Carrega overrides de limites (config/plans)
        try { setPlanConfig(await getPlanConfig()); } catch { /* usa defaults */ }

        if (sa) {
          setSuperAdmin(true);
          setProfile(null);
          setUser(firebaseUser);
          return;
        }
        // Profissional normal (conta Google)
        const prof = await createOrGetProfessional(firebaseUser);
        setSuperAdmin(false);
        setProfile(prof);
        setUser(firebaseUser);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Erro ao carregar perfil. Verifica as Firestore Rules.");
        setUser(null);
      }
    });
    return unsub;
  }, []);

  // Login profissional — Google
  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === "auth/popup-blocked" ||
          err.code === "auth/cancelled-popup-request" ||
          err.code === "auth/operation-not-supported-in-this-environment") {
        try { await signInWithRedirect(auth, googleProvider); return; }
        catch (e) { console.error("Redirect:", e); }
      }
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Erro ao entrar com Google. Tenta novamente.");
      }
    }
  };

  // Login super admin — email/password
  const loginSuperAdmin = async (email, password) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (err) {
      console.error("SuperAdmin login:", err);
      return { ok: false, message: "Email ou password incorrectos." };
    }
  };

  const logout = () => signOut(auth);

  // Atualiza o profile em memória (após mudança de plano, etc.)
  const refreshProfile = async () => {
    if (user && !superAdmin) {
      const prof = await createOrGetProfessional(user);
      setProfile(prof);
    }
  };

  // Recarrega os overrides de limites (após o super admin os editar)
  const refreshPlanConfig = async () => {
    try { setPlanConfig(await getPlanConfig()); } catch { /* noop */ }
  };

  const loading = user === undefined;

  return (
    <AuthContext.Provider value={{
      user, profile, superAdmin, planConfig, loading, error,
      login, loginSuperAdmin, logout, refreshProfile, refreshPlanConfig,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
