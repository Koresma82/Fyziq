import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import SuperAdminLogin from "../components/SuperAdminLogin";
import { theme, btn } from "../config/theme";

export default function LoginPage() {
  const { login, error } = useAuth();
  const t = theme;

  // 5 toques no logo → acesso super admin
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const tapsRef = useRef({ count: 0, timer: null });
  const handleLogoTap = () => {
    const s = tapsRef.current;
    s.count += 1;
    clearTimeout(s.timer);
    if (s.count >= 5) {
      s.count = 0;
      setShowSuperAdmin(true);
    } else {
      s.timer = setTimeout(() => { s.count = 0; }, 1200);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at top, #ffffff 0%, ${t.bg} 60%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: t.font, padding: 24,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div style={{
        maxWidth: 400, width: "100%",
        background: t.card,
        borderRadius: t.rXl,
        boxShadow: t.shadowLg,
        border: `1px solid ${t.border}`,
        padding: "40px 32px 32px",
        textAlign: "center",
      }}>
        <img src="/logo-full.png" alt="Fyziq"
          onClick={handleLogoTap}
          style={{ width: 200, height: "auto", margin: "0 auto 8px", display: "block", cursor: "pointer", userSelect: "none" }} />

        <p style={{ fontSize: 14, color: t.textMid, lineHeight: 1.6, margin: "16px 0 32px" }}>
          Análise de composição corporal e postura com Inteligência Artificial.
        </p>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: t.rMd, padding: 12, marginBottom: 20,
            fontSize: 13, color: t.red,
          }}>{error}</div>
        )}

        <button onClick={login} style={{
          ...btn(t, "ghost"),
          width: "100%", padding: "14px",
          fontSize: 15, fontWeight: 700, color: t.text,
          boxShadow: t.shadowSm,
        }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
          {["📊 IMC & BMR", "🧬 % Gordura", "🦴 Postura", "📈 Histórico"].map(f => (
            <span key={f} style={{
              fontSize: 12, fontWeight: 600, color: t.textMid,
              background: t.cardAlt, border: `1px solid ${t.border}`,
              padding: "5px 11px", borderRadius: 20,
            }}>{f}</span>
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: t.textSoft, marginTop: 28 }}>
          Apenas utilizadores autorizados têm acesso.
        </p>
      </div>

      {showSuperAdmin && (
        <SuperAdminLogin onClose={() => setShowSuperAdmin(false)} />
      )}
    </div>
  );
}
