import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { theme, btn } from "../config/theme";

const t = theme;

export default function SuperAdminLogin({ onClose }) {
  const { loginSuperAdmin } = useAuth();
  const [email, setEmail]   = useState("");
  const [password, setPass] = useState("");
  const [error, setError]   = useState("");
  const [busy, setBusy]     = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setBusy(true);
    setError("");
    const res = await loginSuperAdmin(email.trim(), password);
    if (!res.ok) {
      setError(res.message);
      setBusy(false);
    }
    // Se ok, o AuthContext troca a vista automaticamente.
  };

  const input = {
    width: "100%", padding: "12px 14px", marginBottom: 12,
    background: t.cardAlt, border: `1px solid ${t.border}`,
    borderRadius: t.rMd, fontSize: 14, fontFamily: t.font, outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(28,39,56,0.6)",
      backdropFilter: "blur(6px)", zIndex: 400,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: t.font,
    }} onClick={onClose}>
      <div style={{
        background: t.card, borderRadius: t.rXl, boxShadow: t.shadowLg,
        maxWidth: 380, width: "100%", padding: 28,
      }} onClick={e => e.stopPropagation()}>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.navy }}>Acesso Super Admin</div>
          <div style={{ fontSize: 12.5, color: t.textSoft, marginTop: 4 }}>
            Área restrita de administração
          </div>
        </div>

        <input style={input} type="email" placeholder="Email"
          value={email} onChange={e => setEmail(e.target.value)} />
        <input style={input} type="password" placeholder="Password"
          value={password} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: t.rSm, padding: "9px 12px", marginBottom: 12,
            fontSize: 12.5, color: t.red,
          }}>{error}</div>
        )}

        <button style={{ ...btn(t, "primary"), width: "100%", marginBottom: 8 }}
          onClick={submit} disabled={busy || !email || !password}>
          {busy ? "A entrar..." : "Entrar"}
        </button>
        <button style={{ ...btn(t, "ghost"), width: "100%" }} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
