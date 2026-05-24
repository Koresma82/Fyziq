import { useState } from "react";
import { deleteAnalysis } from "../services/firestoreService";
import { deleteAnalysisImage } from "../services/storageService";
import { IMC_RANGES, BF_RANGES } from "../utils/calculations";
import { theme } from "../config/theme";

const t = theme;

const imcColor = (imc) => (IMC_RANGES.find(r => imc < r.max) || IMC_RANGES.at(-1)).color;
const bfColor  = (bf, sex) => ((BF_RANGES[sex] || BF_RANGES.M).find(r => bf < r.max) || BF_RANGES.M.at(-1)).color;

function fmt(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AnalysisCard({ analysis, canDelete, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { metrics, aiResult, patientSnapshot, notes, imageUrl, imagePath } = analysis;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm("Eliminar esta análise?")) return;
    setDeleting(true);
    try {
      await Promise.all([deleteAnalysis(analysis.id), deleteAnalysisImage(imagePath)]);
      onDeleted?.(analysis.id);
    } finally { setDeleting(false); }
  };

  const sev = { low: t.green, medium: t.amber, high: t.red };
  const sevLabel = { low: "Ligeiro", medium: "Moderado", high: "Severo" };

  const pill = (color, label) => (
    <span style={{
      fontSize: 11, fontWeight: 800, color,
      background: `${color}15`, padding: "3px 9px", borderRadius: 8,
    }}>{label}</span>
  );

  const miniMetric = (label, val, unit, color) => (
    <div style={{ background: t.cardAlt, borderRadius: t.rSm, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: t.textSoft, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color, marginTop: 1 }}>
        {val}<span style={{ fontSize: 11, color: t.textSoft, fontWeight: 600 }}> {unit}</span>
      </div>
    </div>
  );

  const row = (label, val) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${t.border}` }}>
      <span style={{ fontSize: 12.5, color: t.textMid, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: t.teal }}>{val}</span>
    </div>
  );

  return (
    <div style={{
      background: t.card, border: `1px solid ${open ? t.borderHover : t.border}`,
      borderRadius: t.rLg, overflow: "hidden", marginBottom: 12,
      boxShadow: open ? t.shadowMd : t.shadowSm,
      transition: "all 0.18s", fontFamily: t.font,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 15, cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: t.gradientSoft,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
        }}>📊</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text }}>{fmt(analysis.date)}</div>
          {patientSnapshot?.weight && (
            <div style={{ fontSize: 11.5, color: t.textSoft, marginTop: 1 }}>{patientSnapshot.weight} kg</div>
          )}
        </div>
        {metrics?.imc && pill(imcColor(metrics.imc), `IMC ${metrics.imc}`)}
        {metrics?.bf && pill(bfColor(metrics.bf, patientSnapshot?.sex || "M"), `${metrics.bf}%`)}
        <span style={{ fontSize: 13, color: t.textSoft, marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Body */}
      {open && (
        <div onClick={e => e.stopPropagation()}>
          {imageUrl && (
            <div style={{ padding: "0 15px 12px" }}>
              <img src={imageUrl} alt="análise" style={{ width: "100%", borderRadius: t.rMd, display: "block" }} />
            </div>
          )}

          {metrics && (
            <div style={{ padding: "0 15px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {[
                { label: "IMC", val: metrics.imc, unit: "kg/m²", color: imcColor(metrics.imc) },
                { label: "% Gordura", val: metrics.bf ?? "—", unit: "%", color: metrics.bf ? bfColor(metrics.bf, patientSnapshot?.sex || "M") : t.textSoft },
                { label: "Massa Gorda", val: metrics.fatMass ?? "—", unit: "kg", color: t.orange },
                { label: "Massa Magra", val: metrics.leanMass ?? "—", unit: "kg", color: t.green },
                { label: "BMR", val: metrics.bmr, unit: "kcal", color: t.blue },
                { label: "Postura", val: aiResult?.postureScore ?? "—", unit: "/100", color: t.purple },
              ].filter(m => m.val != null).map(m => (
                <div key={m.label}>{miniMetric(m.label, m.val, m.unit, m.color)}</div>
              ))}
            </div>
          )}

          {aiResult?.measurements && (
            <div style={{ padding: "0 15px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 6 }}>Perímetros</div>
              {[
                ["neck","Pescoço"],["chest","Tórax"],["waist","Cintura"],
                ["abdomen","Abdómen"],["hip","Quadril"],["thigh_left","Coxa esq."],
                ["arm_left","Braço esq."],["calf_left","Gémeo esq."],
              ].filter(([k]) => aiResult.measurements[k]).map(([k, lbl]) =>
                <div key={k}>{row(lbl, `${Math.round(aiResult.measurements[k])} cm`)}</div>
              )}
            </div>
          )}

          {aiResult?.postureIssues?.length > 0 && (
            <div style={{ padding: "0 15px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 6 }}>Postura</div>
              {aiResult.postureIssues.map((issue, i) => {
                const c = sev[issue.severity] || t.textSoft;
                return (
                  <div key={i} style={{ padding: "9px 11px", borderRadius: t.rSm, background: `${c}0d`, border: `1px solid ${c}26`, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{issue.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: c }}>{sevLabel[issue.severity]}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: t.textMid, lineHeight: 1.45 }}>{issue.description}</div>
                  </div>
                );
              })}
            </div>
          )}

          {aiResult?.bodyCompositionNote && (
            <div style={{ margin: "0 15px 12px", padding: "10px 12px", background: t.gradientSoft, border: `1px solid rgba(26,159,198,0.18)`, borderRadius: t.rSm }}>
              <div style={{ fontSize: 10, color: t.teal, fontWeight: 800, marginBottom: 3 }}>NOTA IA</div>
              <div style={{ fontSize: 12, color: t.textMid, lineHeight: 1.5 }}>{aiResult.bodyCompositionNote}</div>
            </div>
          )}

          {notes && (
            <div style={{ margin: "0 15px 12px", padding: "10px 12px", background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: t.rSm }}>
              <div style={{ fontSize: 10, color: t.textSoft, fontWeight: 800, marginBottom: 3 }}>NOTAS DO AVALIADOR</div>
              <div style={{ fontSize: 12, color: t.textMid, lineHeight: 1.5 }}>{notes}</div>
            </div>
          )}

          {canDelete && (
            <div style={{ padding: "0 15px 15px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleDelete} disabled={deleting} style={{
                padding: "7px 16px", borderRadius: t.rSm,
                border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)",
                color: t.red, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: t.font,
              }}>{deleting ? "A eliminar..." : "🗑 Eliminar"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
