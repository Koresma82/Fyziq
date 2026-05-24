import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUser, getUserAnalyses, saveAnalysis, updateUser } from "../services/firestoreService";
import { uploadAnalysisImage } from "../services/storageService";
import { theme, btn } from "../config/theme";
import AnalysisForm from "../components/AnalysisForm";
import AnalysisCard from "../components/AnalysisCard";
import HistoryChart from "../components/HistoryChart";

const t = theme;
const avatarColors = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899"];
const avatarBg = (n) => avatarColors[(n?.charCodeAt(0) || 0) % avatarColors.length];
const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";

export default function UserDetailPage() {
  const { uid } = useParams();
  const { user: adminUser } = useAuth();

  const [profile,    setProfile]    = useState(null);
  const [analyses,   setAnalyses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [editData,   setEditData]   = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, a] = await Promise.all([getUser(uid), getUserAnalyses(uid)]);
    setProfile(p);
    setEditData({ name: p?.name, sex: p?.sex, age: p?.age, height: p?.height, weight: p?.weight });
    setAnalyses(a); setLoading(false);
  };
  useEffect(() => { load(); }, [uid]);

  const handleSaveAnalysis = async ({ imageDataUrl, mediaType, aiResult, metrics, notes }) => {
    let imageUrl = null, imagePath = null;
    try {
      const up = await uploadAnalysisImage(uid, imageDataUrl, mediaType);
      imageUrl = up.url; imagePath = up.path;
    } catch (e) { console.error("Upload:", e); }

    await saveAnalysis(uid, {
      aiResult, metrics, notes, imageUrl, imagePath,
      userSnapshot: { sex: profile.sex, age: profile.age, height: profile.height, weight: profile.weight },
      createdBy: adminUser.uid,
    });
    setShowForm(false); await load();
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    await updateUser(uid, {
      name: editData.name, sex: editData.sex,
      age: parseInt(editData.age), height: parseFloat(editData.height), weight: parseFloat(editData.weight),
    });
    await load(); setEditMode(false); setSavingEdit(false);
  };

  const handleDeleted = (id) => setAnalyses(prev => prev.filter(a => a.id !== id));

  const S = {
    input: {
      width: "100%", padding: "10px 12px",
      background: t.cardAlt, border: `1px solid ${t.border}`,
      borderRadius: t.rSm, color: t.text, fontSize: 14,
      fontFamily: t.font, outline: "none",
    },
    label: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: t.textSoft, textTransform: "uppercase", display: "block", marginBottom: 4 },
    sHdr: { fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 12 },
  };

  if (loading) return <div style={{ textAlign: "center", paddingTop: 80, color: t.textSoft, fontFamily: t.font }}>A carregar...</div>;
  if (!profile) return <div style={{ textAlign: "center", paddingTop: 80, color: t.textSoft, fontFamily: t.font }}>Utilizador não encontrado.</div>;

  const last = analyses[0];

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 60px", fontFamily: t.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input:focus,select:focus { border-color: ${t.teal} !important; box-shadow: 0 0 0 3px rgba(26,159,198,0.1); }
      `}</style>

      {/* Profile card */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: t.rXl, padding: 20, marginBottom: 18, boxShadow: t.shadowSm,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: editMode ? 18 : 0 }}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" style={{ width: 58, height: 58, borderRadius: 16 }} />
          ) : (
            <div style={{
              width: 58, height: 58, borderRadius: 16,
              background: `${avatarBg(profile.name)}1a`, color: avatarBg(profile.name),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800,
            }}>{initials(profile.name)}</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: t.navy }}>{profile.name}</div>
            <div style={{ fontSize: 12.5, color: t.textSoft, marginTop: 2 }}>{profile.email}</div>
            <div style={{ fontSize: 12, color: t.textMid, marginTop: 4 }}>
              {profile.sex === "M" ? "♂" : "♀"} · {profile.age} anos · {profile.height} cm · {profile.weight} kg
            </div>
          </div>
          <button style={{ ...btn(t, "ghost"), padding: "7px 13px" }} onClick={() => setEditMode(e => !e)}>
            {editMode ? "✕" : "✏️"}
          </button>
        </div>

        {editMode && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={S.label}>Nome</label>
                <input style={S.input} value={editData.name || ""} onChange={e => setEditData({ ...editData, name: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Sexo</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={editData.sex}
                  onChange={e => setEditData({ ...editData, sex: e.target.value })}>
                  <option value="M">♂ Masculino</option>
                  <option value="F">♀ Feminino</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Idade</label>
                <input style={S.input} type="number" value={editData.age || ""} onChange={e => setEditData({ ...editData, age: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Altura (cm)</label>
                <input style={S.input} type="number" value={editData.height || ""} onChange={e => setEditData({ ...editData, height: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Peso (kg)</label>
                <input style={S.input} type="number" step="0.5" value={editData.weight || ""} onChange={e => setEditData({ ...editData, weight: e.target.value })} />
              </div>
            </div>
            <button style={{ ...btn(t, "primary"), width: "100%" }} onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "A guardar..." : "Guardar Alterações"}
            </button>
          </>
        )}
      </div>

      {/* Last metrics */}
      {last?.metrics && (
        <>
          <div style={S.sHdr}>Última Análise</div>
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

      {/* History header + CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={S.sHdr}>Histórico · {analyses.length} análise{analyses.length !== 1 ? "s" : ""}</div>
        <button style={btn(t, "primary")} onClick={() => setShowForm(true)}>+ Nova Análise</button>
      </div>

      {analyses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: t.textSoft }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, color: t.textMid }}>Sem análises. Cria a primeira!</div>
        </div>
      ) : (
        analyses.map(a => <AnalysisCard key={a.id} analysis={a} isAdmin onDeleted={handleDeleted} />)
      )}

      {showForm && (
        <AnalysisForm userProfile={profile} onSave={handleSaveAnalysis} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}
