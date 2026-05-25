import { useRef, useEffect, useState, useCallback } from "react";
import { theme, btn } from "../config/theme";

const t = theme;

// Esqueleto simplificado (13 pontos) — coordenadas 0-1.
// Estes nomes batem certo com o que a análise IA usa.
const POINTS = [
  "nose",
  "left_shoulder", "right_shoulder",
  "left_elbow", "right_elbow",
  "left_wrist", "right_wrist",
  "left_hip", "right_hip",
  "left_knee", "right_knee",
  "left_ankle", "right_ankle",
];

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

// Esqueleto neutro por defeito (caso a deteção falhe)
const DEFAULT_POSE = {
  nose:           { x: 0.50, y: 0.08 },
  left_shoulder:  { x: 0.40, y: 0.24 }, right_shoulder: { x: 0.60, y: 0.24 },
  left_elbow:     { x: 0.34, y: 0.40 }, right_elbow:    { x: 0.66, y: 0.40 },
  left_wrist:     { x: 0.31, y: 0.54 }, right_wrist:    { x: 0.69, y: 0.54 },
  left_hip:       { x: 0.43, y: 0.55 }, right_hip:      { x: 0.57, y: 0.55 },
  left_knee:      { x: 0.42, y: 0.75 }, right_knee:     { x: 0.58, y: 0.75 },
  left_ankle:     { x: 0.42, y: 0.94 }, right_ankle:    { x: 0.58, y: 0.94 },
};

// Mapeamento MediaPipe (33 pts) → os nossos 13
const MP_INDEX = {
  nose: 0,
  left_shoulder: 11, right_shoulder: 12,
  left_elbow: 13, right_elbow: 14,
  left_wrist: 15, right_wrist: 16,
  left_hip: 23, right_hip: 24,
  left_knee: 25, right_knee: 26,
  left_ankle: 27, right_ankle: 28,
};

export default function PoseEditor({ imageDataUrl, onConfirm, onBack }) {
  const wrapRef   = useRef(null);
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  const [pose, setPose]       = useState(null);   // { nome: {x,y} }
  const [detecting, setDetecting] = useState(true);
  const [dragIdx, setDragIdx] = useState(null);
  const [imgBox, setImgBox]   = useState({ w: 0, h: 0 });

  // ── Deteção inicial via MediaPipe (imagem estática) ─────────
  useEffect(() => {
    let cancelled = false;
    async function detect() {
      try {
        const vision = await import(
          /* @vite-ignore */
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
        );
        const { PoseLandmarker, FilesetResolver } = vision;
        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          numPoses: 1,
        });

        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          const result = landmarker.detect(img);
          const lm = result?.landmarks?.[0];
          if (lm && lm.length >= 29) {
            const detected = {};
            for (const [name, idx] of Object.entries(MP_INDEX)) {
              const p = lm[idx];
              detected[name] = {
                x: Math.min(1, Math.max(0, p.x)),
                y: Math.min(1, Math.max(0, p.y)),
              };
            }
            setPose(detected);
          } else {
            // Deteção falhou — usa esqueleto neutro editável
            setPose({ ...DEFAULT_POSE });
          }
          setDetecting(false);
          landmarker.close?.();
        };
        img.onerror = () => {
          if (cancelled) return;
          setPose({ ...DEFAULT_POSE });
          setDetecting(false);
        };
        img.src = imageDataUrl;
      } catch (err) {
        console.error("PoseEditor detect:", err);
        if (cancelled) return;
        setPose({ ...DEFAULT_POSE });
        setDetecting(false);
      }
    }
    detect();
    return () => { cancelled = true; };
  }, [imageDataUrl]);

  // ── Desenha o esqueleto ─────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !pose) return;
    const W = img.offsetWidth, H = img.offsetHeight;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    // Ligações
    ctx.strokeStyle = "#1a9fc6";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(26,159,198,0.5)";
    ctx.shadowBlur = 6;
    CONNECTIONS.forEach(([a, b]) => {
      if (pose[a] && pose[b]) {
        ctx.beginPath();
        ctx.moveTo(pose[a].x * W, pose[a].y * H);
        ctx.lineTo(pose[b].x * W, pose[b].y * H);
        ctx.stroke();
      }
    });

    // Pontos (maiores = mais fáceis de arrastar com o dedo)
    POINTS.forEach((name, i) => {
      const p = pose[name];
      if (!p) return;
      const active = dragIdx === i;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, active ? 11 : 8, 0, Math.PI * 2);
      ctx.fillStyle = active ? "#3ad6bf" : "#1a9fc6";
      ctx.shadowBlur = active ? 16 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  }, [pose, dragIdx]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      if (imgRef.current) {
        setImgBox({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
      }
      draw();
    });
    if (imgRef.current) obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [draw]);

  // ── Arrastar pontos ─────────────────────────────────────────
  const pointAt = (clientX, clientY) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    // Encontra o ponto mais próximo dentro de um raio razoável
    let best = null, bestDist = 0.06; // ~6% da largura
    POINTS.forEach((name, i) => {
      const p = pose[name];
      if (!p) return;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  const moveTo = (clientX, clientY) => {
    if (dragIdx == null) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const name = POINTS[dragIdx];
    setPose(prev => ({ ...prev, [name]: { x, y } }));
  };

  const onDown = (cx, cy) => { const i = pointAt(cx, cy); if (i != null) setDragIdx(i); };
  const onUp   = () => setDragIdx(null);

  const S = {
    overlay: {
      position: "fixed", inset: 0, background: t.bg,
      zIndex: 250, display: "flex", flexDirection: "column",
      fontFamily: t.font,
    },
    header: {
      padding: "16px 20px", borderBottom: `1px solid ${t.border}`,
      background: t.card,
    },
    body: {
      flex: 1, overflowY: "auto", padding: 20,
      display: "flex", flexDirection: "column", alignItems: "center",
    },
    stage: {
      position: "relative", borderRadius: t.rMd, overflow: "hidden",
      background: "#000", maxWidth: 420, width: "100%",
      touchAction: "none", userSelect: "none",
    },
    footer: {
      padding: "14px 20px", borderTop: `1px solid ${t.border}`,
      background: t.card, display: "flex", gap: 10,
    },
  };

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <div style={{ fontSize: 17, fontWeight: 800, color: t.navy }}>
          Ajustar Esqueleto
        </div>
        <div style={{ fontSize: 12.5, color: t.textSoft, marginTop: 3 }}>
          Arrasta os pontos para alinhar com o corpo. A análise usa estas posições.
        </div>
      </div>

      <div style={S.body}>
        {detecting ? (
          <div style={{ textAlign: "center", paddingTop: 60, color: t.textSoft }}>
            <div style={{
              width: 44, height: 44, margin: "0 auto 14px",
              border: `4px solid ${t.border}`, borderTopColor: t.teal,
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ fontWeight: 600, color: t.textMid }}>
              A detectar pose...
            </div>
          </div>
        ) : (
          <div
            ref={wrapRef}
            style={S.stage}
            onMouseDown={e => onDown(e.clientX, e.clientY)}
            onMouseMove={e => dragIdx != null && moveTo(e.clientX, e.clientY)}
            onMouseUp={onUp}
            onMouseLeave={onUp}
            onTouchStart={e => { const tt = e.touches[0]; onDown(tt.clientX, tt.clientY); }}
            onTouchMove={e => { const tt = e.touches[0]; moveTo(tt.clientX, tt.clientY); }}
            onTouchEnd={onUp}
          >
            <img ref={imgRef} src={imageDataUrl} alt="pose"
              draggable={false}
              style={{ width: "100%", display: "block" }}
              onLoad={draw} />
            <canvas ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0 }} />
          </div>
        )}

        {!detecting && (
          <div style={{
            marginTop: 14, fontSize: 12.5, color: t.textSoft,
            textAlign: "center", maxWidth: 420,
          }}>
            💡 Toca e arrasta cada ponto. Os 13 pontos: cabeça, ombros,
            cotovelos, pulsos, ancas, joelhos e tornozelos.
          </div>
        )}
      </div>

      <div style={S.footer}>
        <button style={{ ...btn(t, "ghost"), flex: 1 }} onClick={onBack}>
          ← Voltar
        </button>
        <button style={{ ...btn(t, "primary"), flex: 2 }}
          disabled={detecting}
          onClick={() => onConfirm(pose)}>
          Confirmar e Analisar
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
