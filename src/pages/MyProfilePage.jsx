import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserAnalyses } from "../services/firestoreService";
import { theme } from "../config/theme";
import AnalysisCard from "../components/AnalysisCard";
import HistoryChart from "../components/HistoryChart";

const t = theme;
const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";

export default function MyProfilePage() {
  const { profile } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    getUserAnalyses(profile.id).then(a => { setAnalyses(a); setLoading(false); });
  }, [profile]);

  if (!profile) return null;
  const last = analyses[0];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 60px", fontFamily: t.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Hero card */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: t.rXl, padding: 22, marginBottom: 18,
        boxShadow: t.shadowSm,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" style={{ width: 62, height: 62, borderRadius: 18 }} />
        ) : (
          <div style={{
            width: 62, height: 62, borderRadius: 18,
            background: t.gradientSoft, color: t.teal,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 25, fontWeight: 800,
          }}>{initials(profile.name)}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: t.navy }}>{profile.name}</div>
          <div style={{ fontSize: 12.5, color: t.textSoft, marginTop: 2 }}>{profile.email}</div>
          <div style={{ fontSize: 12, color: t.textMid, marginTop: 4 }}>
            {profile.sex === "M" ? "♂" : "♀"} · {profile.age} anos · {profile.height} cm · {profile.weight} kg
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        background: t.gradientSoft, border: `1px solid rgba(26,159,198,0.18)`,
        borderRadius: t.rMd, padding: "13px 16px", marginBottom: 18,
        fontSize: 13, color: t.textMid, lineHeight: 1.55,
      }}>
        ℹ️ As tuas análises são feitas pelo teu avaliador. Consulta aqui o histórico completo sempre que quiseres.
      </div>

      {/* Last metrics cards */}
      {last?.metrics && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 10 }}>Última Análise</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}>
            {[
              { label: "IMC", val: last.metrics.imc, unit: "kg/m²", color: last.metrics.imcCat?.color || t.teal },
              { label: "Gordura", val: last.metrics.bf ? `${last.metrics.bf}` : "—", unit: "%", color: last.metrics.bfCat?.color || t.orange },
              { label: "BMR", val: last.metrics.bmr, unit: "kcal", color: t.blue },
            ].map(({ label, val, unit, color }) => (
              <div key={label} style={{
                background: t.card, border: `1px solid ${t.border}`,
                borderRadius: t.rMd, padding: "13px 14px", boxShadow: t.shadowSm,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: t.textSoft, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 21, fontWeight: 800, color }}>
                  {val}<span style={{ fontSize: 10.5, color: t.textSoft, marginLeft: 2 }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {analyses.length >= 2 && (
        <div style={{ marginBottom: 18 }}><HistoryChart analyses={analyses} /></div>
      )}

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 12 }}>
        Histórico · {analyses.length} análise{analyses.length !== 1 ? "s" : ""}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: t.textSoft, paddingTop: 30 }}>A carregar...</div>
      ) : analyses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: t.textSoft }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.textMid }}>Sem análises ainda</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>O teu avaliador irá criar a primeira em breve.</div>
        </div>
      ) : (
        analyses.map(a => <AnalysisCard key={a.id} analysis={a} isAdmin={false} />)
      )}
    </div>
  );
}
