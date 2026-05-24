import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { theme, btn } from "../config/theme";
import {
  listUsers, listPendingProfiles,
  createPendingProfile, deletePendingProfile,
} from "../services/firestoreService";

const t = theme;

function initForm() {
  return { email: "", name: "", sex: "M", age: "", height: "", weight: "", role: "user" };
}

const avatarColors = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899"];
const avatarBg  = (n) => avatarColors[(n?.charCodeAt(0) || 0) % avatarColors.length];
const initials  = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users,    setUsers]    = useState([]);
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(initForm());
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState("");

  const load = async () => {
    setLoading(true);
    const [u, p] = await Promise.all([listUsers(), listPendingProfiles()]);
    setUsers(u); setPending(p); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.name) return;
    setSaving(true);
    try {
      await createPendingProfile(user.uid, {
        email:  form.email.trim().toLowerCase(),
        name:   form.name.trim(),
        sex:    form.sex,
        age:    parseInt(form.age) || 25,
        height: parseInt(form.height) || 170,
        weight: parseFloat(form.weight) || 70,
        role:   form.role,
      });
      setShowForm(false); setForm(initForm()); await load();
    } finally { setSaving(false); }
  };

  const handleDeletePending = async (e, email) => {
    e.stopPropagation();
    if (!confirm(`Remover convite de ${email}?`)) return;
    await deletePendingProfile(email); await load();
  };

  const allItems = [
    ...users.map(u => ({ ...u, isPending: false })),
    ...pending.map(p => ({ ...p, isPending: true })),
  ].filter(u => !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()));

  const S = {
    page:  { maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px", fontFamily: t.font },
    input: {
      width: "100%", padding: "11px 14px",
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: t.rMd, color: t.text, fontSize: 14,
      fontFamily: t.font, outline: "none",
    },
    label: { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", display: "block", marginBottom: 6 },
  };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input:focus,select:focus { border-color: ${t.teal} !important; box-shadow: 0 0 0 3px rgba(26,159,198,0.1); }
        .ucard:hover { border-color: ${t.borderHover} !important; box-shadow: ${t.shadowMd} !important; transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: t.navy, letterSpacing: -0.5 }}>Utilizadores</h1>
        <button style={btn(t, "primary")} onClick={() => setShowForm(true)}>+ Novo</button>
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{
          flex: 1, background: t.card, border: `1px solid ${t.border}`,
          borderRadius: t.rMd, padding: "12px 16px", boxShadow: t.shadowSm,
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: t.teal }}>{users.length}</div>
          <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Activos</div>
        </div>
        <div style={{
          flex: 1, background: t.card, border: `1px solid ${t.border}`,
          borderRadius: t.rMd, padding: "12px 16px", boxShadow: t.shadowSm,
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: t.amber }}>{pending.length}</div>
          <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Pendentes</div>
        </div>
      </div>

      {/* Search */}
      <input style={{ ...S.input, marginBottom: 18 }}
        placeholder="🔍 Pesquisar por nome ou email..."
        value={search} onChange={e => setSearch(e.target.value)} />

      {/* Grid of user cards */}
      {loading ? (
        <div style={{ textAlign: "center", color: t.textSoft, paddingTop: 40 }}>A carregar...</div>
      ) : allItems.length === 0 ? (
        <div style={{ textAlign: "center", color: t.textSoft, paddingTop: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 600 }}>Sem utilizadores. Cria o primeiro!</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {allItems.map(u => (
            <div key={u.id} className="ucard"
              style={{
                background: t.card, border: `1px solid ${t.border}`,
                borderRadius: t.rLg, padding: 16,
                boxShadow: t.shadowSm,
                cursor: u.isPending ? "default" : "pointer",
                transition: "all 0.18s",
                display: "flex", alignItems: "center", gap: 13,
              }}
              onClick={() => !u.isPending && navigate(`/user/${u.id}`)}>

              {u.photoURL ? (
                <img src={u.photoURL} alt="" style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: `${avatarBg(u.name)}1a`, color: avatarBg(u.name),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 800,
                }}>{initials(u.name)}</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{u.name}</span>
                  {u.isPending && <span style={{ fontSize: 9.5, fontWeight: 800, color: t.amber, background: "rgba(245,158,11,0.12)", padding: "2px 7px", borderRadius: 6 }}>PENDENTE</span>}
                  {u.role === "admin" && <span style={{ fontSize: 9.5, fontWeight: 800, color: t.teal, background: "rgba(26,159,198,0.12)", padding: "2px 7px", borderRadius: 6 }}>ADMIN</span>}
                </div>
                <div style={{ fontSize: 12, color: t.textSoft, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                {!u.isPending && (
                  <div style={{ fontSize: 11, color: t.textSoft, marginTop: 3 }}>
                    {u.sex === "M" ? "♂" : "♀"} · {u.age}a · {u.height}cm · {u.weight}kg
                  </div>
                )}
              </div>

              {u.isPending ? (
                <button style={{ ...btn(t, "danger"), padding: "6px 10px", fontSize: 13 }}
                  onClick={e => handleDeletePending(e, u.email)}>✕</button>
              ) : (
                <span style={{ color: t.textSoft, fontSize: 20 }}>›</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(28,39,56,0.45)",
          backdropFilter: "blur(4px)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: t.card, borderRadius: t.rXl,
            boxShadow: t.shadowLg, maxWidth: 460, width: "100%",
            maxHeight: "90vh", overflowY: "auto", padding: 24,
          }} onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: t.navy }}>Novo Utilizador</span>
              <button style={{ ...btn(t, "ghost"), padding: "6px 12px" }} onClick={() => setShowForm(false)}>✕</button>
            </div>

            <label style={S.label}>Email (conta Google)</label>
            <input style={{ ...S.input, marginBottom: 14 }} type="email" placeholder="joao@gmail.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

            <label style={S.label}>Nome completo</label>
            <input style={{ ...S.input, marginBottom: 14 }} placeholder="João Silva"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Sexo</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={form.sex}
                  onChange={e => setForm({ ...form, sex: e.target.value })}>
                  <option value="M">♂ Masculino</option>
                  <option value="F">♀ Feminino</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Função</label>
                <select style={{ ...S.input, cursor: "pointer" }} value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">Utilizador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { key: "age", label: "Idade", ph: "25" },
                { key: "height", label: "Altura", ph: "170" },
                { key: "weight", label: "Peso", ph: "70" },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label style={S.label}>{label}</label>
                  <input style={S.input} type="number" placeholder={ph}
                    value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>

            <div style={{
              background: t.gradientSoft, border: `1px solid rgba(26,159,198,0.2)`,
              borderRadius: t.rMd, padding: "11px 14px", marginBottom: 18,
              fontSize: 13, color: t.textMid, lineHeight: 1.5,
            }}>
              📧 Partilha o link da app com <strong style={{ color: t.teal }}>{form.email || "o utilizador"}</strong>. Ao entrar com o Google, o perfil é criado automaticamente.
            </div>

            <button style={{ ...btn(t, "primary"), width: "100%", padding: 14 }}
              onClick={handleCreate} disabled={saving || !form.email || !form.name}>
              {saving ? "A criar..." : "Criar Utilizador"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
