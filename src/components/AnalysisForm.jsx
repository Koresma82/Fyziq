import { useState, useRef, useCallback, useEffect } from "react";
import { buildMetrics } from "../utils/calculations";
import { theme, btn } from "../config/theme";
import PoseEditor from "./PoseEditor";
import MultiAngleCapture, { ANGLES } from "./MultiAngleCapture";

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
  const [step, setStep] = useState("capture");   // capture → pose → analyzing → results
  const [images, setImages] = useState({});       // { front:{dataUrl,mediaType,info}, left:{...}, ... }
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userPose, setUserPose] = useState(null); // esqueleto ajustado pelo utilizador
  const [resultAngle, setResultAngle] = useState("front"); // ângulo visível nos resultados

  // Ajuste da foto sob o esqueleto: zoom + deslocamento
  const [imgTransform, setImgTransform] = useState({ zoom: 1, x: 0, y: 0 });
  const panRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const stageRef = useRef(null);

  const { sex, height, weight, age } = patientProfile;

  // Atalhos: foto frontal é a referência para o esqueleto
  const frontImage   = images.front;
  const imageDataUrl = frontImage?.dataUrl || null;

  // ── Recebe as fotos do MultiAngleCapture ────────────────────
  const handleCaptureConfirm = (imgs) => {
    setImages(imgs);
    setAiResult(null);
    setError(null);
    setStep("pose");
  };

  // ── Envia para análise (multi-imagem + pose ajustada) ───────
  const analyze = async (pose) => {
    setUserPose(pose);
    setStep("analyzing");
    setError(null);

    // Monta o array de imagens com ângulo identificado
    const imgArray = Object.entries(images).map(([angle, im]) => ({
      angle,
      base64: im.dataUrl.split(",")[1],
      mediaType: im.mediaType || "image/jpeg",
    }));

    try {
      const res = await fetch("/.netlify/functions/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imgArray, sex, height, weight, age, userPose: pose,
        }),
      });

      let data;
      try { data = await res.json(); }
      catch {
        throw new Error(
          res.status === 502 || res.status === 504
            ? "O servidor demorou demasiado a responder. Tenta novamente."
            : `Resposta inválida do servidor (HTTP ${res.status}).`
        );
      }

      if (!res.ok || data.error) {
        const msg = data?.error || "";
        if (/api key|configurada/i.test(msg)) {
          throw new Error("Chave da IA não configurada no servidor. Contacta o administrador.");
        }
        if (/quota|rate|limit/i.test(msg)) {
          throw new Error("Limite de utilização da IA atingido. Tenta mais tarde.");
        }
        if (res.status === 413 || /too large|grande/i.test(msg)) {
          throw new Error("As imagens são demasiado grandes. Usa fotos mais pequenas.");
        }
        throw new Error(msg || `Erro na análise (HTTP ${res.status}).`);
      }

      // A pose ajustada pelo utilizador é a referência do esqueleto (foto frontal)
      if (pose) data.landmarks = pose;

      if (!data.landmarks && !data.measurements) {
        throw new Error("Não foi detectada uma pessoa de corpo inteiro nas fotos. Garante que a pessoa aparece da cabeça aos pés.");
      }

      setAiResult(data);
      setResultAngle("front");
      setStep("results");
    } catch (err) {
      console.error("Analyze:", err);
      setError(err.message || "Erro inesperado na análise.");
      setStep("pose");
    }
  };

  const handleSave = async () => {
    if (!aiResult) return;
    setSaving(true);
    const metrics = buildMetrics(
      { sex, height: parseFloat(height), weight: parseFloat(weight), age: parseInt(age) },
      aiResult.measurements, aiResult.bodyFatEstimate,
    );
    await onSave({
      imageDataUrl, mediaType: frontImage?.mediaType || "image/jpeg",
      images, aiResult, metrics, notes, imgTransform,
    });
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

  // ── Pan / Zoom da foto ──────────────────────────────────────
  const startPan = (clientX, clientY) => {
    panRef.current = {
      active: true, startX: clientX, startY: clientY,
      baseX: imgTransform.x, baseY: imgTransform.y,
    };
  };
  const movePan = (clientX, clientY) => {
    if (!panRef.current.active) return;
    setImgTransform(prev => ({
      ...prev,
      x: panRef.current.baseX + (clientX - panRef.current.startX),
      y: panRef.current.baseY + (clientY - panRef.current.startY),
    }));
  };
  const endPan = () => { panRef.current.active = false; };

  const onMouseDown  = (e) => startPan(e.clientX, e.clientY);
  const onMouseMove  = (e) => movePan(e.clientX, e.clientY);
  const onTouchStart = (e) => { const t0 = e.touches[0]; startPan(t0.clientX, t0.clientY); };
  const onTouchMove  = (e) => { const t0 = e.touches[0]; movePan(t0.clientX, t0.clientY); };

  const adjustZoom = (delta) => {
    setImgTransform(prev => ({
      ...prev,
      zoom: Math.min(3, Math.max(0.5, +(prev.zoom + delta).toFixed(2))),
    }));
  };
  const resetTransform = () => setImgTransform({ zoom: 1, x: 0, y: 0 });

  const metrics = aiResult ? buildMetrics(
    { sex, height: parseFloat(height), weight: parseFloat(weight), age: parseInt(age) },
    aiResult.measurements, aiResult.bodyFatEstimate,
  ) : null;

  const zoomBtn = {
    width: 32, height: 32, borderRadius: 9,
    border: `1px solid ${t.border}`, background: t.card,
    color: t.textMid, fontSize: 16, fontWeight: 700,
    cursor: "pointer", fontFamily: t.font,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  const chipStyle = (color) => ({
    fontSize: 11, fontWeight: 700,
    color, background: `${color}14`,
    border: `1px solid ${color}30`,
    padding: "4px 9px", borderRadius: 7,
  });

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

  // Captura multi-ângulo — ecrã próprio.
  if (step === "capture") {
    return (
      <MultiAngleCapture
        onConfirm={handleCaptureConfirm}
        onCancel={onCancel}
      />
    );
  }

  // Editor de esqueleto — ecrã inteiro, sobre a foto frontal.
  if (step === "pose") {
    return (
      <PoseEditor
        imageDataUrl={imageDataUrl}
        onBack={() => setStep("capture")}
        onConfirm={(pose) => analyze(pose)}
      />
    );
  }

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>

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

            {/* Seletor de ângulos (só os que existem) */}
            {Object.keys(images).length > 1 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {ANGLES.filter(a => images[a.key]).map(a => (
                  <button key={a.key}
                    onClick={() => { setResultAngle(a.key); resetTransform(); }}
                    style={{
                      flex: 1, minWidth: 70, padding: "7px 4px",
                      borderRadius: t.rSm,
                      border: `1.5px solid ${resultAngle === a.key ? t.teal : t.border}`,
                      background: resultAngle === a.key ? `${t.teal}12` : t.card,
                      color: resultAngle === a.key ? t.teal : t.textMid,
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: t.font,
                    }}>{a.label}</button>
                ))}
              </div>
            )}

            {/* Toggle esqueleto — só relevante na vista frontal */}
            {resultAngle === "front" && (
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
            )}

            {/* Stage: foto arrastável; esqueleto só na vista frontal */}
            <div
              ref={stageRef}
              style={{
                ...S.imgWrap,
                cursor: "grab", touchAction: "none", userSelect: "none",
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={endPan}
              onMouseLeave={endPan}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={endPan}
            >
              <img ref={imgRef}
                src={images[resultAngle]?.dataUrl || imageDataUrl}
                alt={`análise ${resultAngle}`}
                draggable={false}
                style={{
                  width: "100%", display: "block",
                  transform: `translate(${imgTransform.x}px, ${imgTransform.y}px) scale(${imgTransform.zoom})`,
                  transformOrigin: "center center",
                  transition: panRef.current.active ? "none" : "transform 0.12s",
                }}
                onLoad={drawSkeleton} />
              <canvas ref={canvasRef}
                style={{ ...S.canvas, display: resultAngle === "front" ? "block" : "none" }} />
            </div>

            {/* Controlos de ajuste da foto */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              marginBottom: 14, marginTop: 8,
            }}>
              <span style={{ fontSize: 11, color: t.textSoft, fontWeight: 700, flex: 1 }}>
                ✋ Arrasta a foto · ajusta ao esqueleto
              </span>
              <button onClick={() => adjustZoom(-0.15)} style={zoomBtn}>−</button>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.textMid, minWidth: 38, textAlign: "center" }}>
                {Math.round(imgTransform.zoom * 100)}%
              </span>
              <button onClick={() => adjustZoom(0.15)} style={zoomBtn}>+</button>
              <button onClick={resetTransform} style={{ ...zoomBtn, width: "auto", padding: "0 10px", fontSize: 11 }}>
                ⟲
              </button>
            </div>

            <div style={S.section}>
              <div style={S.sHdr}>Métricas Calculadas</div>
              {aiResult.measurementConfidence && (
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: aiResult.measurementConfidence === "high" ? t.green : t.amber,
                  marginBottom: 10, display: "flex", alignItems: "center", gap: 5,
                }}>
                  {aiResult.measurementConfidence === "high"
                    ? "✓ Precisão alta — análise com frente + perfil"
                    : "ⓘ Precisão média — junta uma foto de perfil para melhorar"}
                </div>
              )}
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

            {/* Breakdown detalhado da postura (8 pontos) */}
            {aiResult.postureBreakdown && (
              <div style={S.section}>
                <div style={S.sHdr}>Avaliação Postural — {aiResult.postureScore}/100</div>
                {Object.entries(aiResult.postureBreakdown).map(([key, item]) => {
                  const sc = item.score ?? 0;
                  const c = sc >= 80 ? t.green : sc >= 60 ? t.amber : t.red;
                  return (
                    <div key={key} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, color: t.textMid, fontWeight: 600 }}>{item.label}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: c }}>{sc}</span>
                      </div>
                      <div style={{ height: 6, background: t.cardAlt, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${sc}%`,
                          background: c, borderRadius: 3, transition: "width 0.6s",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {aiResult.postureIssues?.length > 0 && (
              <div style={S.section}>
                <div style={S.sHdr}>Problemas Detectados</div>
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
                      {issue.region && (
                        <div style={{ fontSize: 10, color: c, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>
                          {issue.region}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: t.textMid, lineHeight: 1.45 }}>{issue.description}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {aiResult.recommendations?.length > 0 && (
              <div style={S.section}>
                <div style={S.sHdr}>Recomendações</div>
                {aiResult.recommendations.map((rec, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12.5, color: t.textMid, lineHeight: 1.45 }}>
                    <span style={{ color: t.teal, fontWeight: 800 }}>{i + 1}.</span>
                    <span>{rec}</span>
                  </div>
                ))}
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
              <button style={{ ...btn(t, "ghost"), flex: 1 }} onClick={() => { setStep("pose"); setAiResult(null); }}>← Refazer</button>
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
