import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { theme } from "../config/theme";

export default function NavBar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = theme;

  const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";
  const inDetail = location.pathname.startsWith("/patient/");

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(16px)",
      borderBottom: `1px solid ${t.border}`,
      padding: "0 20px", height: 62,
      display: "flex", alignItems: "center",
      fontFamily: t.font,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <button onClick={() => navigate("/")} style={{
        display: "flex", alignItems: "center", gap: 9,
        background: "none", border: "none", cursor: "pointer", padding: 0,
      }}>
        <img src="/favicon.svg" alt="" width="34" height="34" style={{ borderRadius: 9 }} />
        <span style={{ fontSize: 20, fontWeight: 800, color: t.navy, letterSpacing: -0.5 }}>Fyziq</span>
      </button>

      <div style={{ flex: 1 }} />

      {inDetail && (
        <button onClick={() => navigate("/")} style={{
          background: t.cardAlt, border: `1px solid ${t.border}`,
          borderRadius: t.rSm, padding: "7px 14px",
          color: t.textMid, fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: t.font, marginRight: 10,
        }}>← Pacientes</button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {profile?.photoURL ? (
          <img src={profile.photoURL} alt="" style={{
            width: 32, height: 32, borderRadius: "50%",
            border: `2px solid rgba(26,159,198,0.3)`,
          }} />
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: t.gradientSoft, color: t.teal,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800,
          }}>{initials(profile?.name)}</div>
        )}
        <button onClick={logout} style={{
          background: t.cardAlt, border: `1px solid ${t.border}`,
          borderRadius: t.rSm, padding: "7px 14px",
          color: t.textMid, fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: t.font,
        }}>Sair</button>
      </div>
    </nav>
  );
}
