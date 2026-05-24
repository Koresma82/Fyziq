import { useState, useRef, useCallback, useEffect } from "react";
import { buildMetrics } from "../utils/calculations";
import { theme, btn } from "../config/theme";

const t = theme;

const CONNECTIONS = [
  ["nose","left_shoulder"],["nose","right_shoulder"],
  ["left_shoulder","right_shoulder"],
  ["left_shoulder","left_elbow"],["right_shoulder","right_elbow"],
  ["left_elbow","left_wrist"],["right_elbow","right_wrist"],
  ["left_shoulder","left_hip"],["right_shoulder","right_hip"],
  ["left_hip","right_hip"],
  ["left_hip","left_knee"],["right_hip","right_knee"],
  ["left_knee","left_ankle"],["right_knee","right_ankle"],
];

export default function AnalysisForm({ patientProfile, onSave, onCancel }) {
  const [step, setStep] = useState("photo");
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const { sex, height, weight, age } = patientProfile;

  const handleFile = (file) => {
    if (!file?.type?.startsWith("image/")) return;
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => { setImageDataUrl(e.target.result); setAiResult(null); setError(null); setStep("preview"); };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    setStep("analyzing"); setError(null);
    const base64 = imageDataUrl.split(",")[1];
    try {
      const res = await fetch("/.netlify/functions/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, sex, height, weight, age }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResult(data); setStep("results");
    } catch (err) {
      console.error(err);
      setError("Erro na análise. Verifica se a imagem mostra uma pessoa de corpo inteiro.");
      setStep("preview");
    }
  };

  const handleSave = async () => {
    if (!aiResult) return;
    setSaving(true);
    const metrics = buildMetrics(
      { sex, height: parseFloat(height), weight: parseFloat(weight), age: parseInt(age) },
      aiResult.measurements, aiResult.bodyFatEstimate,
    );
    await onSave({ imageDataUrl, mediaType, aiResult, metrics, notes });
    setSaving(false);
  };

  const drawSkeleton = useCallback(() => {
    const canvas = canvasRef.current, img = imgRef.current;
    if (!canvas || !img || !aiResult?.landmarks) return;
    canvas.width = img.offsetWidth; canvas.height = img.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!showSkeleton) return;
    const W = canvas.width, H = canvas.height, lm = aiResult.landmarks;
    ctx.save();
    ctx.strokeStyle = "#1a9fc6"; ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(26,159,198,0.5)"; ctx.shadowBlur = 6;
    CONNECTIONS.forEach(([a, b]) => {
      if (lm[a] && lm[b]) {
        ctx.beginPath();
        ctx.moveTo(lm[a].x * W, lm[a].y * H);
        ctx.lineTo(lm[b].x * W, lm[b].y * H);
        ctx.stroke();
      }
    });
    Object.values(lm).forEach(({ x, y }) => {
      ctx.beginPath();
      ctx.arc(x * W, y * H, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#3ad6bf"; ctx.shadowBlur = 10; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.restore();
  }, [aiResult, showSkeleton]);

  useEffect(() => { if (step === "results") setTimeout(drawSkeleton, 150); }, [step, showSkeleton, drawSkeleton]);
  useEffect(() => {
    const obs = new ResizeObserver(drawSkeleton);
    if (imgRef.current) obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [drawSkeleton]);

  const metrics = aiResult ? buildMetrics(
    { sex, height: parseFloat(height), weight: parseFloat(weight), age: parseInt(age) },
    aiResult.measurements, aiResult.bodyFatEstimate,
  ) : null;

  const S = {
    overlay: {
      position: "fixed", inset: 0, background: "rgba(28,39,56,0.5)",
      backdropFilter: "blur(6px)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: t.font,
    },
    sheet: {
      background: t.card, borderRadius: t.rXl,
      boxShadow: t.shadowLg, width: "100%", maxWidth: 480,
      maxHeight: "92vh", overflowY: "auto", padding: 24,
    },
    title: { fontSize: 19, fontWeight: 800, color: t.navy, marginBottom: 18 },
    drop: (drag) => ({
      border: `2px dashed ${drag ? t.teal : t.border}`,
      borderRadius: t.rLg, padding: "40px 20px",
      textAlign: "center", cursor: "pointer",
      background: drag ? t.gradientSoft : t.cardAlt,
      transition: "all 0.2s",
    }),
    imgWrap: { position: "relative", borderRadius: t.rMd, overflow: "hidden", background: "#000", marginBottom: 14 },
    canvas: { position: "absolute", top: 0, left: 0, pointerEvents: "none" },
    section: { background: t.cardAlt, border: `1px solid ${t.border}`, borderRadius: t.rMd, padding: 14, marginBottom: 12 },
    sHdr: { fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", marginBottom: 12 },
    metaRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` },
    metaLabel: { fontSize: 13, color: t.textMid, fontWeight: 600 },
  };

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>

        {step === "photo" && (
          <>
            <div style={S.title}>Nova Análise</div>
            <div style={S.drop(dragging)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 46, marginBottom: 12 }}>🧍</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8 }}>Foto de corpo inteiro</div>
              <div style={{ fontSize: 13, color: t.textSoft, lineHeight: 1.6, marginBottom: 20 }}>
                De frente ou lateral · Roupa justa · Boa iluminação
              </div>
              <button style={btn(t, "primary")} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                Escolher Foto
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
            <button style={{ ...btn(t, "ghost"), width: "100%", marginTop: 14 }} onClick={onCancel}>Cancelar</button>
          </>
        )}

        {step === "preview" && (
          <>
            <div style={S.title}>Confirmar Foto</div>
            <div style={S.imgWrap}>
              <img src={imageDataUrl} alt="preview" style={{ width: "100%", display: "block" }} />
            </div>
            {error && (
              <div style={{
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: t.rMd, padding: 12, marginBottom: 14, fontSize: 13, color: t.red,
              }}>{error}</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn(t, "ghost"), flex: 1 }} onClick={() => { setImageDataUrl(null); setStep("photo"); }}>← Trocar</button>
              <button style={{ ...btn(t, "primary"), flex: 2 }} onClick={analyze}>🔍 Analisar com IA</button>
            </div>
          </>
        )}

        {step === "analyzing" && (
          <div style={{ textAlign: "center", padding: "44px 0" }}>
            <div style={{
              width: 54, height: 54, margin: "0 auto 18px",
              border: `4px solid ${t.border}`, borderTopColor: t.teal,
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>A analisar...</div>
            <div style={{ fontSize: 13, color: t.textSoft, marginTop: 6 }}>
              Postura · Perímetros · Composição corporal
            </div>
          </div>
        )}

        {step === "results" && aiResult && metrics && (
          <>
            <div style={S.title}>Resultado da Análise</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: t.textMid, fontWeight: 600 }}>Mostrar esqueleto</span>
              <button style={{
                width: 44, height: 24, borderRadius: 12, border: "none",
                background: showSkeleton ? t.teal : t.border,
                cursor: "pointer", position: "relative",
              }} onClick={() => setShowSkeleton(s => !s)}>
                <div style={{
                  position: "absolute", width: 18, height: 18, background: "#fff",
                  borderRadius: 9, top: 3, left: showSkeleton ? 23 : 3, transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
            <div style={S.imgWrap}>
              <img ref={imgRef} src={imageDataUrl} alt="análise"
                style={{ width: "100%", display: "block" }} onLoad={drawSkeleton} />
              <canvas ref={canvasRef} style={S.canvas} />
            </div>

            <div style={S.section}>
              <div style={S.sHdr}>Métricas Calculadas</div>
              {[
                { label: "IMC", val: `${metrics.imc} kg/m²`, sub: metrics.imcCat?.label, color: metrics.imcCat?.color },
                { label: "% Gordura", val: metrics.bf ? `${metrics.bf}%` : "—", sub: metrics.bfCat?.label, color: metrics.bfCat?.color },
                { label: "Massa Gorda", val: metrics.fatMass ? `${metrics.fatMass} kg` : "—", color: t.orange },
                { label: "Massa Magra", val: metrics.leanMass ? `${metrics.leanMass} kg` : "—", color: t.green },
                { label: "BMR", val: `${metrics.bmr} kcal/dia`, color: t.blue },
              ].map(({ label, val, sub, color }) => (
                <div key={label} style={S.metaRow}>
                  <span style={S.metaLabel}>{label}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: color || t.text }}>{val}</span>
                    {sub && <div style={{ fontSize: 10, color, fontWeight: 700 }}>{sub}</div>}
                  </div>
                </div>
              ))}
            </div>

            {aiResult.measurements && Object.keys(aiResult.measurements).length > 0 && (
              <div style={S.section}>
                <div style={S.sHdr}>Perímetros (estimativa IA)</div>
                {[
                  ["neck","Pescoço"],["chest","Tórax"],["waist","Cintura"],
                  ["abdomen","Abdómen"],["hip","Quadril"],["thigh_left","Coxa esq."],
                  ["arm_left","Braço esq."],["calf_left","Gémeo esq."],
                ].filter(([k]) => aiResult.measurements[k]).map(([k, lbl]) => (
                  <div key={k} style={S.metaRow}>
                    <span style={S.metaLabel}>{lbl}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: t.teal }}>{Math.round(aiResult.measurements[k])} cm</span>
                  </div>
                ))}
              </div>
            )}

            {aiResult.postureIssues?.length > 0 && (
              <div style={S.section}>
                <div style={S.sHdr}>Postura — {aiResult.postureScore}/100</div>
                {aiResult.postureIssues.map((issue, i) => {
                  const c = { low: t.green, medium: t.amber, high: t.red }[issue.severity] || t.textSoft;
                  return (
                    <div key={i} style={{ padding: "9px 11px", borderRadius: t.rSm, background: `${c}0d`, border: `1px solid ${c}26`, marginBottom: 7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{issue.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: c }}>
                          {issue.severity === "low" ? "Ligeiro" : issue.severity === "medium" ? "Moderado" : "Severo"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: t.textMid, lineHeight: 1.45 }}>{issue.description}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, color: t.textSoft, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Notas do avaliador
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Observações adicionais..."
                style={{
                  width: "100%", padding: "12px 14px", minHeight: 76, resize: "vertical",
                  background: t.cardAlt, border: `1px solid ${t.border}`,
                  borderRadius: t.rMd, color: t.text, fontSize: 14, fontFamily: t.font, outline: "none",
                }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn(t, "ghost"), flex: 1 }} onClick={() => { setStep("preview"); setAiResult(null); }}>← Refazer</button>
              <button style={{ ...btn(t, "primary"), flex: 2 }} onClick={handleSave} disabled={saving}>
                {saving ? "A guardar..." : "💾 Guardar"}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        textarea:focus { border-color: ${t.teal} !important; }`}</style>
    </div>
  );
}
