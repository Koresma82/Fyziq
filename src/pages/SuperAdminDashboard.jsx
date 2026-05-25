import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { theme, btn } from "../config/theme";
import {
  listAllProfessionals, setProfessionalPlan, setProfessionalActive,
  savePlanConfig, getProfessionalDetail,
} from "../services/firestoreService";
import {
  DEFAULT_PLANS, getPlans, getPlan, getAiCost,
  effectivePlan, trialDaysLeft, currentMonthKey,
} from "../config/plans";

const t = theme;
const initials = (n) => n ? n.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "?";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SuperAdminDashboard() {
  const { logout, planConfig, refreshPlanConfig } = useAuth();

  const [pros, setPros]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);   // detalhe completo carregado
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [showLimits, setShowLimits] = useState(false);

  // Abre o detalhe de um profissional
  const openDetail = async (pro) => {
    setSelected(pro);
    setTrialDays(plans.trial.trialDays);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await getProfessionalDetail(pro.id));
    } finally {
      setDetailLoading(false);
    }
  };

  // Limites efectivos (defaults + overrides do super admin)
  const plans  = getPlans(planConfig);
  const aiCost = getAiCost(planConfig);

  const load = async () => {
    setLoading(true);
    setPros(await listAllProfessionals());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ── Métricas globais ──────────────────────────────────────
  const month = currentMonthKey();
  const totals = pros.reduce((acc, p) => {
    acc.patients += p.patientCount || 0;
    acc.analyses += p.analysisCount || 0;
    acc.aiMonth  += (p.aiUsage?.[month]) || 0;
    return acc;
  }, { patients: 0, analyses: 0, aiMonth: 0 });
  const totalCost = totals.analyses * aiCost;

  const changePlan = async (uid, plan) => {
    setBusy(true);
    await setProfessionalPlan(uid, plan, trialDays);
    await load();
    setSelected(s => s && { ...s, plan });
    setBusy(false);
  };

  const toggleActive = async (uid, active) => {
    setBusy(true);
    await setProfessionalActive(uid, active);
    await load();
    setSelected(s => s && { ...s, active });
    setBusy(false);
  };

  const S = {
    page: { maxWidth: 880, margin: "0 auto", padding: "24px 20px 60px", fontFamily: t.font },
    statCard: {
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: t.rMd, padding: "14px 16px", boxShadow: t.shadowSm, flex: 1, minWidth: 140,
    },
    th: { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: t.textSoft, textTransform: "uppercase", textAlign: "left", padding: "8px 10px" },
    td: { fontSize: 13, color: t.text, padding: "10px", borderTop: `1px solid ${t.border}` },
    planPill: (planId) => {
      const p = plans[planId] || plans.trial;
      return {
        fontSize: 11, fontWeight: 800, color: p.color,
        background: `${p.color}15`, border: `1px solid ${p.color}33`,
        padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap",
      };
    },
    input: {
      width: "100%", padding: "9px 11px",
      background: t.cardAlt, border: `1px solid ${t.border}`,
      borderRadius: t.rSm, fontSize: 14, fontFamily: t.font, outline: "none",
    },
    label: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: t.textSoft, textTransform: "uppercase", display: "block", marginBottom: 4 },
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input:focus { border-color: ${t.teal} !important; }`}</style>

      {/* Top bar */}
      <div style={{
        background: t.navy, padding: "0 20px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, fontFamily: t.font }}>
            Fyziq · Super Admin
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowLimits(true)} style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "#fff", borderRadius: t.rSm, padding: "7px 14px",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: t.font,
          }}>⚙️ Limites</button>
          <button onClick={logout} style={{
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "#fff", borderRadius: t.rSm, padding: "7px 14px",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: t.font,
          }}>Sair</button>
        </div>
      </div>

      <div style={S.page}>
        {/* Global metrics */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <div style={S.statCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.teal }}>{pros.length}</div>
            <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Profissionais</div>
          </div>
          <div style={S.statCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.navy }}>{totals.patients}</div>
            <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Pacientes totais</div>
          </div>
          <div style={S.statCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.blue }}>{totals.analyses}</div>
            <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Análises IA totais</div>
          </div>
          <div style={S.statCard}>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.orange }}>
              ${totalCost.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>
              Custo IA estimado · {totals.aiMonth} este mês
            </div>
          </div>
        </div>

        {/* Professionals table */}
        <div style={{
          background: t.card, border: `1px solid ${t.border}`,
          borderRadius: t.rLg, boxShadow: t.shadowSm, overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: t.navy }}>Profissionais</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: t.textSoft }}>A carregar...</div>
          ) : pros.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: t.textSoft }}>
              Ainda não há profissionais registados.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={S.th}>Profissional</th>
                    <th style={S.th}>Plano</th>
                    <th style={S.th}>Pacientes</th>
                    <th style={S.th}>Análises</th>
                    <th style={S.th}>Mês</th>
                    <th style={S.th}>Custo IA</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {pros.map(p => {
                    const eff = effectivePlan(p);
                    const daysLeft = trialDaysLeft(p);
                    const cost = (p.analysisCount || 0) * aiCost;
                    return (
                      <tr key={p.id} style={{ opacity: p.active === false ? 0.45 : 1 }}>
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            {p.photoURL ? (
                              <img src={p.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: 9 }} />
                            ) : (
                              <div style={{
                                width: 32, height: 32, borderRadius: 9,
                                background: t.gradientSoft, color: t.teal,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 800,
                              }}>{initials(p.name)}</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: t.textSoft }}>{p.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={S.planPill(eff)}>{(plans[eff] || plans.trial).label}</span>
                          {p.plan === "trial" && daysLeft != null && (
                            <div style={{ fontSize: 10, color: t.textSoft, marginTop: 3 }}>
                              {daysLeft > 0 ? `${daysLeft}d restantes` : "expirado"}
                            </div>
                          )}
                        </td>
                        <td style={S.td}>{p.patientCount || 0}</td>
                        <td style={S.td}>{p.analysisCount || 0}</td>
                        <td style={S.td}>{p.aiUsage?.[month] || 0}</td>
                        <td style={S.td}>${cost.toFixed(2)}</td>
                        <td style={S.td}>
                          <button style={{ ...btn(t, "ghost"), padding: "5px 12px", fontSize: 12 }}
                            onClick={() => openDetail(p)}>
                            Detalhe
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Professional detail modal */}
      {selected && (
        <div style={modalBg} onClick={() => { setSelected(null); setDetail(null); }}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              {selected.photoURL ? (
                <img src={selected.photoURL} alt="" style={{ width: 52, height: 52, borderRadius: 14 }} />
              ) : (
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: t.gradientSoft, color: t.teal,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800,
                }}>{initials(selected.name)}</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: t.navy }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: t.textSoft }}>{selected.email}</div>
              </div>
              <button style={{ ...btn(t, "ghost"), padding: "5px 11px" }}
                onClick={() => { setSelected(null); setDetail(null); }}>✕</button>
            </div>

            {detailLoading ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: t.textSoft }}>
                A carregar detalhe...
              </div>
            ) : (
              <>
                {/* Métricas em grelha */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Pacientes", val: detail?.patientCount ?? selected.patientCount ?? 0, color: t.navy },
                    { label: "Análises IA", val: detail?.analysisCount ?? selected.analysisCount ?? 0, color: t.blue },
                    { label: "Custo IA total", val: `$${((detail?.analysisCount ?? 0) * aiCost).toFixed(2)}`, color: t.orange },
                    { label: "Análises este mês", val: selected.aiUsage?.[month] || 0, color: t.teal },
                  ].map(m => (
                    <div key={m.label} style={{
                      background: t.cardAlt, borderRadius: t.rMd, padding: "11px 13px",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: t.textSoft, textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: m.color, marginTop: 2 }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Datas / atividade */}
                <div style={{
                  background: t.cardAlt, borderRadius: t.rMd, padding: 13, marginBottom: 14,
                  fontSize: 12.5, color: t.textMid, lineHeight: 1.9,
                }}>
                  <div><strong>Registado:</strong> {fmtDate(selected.createdAt)}</div>
                  <div><strong>Último login:</strong> {fmtDate(selected.lastLoginAt)}</div>
                  <div><strong>Última análise:</strong> {detail?.lastAnalysis ? fmtDate(detail.lastAnalysis) : "—"}</div>
                  <div><strong>Estado:</strong> {selected.active === false
                    ? <span style={{ color: t.red, fontWeight: 700 }}>Desativada</span>
                    : <span style={{ color: t.green, fontWeight: 700 }}>Ativa</span>}</div>
                  {selected.plan === "trial" && (
                    <div><strong>Trial:</strong> {(() => {
                      const d = trialDaysLeft(selected);
                      return d > 0 ? `${d} dia(s) restantes` : "expirado";
                    })()}</div>
                  )}
                </div>

                {/* Lista de pacientes */}
                {detail?.patients?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ ...S.label, marginBottom: 6 }}>
                      Pacientes ({detail.patients.length})
                    </div>
                    <div style={{
                      maxHeight: 130, overflowY: "auto",
                      border: `1px solid ${t.border}`, borderRadius: t.rSm,
                    }}>
                      {detail.patients.map(pt => (
                        <div key={pt.id} style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "7px 11px", fontSize: 12.5,
                          borderBottom: `1px solid ${t.border}`,
                        }}>
                          <span style={{ fontWeight: 600, color: t.text }}>{pt.name}</span>
                          <span style={{ color: t.textSoft }}>
                            {pt.sex === "M" ? "♂" : "♀"} {pt.age}a
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gestão de plano */}
                <div style={{ ...S.label, marginBottom: 6 }}>
                  Plano · atual: {(plans[effectivePlan(selected)] || plans.trial).label}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {Object.keys(plans).map(planId => {
                    const p = plans[planId];
                    const active = selected.plan === planId;
                    return (
                      <button key={planId} disabled={busy}
                        onClick={() => changePlan(selected.id, planId)}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: t.rSm,
                          border: `1.5px solid ${active ? p.color : t.border}`,
                          background: active ? `${p.color}15` : t.card,
                          color: active ? p.color : t.textMid,
                          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: t.font,
                        }}>{p.label}</button>
                    );
                  })}
                </div>

                <label style={S.label}>Dias de trial (ao aplicar plano Trial)</label>
                <input type="number" value={trialDays} min={1} max={90}
                  onChange={e => setTrialDays(parseInt(e.target.value) || 7)}
                  style={{ ...S.input, marginBottom: 14 }} />

                <button disabled={busy}
                  onClick={() => toggleActive(selected.id, !(selected.active !== false))}
                  style={{
                    ...btn(t, selected.active === false ? "primary" : "danger"),
                    width: "100%",
                  }}>
                  {selected.active === false ? "Reativar conta" : "Desativar conta"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Limits config modal */}
      {showLimits && (
        <LimitsEditor
          plans={plans}
          aiCost={aiCost}
          onClose={() => setShowLimits(false)}
          onSaved={async () => { await refreshPlanConfig(); setShowLimits(false); }}
        />
      )}
    </div>
  );
}

const modalBg = {
  position: "fixed", inset: 0, background: "rgba(28,39,56,0.5)",
  backdropFilter: "blur(4px)", zIndex: 100,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modalBox = {
  background: theme.card, borderRadius: theme.rXl, boxShadow: theme.shadowLg,
  maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto",
  padding: 24, fontFamily: theme.font,
};

// ── Editor de limites ─────────────────────────────────────────
function LimitsEditor({ plans, aiCost, onClose, onSaved }) {
  // Estado editável: começa com os valores efectivos actuais
  const [draft, setDraft] = useState(() => ({
    trial: {
      maxPatients: plans.trial.maxPatients,
      maxAnalysesPerMonth: plans.trial.maxAnalysesPerMonth,
      trialDays: plans.trial.trialDays,
    },
    standard: {
      maxPatients: plans.standard.maxPatients,
      maxAnalysesPerMonth: plans.standard.maxAnalysesPerMonth,
    },
    premium: {
      maxPatients: plans.premium.maxPatients,
      maxAnalysesPerMonth: plans.premium.maxAnalysesPerMonth,
    },
    aiCost,
  }));
  const [saving, setSaving] = useState(false);

  const upd = (plan, field, value) => {
    setDraft(d => ({ ...d, [plan]: { ...d[plan], [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    // Converte campos vazios/inválidos: -1 mantém ilimitado
    const clean = JSON.parse(JSON.stringify(draft));
    await savePlanConfig(clean);
    setSaving(false);
    onSaved();
  };

  const resetDefaults = () => {
    setDraft({
      trial: {
        maxPatients: DEFAULT_PLANS.trial.maxPatients,
        maxAnalysesPerMonth: DEFAULT_PLANS.trial.maxAnalysesPerMonth,
        trialDays: DEFAULT_PLANS.trial.trialDays,
      },
      standard: {
        maxPatients: DEFAULT_PLANS.standard.maxPatients,
        maxAnalysesPerMonth: DEFAULT_PLANS.standard.maxAnalysesPerMonth,
      },
      premium: {
        maxPatients: DEFAULT_PLANS.premium.maxPatients,
        maxAnalysesPerMonth: DEFAULT_PLANS.premium.maxAnalysesPerMonth,
      },
      aiCost: 0.005,
    });
  };

  const t2 = theme;
  const inp = {
    width: "100%", padding: "9px 11px",
    background: t2.cardAlt, border: `1px solid ${t2.border}`,
    borderRadius: t2.rSm, fontSize: 14, fontFamily: t2.font, outline: "none",
  };
  const lbl = { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: t2.textSoft, textTransform: "uppercase", display: "block", marginBottom: 4 };

  const NumField = ({ value, onChange, hint }) => (
    <div>
      <input type="number" value={value}
        onChange={e => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
        style={inp} />
      {hint && <div style={{ fontSize: 10, color: t2.textSoft, marginTop: 2 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={modalBg} onClick={onClose}>
      <div style={modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: t2.navy }}>⚙️ Limites dos Planos</span>
          <button style={{ ...btn(t2, "ghost"), padding: "5px 11px" }} onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: t2.textSoft, marginBottom: 18, lineHeight: 1.5 }}>
          Define os limites de cada plano. Usa <strong>-1</strong> para ilimitado.
          As alterações aplicam-se a todos os profissionais.
        </div>

        {/* TRIAL */}
        <div style={{ ...sectionCard(t2, plans.trial.color) }}>
          <div style={planTitle(plans.trial.color)}>Trial</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Pacientes</label>
              <NumField value={draft.trial.maxPatients}
                onChange={v => upd("trial", "maxPatients", v)} />
            </div>
            <div>
              <label style={lbl}>Análises/mês</label>
              <NumField value={draft.trial.maxAnalysesPerMonth}
                onChange={v => upd("trial", "maxAnalysesPerMonth", v)} />
            </div>
            <div>
              <label style={lbl}>Dias trial</label>
              <NumField value={draft.trial.trialDays}
                onChange={v => upd("trial", "trialDays", v)} />
            </div>
          </div>
        </div>

        {/* STANDARD */}
        <div style={{ ...sectionCard(t2, plans.standard.color) }}>
          <div style={planTitle(plans.standard.color)}>Standard</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Pacientes</label>
              <NumField value={draft.standard.maxPatients}
                onChange={v => upd("standard", "maxPatients", v)} />
            </div>
            <div>
              <label style={lbl}>Análises/mês</label>
              <NumField value={draft.standard.maxAnalysesPerMonth}
                onChange={v => upd("standard", "maxAnalysesPerMonth", v)} />
            </div>
          </div>
        </div>

        {/* PREMIUM */}
        <div style={{ ...sectionCard(t2, plans.premium.color) }}>
          <div style={planTitle(plans.premium.color)}>Premium</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Pacientes</label>
              <NumField value={draft.premium.maxPatients}
                onChange={v => upd("premium", "maxPatients", v)}
                hint="-1 = ilimitado" />
            </div>
            <div>
              <label style={lbl}>Análises/mês</label>
              <NumField value={draft.premium.maxAnalysesPerMonth}
                onChange={v => upd("premium", "maxAnalysesPerMonth", v)}
                hint="-1 = ilimitado" />
            </div>
          </div>
        </div>

        {/* AI cost */}
        <div style={{ ...sectionCard(t2, t2.orange) }}>
          <div style={planTitle(t2.orange)}>Custo por análise IA (USD)</div>
          <NumField value={draft.aiCost}
            onChange={v => setDraft(d => ({ ...d, aiCost: v }))}
            hint="Usado só nas métricas de custo" />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button style={{ ...btn(t2, "ghost"), flex: 1 }} onClick={resetDefaults}>
            Repor defaults
          </button>
          <button style={{ ...btn(t2, "primary"), flex: 2 }} onClick={save} disabled={saving}>
            {saving ? "A guardar..." : "Guardar Limites"}
          </button>
        </div>
      </div>
    </div>
  );
}

const sectionCard = (t2, color) => ({
  background: t2.cardAlt, border: `1px solid ${color}30`,
  borderRadius: t2.rMd, padding: 14, marginBottom: 12,
});
const planTitle = (color) => ({
  fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
  color, textTransform: "uppercase", marginBottom: 10,
});
