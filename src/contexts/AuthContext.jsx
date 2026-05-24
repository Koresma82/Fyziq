import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { createOrGetProfessional } from "../services/firestoreService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Apanha o resultado de um eventual signInWithRedirect.
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null); setProfile(null); return;
      }
      try {
        const prof = await createOrGetProfessional(firebaseUser);
        setUser(firebaseUser);
        setProfile(prof);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Erro ao carregar perfil. Verifica as Firestore Rules.");
        setUser(null);
      }
    });
    return unsub;
  }, []);

  const login = async () => {
    setError(null);
    try {
      // Tenta popup primeiro (melhor UX no desktop).
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Popup bloqueado/fechado → cai para redirect (robusto em mobile).
      if (err.code === "auth/popup-blocked" ||
          err.code === "auth/cancelled-popup-request" ||
          err.code === "auth/operation-not-supported-in-this-environment") {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (e) {
          console.error("Redirect login error:", e);
        }
      }
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Erro ao entrar com Google. Tenta novamente.");
      }
    }
  };

  const logout = () => signOut(auth);

  const loading = user === undefined;

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
