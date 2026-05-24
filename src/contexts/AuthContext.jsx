import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { createOrGetProfessional } from "../services/firestoreService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
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
        setError("Erro ao carregar perfil. Tenta novamente.");
        setUser(null);
      }
    });
    return unsub;
  }, []);

  const login = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user" &&
          err.code !== "auth/cancelled-popup-request") {
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
