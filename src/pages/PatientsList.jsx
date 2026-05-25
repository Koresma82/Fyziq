import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { theme, btn } from "../config/theme";
import { listPatients, createPatient } from "../services/firestoreService";

const t = theme;
const avatarColors = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899"];
const avatarBg = (n) => avatarColors[(n?.charCodeAt(0) || 0) % avatarColors.length];
const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";

function initForm() {
  return { name: "", email: "", phone: "", sex: "M", age: "", height: "", weight: "", notes: "" };
}

export default function PatientsList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(initForm());
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const p = await listPatients(user.uid);
    setPatients(p);
    setLoading(false);
  };
  // Recarrega assim que o user.uid estiver disponível.
  useEffect(() => { load(); }, [user?.uid]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const id = await createPatient(user.uid, form);
      setShowForm(false);
      setForm(initForm());
      navigate(`/patient/${id}`);
    } finally { setSaving(false); }
  };

  const filtered = patients.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const S = {
    page:  { maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px", fontFamily: t.font },
    input: {
      width: "100%", padding: "11px 14px",
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: t.rMd, color: t.text, fontSize: 14,
      fontFamily: t.font, outline: "none",
    },
    label: { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: t.textSoft, textTransform: "uppercase", display: "block", marginBottom: 6 },
  };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input:focus,select:focus,textarea:focus { border-color: ${t.teal} !important; box-shadow: 0 0 0 3px rgba(26,159,198,0.1); }
        .pcard:hover { border-color: ${t.borderHover} !important; box-shadow: ${t.shadowMd} !important; transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: t.navy, letterSpacing: -0.5 }}>Pacientes</h1>
        <button style={btn(t, "primary")} onClick={() => setShowForm(true)}>+ Novo Paciente</button>
      </div>

      {/* Stat */}
      <div style={{
        background: t.card, border: `1px solid ${t.border}`,
        borderRadius: t.rMd, padding: "14px 18px", marginBottom: 18,
        boxShadow: t.shadowSm, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: t.gradientSoft, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>👥</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.teal }}>{patients.length}</div>
          <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>
            paciente{patients.length !== 1 ? "s" : ""} registado{patients.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Search */}
      <input style={{ ...S.input, marginBottom: 18 }}
        placeholder="🔍 Pesquisar paciente..."
        value={search} onChange={e => setSearch(e.target.value)} />

      {/* Patient cards */}
      {loading ? (
        <div style={{ textAlign: "center", color: t.textSoft, paddingTop: 40 }}>A carregar...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: t.textSoft, paddingTop: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧍</div>
          <div style={{ fontWeight: 600, color: t.textMid }}>
            {search ? "Nenhum paciente encontrado" : "Sem pacientes ainda"}
          </div>
          {!search && <div style={{ fontSize: 13, marginTop: 4 }}>Cria o primeiro com "+ Novo Paciente"</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filtered.map(p => (
            <div key={p.id} className="pcard"
              style={{
                background: t.card, border: `1px solid ${t.border}`,
                borderRadius: t.rLg, padding: 16, boxShadow: t.shadowSm,
                cursor: "pointer", transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: 13,
              }}
              onClick={() => navigate(`/patient/${p.id}`)}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: `${avatarBg(p.name)}1a`, color: avatarBg(p.name),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17, fontWeight: 800,
              }}>{initials(p.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{p.name}</div>
                {p.email && (
                  <div style={{ fontSize: 12, color: t.textSoft, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>
                )}
                <div style={{ fontSize: 11, color: t.textSoft, marginTop: 3 }}>
                  {p.sex === "M" ? "♂" : "♀"} · {p.age}a · {p.height}cm · {p.weight}kg
                </div>
              </div>
              <span style={{ color: t.textSoft, fontSize: 20 }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Create patient modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(28,39,56,0.45)",
          backdropFilter: "blur(4px)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: t.card, borderRadius: t.rXl, boxShadow: t.shadowLg,
            maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24,
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: t.navy }}>Novo Paciente</span>
              <button style={{ ...btn(t, "ghost"), padding: "6px 12px" }} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <label style={S.label}>Nome *</label>
            <input style={{ ...S.input, marginBottom: 14 }} placeholder="Maria Santos"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Email</label>
                <input style={S.input} type="email" placeholder="opcional"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Telefone</label>
                <input style={S.input} placeholder="opcional"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Sexo</label>
                <select style={{ ...S.input, cursor: "pointer", padding: "11px 6px" }} value={form.sex}
                  onChange={e => setForm({ ...form, sex: e.target.value })}>
                  <option value="M">♂</option>
                  <option value="F">♀</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Idade</label>
                <input style={S.input} type="number" placeholder="25"
                  value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Alt.cm</label>
                <input style={S.input} type="number" placeholder="170"
                  value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Peso</label>
                <input style={S.input} type="number" step="0.5" placeholder="70"
                  value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
              </div>
            </div>

            <label style={S.label}>Notas</label>
            <textarea style={{ ...S.input, minHeight: 64, resize: "vertical", marginBottom: 18 }}
              placeholder="Observações iniciais (opcional)"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

            <button style={{ ...btn(t, "primary"), width: "100%", padding: 14 }}
              onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving ? "A criar..." : "Criar Paciente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
