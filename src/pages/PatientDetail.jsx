import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { theme, btn } from "../config/theme";
import {
  getPatient, getPatientAnalyses, saveAnalysis,
  updatePatient, deletePatient,
} from "../services/firestoreService";
import { uploadAnalysisImage } from "../services/storageService";
import AnalysisForm from "../components/AnalysisForm";
import AnalysisCard from "../components/AnalysisCard";
import HistoryChart from "../components/HistoryChart";

const t = theme;
const avatarColors = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899"];
const avatarBg = (n) => avatarColors[(n?.charCodeAt(0) || 0) % avatarColors.length];
const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";

export default function PatientDetail() {
  const { pid } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patient,    setPatient]    = useState(null);
  const [analyses,   setAnalyses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [editData,   setEditData]   = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, a] = await Promise.all([getPatient(pid), getPatientAnalyses(pid, user.uid)]);
    setPatient(p);
    setEditData({ name: p?.name, email: p?.email, phone: p?.phone, sex: p?.sex,
                  age: p?.age, height: p?.height, weight: p?.weight, notes: p?.notes });
    setAnalyses(a);
    setLoading(false);
  };
  useEffect(() => { load(); }, [pid]);

  const handleSaveAnalysis = async ({ imageDataUrl, mediaType, aiResult, metrics, notes }) => {
    let imageUrl = null, imagePath = null;
    try {
      const up = await uploadAnalysisImage(pid, imageDataUrl, mediaType);
      imageUrl = up.url; imagePath = up.path;
    } catch (e) { console.error("Upload:", e); }

    await saveAnalysis(pid, user.uid, {
      aiResult, metrics, notes, imageUrl, imagePath,
      patientSnapshot: {
        sex: patient.sex, age: patient.age, height: patient.height, weight: patient.weight,
      },
    });
    setShowForm(false);
    await load();
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    await updatePatient(pid, {
      name: editData.name, email: editData.email, phone: editData.phone, sex: editData.sex,
      age: parseInt(editData.age), height: parseFloat(editData.height),
      weight: parseFloat(editData.weight), notes: editData.notes,
    });
    await load();
    setEditMode(false);
    setSavingEdit(false);
  };

  const handleDeletePatient = async () => {
    if (!confirm(`Eliminar o paciente ${patient.name}? As análises ficam guardadas mas o paciente deixa de aparecer.`)) return;
    await deletePatient(pid);
    navigate("/");
  };

  const handleDeleted = (id) => setAnalyses(prev => prev.filter(a => a.id !== id));

  const S = {
    page:  { maxWidth: 620, margin: "0 auto", padding: "28px 20px 60px", fontFamily: t.font },
    input: {
      width: "100%", padding: "10px 12px",
      background: t.cardAlt, border: `1px solid ${t.border}`,
      borderRadius: t.rSm, color: t.text, fontSize: 14,
      fontFamily: t.font, outline: "none",
    },
    label: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: t.textSoft, textTransform: "uppercase", display: "block", marginBottom: 4 },
    sHdr:  { fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 12 },
  };

  if (loading) return <div style={{ textAlign: "center", paddingTop: 80, color: t.textSoft, fontFamily: t.font }}>A carregar...</div>;
  if (!patient) return <div style={{ textAlign: "center", paddingTop: 80, color: t.textSoft, fontFamily: t.font }}>Paciente não encontrado.</div>;

  const last = analyses[0];

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input:focus,select:focus,textarea:focus { border-color: ${t.teal} !important; box-shadow: 0 0 0 3px rgba(26,159,198,0.1); }
      `}</style>

      {/* Patient card */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: t.rXl, padding: 20, marginBottom: 18, boxShadow: t.shadowSm,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: editMode ? 18 : 0 }}>
          <div style={{
            width: 58, height: 58, borderRadius: 16,
            background: `${avatarBg(patient.name)}1a`, color: avatarBg(patient.name),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800,
          }}>{initials(patient.name)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: t.navy }}>{patient.name}</div>
            {patient.email && <div style={{ fontSize: 12.5, color: t.textSoft, marginTop: 2 }}>{patient.email}</div>}
            {patient.phone && <div style={{ fontSize: 12, color: t.textSoft }}>{patient.phone}</div>}
            <div style={{ fontSize: 12, color: t.textMid, marginTop: 4 }}>
              {patient.sex === "M" ? "♂" : "♀"} · {patient.age} anos · {patient.height} cm · {patient.weight} kg
            </div>
          </div>
          <button style={{ ...btn(t, "ghost"), padding: "7px 13px" }} onClick={() => setEditMode(e => !e)}>
            {editMode ? "✕" : "✏️"}
          </button>
        </div>

        {!editMode && patient.notes && (
          <div style={{
            marginTop: 14, padding: "10px 12px", background: t.cardAlt,
            border: `1px solid ${t.border}`, borderRadius: t.rSm,
            fontSize: 13, color: t.textMid, lineHeight: 1.5,
          }}>{patient.notes}</div>
        )}

        {editMode && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={S.label}>Nome</label>
                <input style={S.input} value={editData.name || ""} onChange={e => setEditData({ ...editData, name: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Email</label>
                <input style={S.input} value={editData.email || ""} onChange={e => setEditData({ ...editData, email: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Telefone</label>
                <input style={S.input} value={editData.phone || ""} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
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
              <div style={{ gridColumn: "1/-1" }}>
                <label style={S.label}>Notas</label>
                <textarea style={{ ...S.input, minHeight: 56, resize: "vertical" }}
                  value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn(t, "danger"), flex: 1 }} onClick={handleDeletePatient}>Eliminar</button>
              <button style={{ ...btn(t, "primary"), flex: 2 }} onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? "A guardar..." : "Guardar"}
              </button>
            </div>
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

      {/* History */}
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
        analyses.map(a => <AnalysisCard key={a.id} analysis={a} canDelete onDeleted={handleDeleted} />)
      )}

      {showForm && (
        <AnalysisForm
          patientProfile={patient}
          onSave={handleSaveAnalysis}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
