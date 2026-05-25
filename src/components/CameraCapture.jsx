import { useRef, useEffect, useState, useCallback } from "react";
import { theme, btn } from "../config/theme";

const t = theme;

// MediaPipe Pose — 33 landmarks. Ligações para desenhar o esqueleto.
const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],          // braços + ombros
  [11,23],[12,24],[23,24],                          // tronco
  [23,25],[25,27],[24,26],[26,28],                  // pernas
  [27,29],[27,31],[28,30],[28,32],                  // pés
  [0,11],[0,12],                                    // cabeça → ombros
];

// Índices essenciais para verificar enquadramento de corpo inteiro
const KEY_POINTS = { nose: 0, lShoulder: 11, rShoulder: 12, lAnkle: 27, rAnkle: 28 };

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef   = useRef(null);
  const rafRef    = useRef(null);

  const [status, setStatus]   = useState("loading"); // loading | ready | error | denied
  const [errorMsg, setErrorMsg] = useState("");
  const [framing, setFraming] = useState({ ok: false, msg: "Posiciona-te de corpo inteiro" });
  const latestLandmarks = useRef(null);

  // ── Avalia se a pessoa está bem enquadrada ──────────────────
  const evaluateFraming = useCallback((lm) => {
    if (!lm || lm.length < 33) {
      return { ok: false, msg: "Nenhuma pessoa detectada" };
    }
    const visible = (i) => lm[i] && (lm[i].visibility ?? 1) > 0.5;
    const head  = visible(KEY_POINTS.nose);
    const feet  = visible(KEY_POINTS.lAnkle) || visible(KEY_POINTS.rAnkle);
    const shoulders = visible(KEY_POINTS.lShoulder) && visible(KEY_POINTS.rShoulder);

    if (!head)      return { ok: false, msg: "Afasta-te — a cabeça não aparece" };
    if (!feet)      return { ok: false, msg: "Afasta-te — os pés não aparecem" };
    if (!shoulders) return { ok: false, msg: "Vira-te de frente para a câmara" };

    // Corpo deve ocupar a maior parte vertical do enquadramento
    const top = lm[KEY_POINTS.nose].y;
    const bottom = Math.max(
      lm[KEY_POINTS.lAnkle]?.y ?? 0, lm[KEY_POINTS.rAnkle]?.y ?? 0
    );
    const coverage = bottom - top;
    if (coverage < 0.55) return { ok: false, msg: "Aproxima-te um pouco" };
    if (coverage > 0.97) return { ok: false, msg: "Afasta-te um pouco" };

    // Centragem horizontal
    const cx = (lm[KEY_POINTS.lShoulder].x + lm[KEY_POINTS.rShoulder].x) / 2;
    if (cx < 0.30) return { ok: false, msg: "Move-te para a direita" };
    if (cx > 0.70) return { ok: false, msg: "Move-te para a esquerda" };

    return { ok: true, msg: "Enquadramento perfeito! Podes capturar" };
  }, []);

  // ── Desenha o esqueleto sobre o vídeo ───────────────────────
  const drawSkeleton = useCallback((lm) => {
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    canvas.width  = video.videoWidth  || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!lm || lm.length < 33) return;

    const W = canvas.width, H = canvas.height;
    const ok = framing.ok;
    const color = ok ? "#3ad6bf" : "#f59e0b";

    // Ligações
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    POSE_CONNECTIONS.forEach(([a, b]) => {
      const pa = lm[a], pb = lm[b];
      if (pa && pb && (pa.visibility ?? 1) > 0.4 && (pb.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(pa.x * W, pa.y * H);
        ctx.lineTo(pb.x * W, pb.y * H);
        ctx.stroke();
      }
    });

    // Pontos
    ctx.shadowBlur = 10;
    lm.forEach((p) => {
      if ((p.visibility ?? 1) > 0.4) {
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 10;
      }
    });
  }, [framing.ok]);

  // ── Inicializa MediaPipe + câmara ───────────────────────────
  useEffect(() => {
    let cancelled = false;

    // Deteta browsers embutidos (WhatsApp, Instagram, Facebook...)
    // que NÃO conseguem aceder à câmara.
    function detectInAppBrowser() {
      const ua = navigator.userAgent || "";
      if (/FBAN|FBAV|FB_IAB|Instagram/i.test(ua)) return "Instagram/Facebook";
      if (/WhatsApp/i.test(ua)) return "WhatsApp";
      if (/Line\//i.test(ua)) return "LINE";
      if (/MicroMessenger/i.test(ua)) return "WeChat";
      return null;
    }

    async function init() {
      // Bloqueia logo se for in-app browser
      const inApp = detectInAppBrowser();
      if (inApp) {
        setStatus("inapp");
        setErrorMsg(inApp);
        return;
      }

      try {
        // Carrega MediaPipe Tasks Vision via CDN dinâmico
        const vision = await import(
          /* @vite-ignore */
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14"
        );
        const { PoseLandmarker, FilesetResolver } = vision;

        const resolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const poseLandmarker = await PoseLandmarker.createFromOptions(resolver, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) return;
        poseRef.current = poseLandmarker;

        // Verifica suporte antes de tentar
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("no-support"), { name: "NotSupportedError" });
        }

        // Abre a câmara com fallback progressivo:
        // alguns Android rejeitam constraints específicos.
        const attempts = [
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          { video: { facingMode: "environment" }, audio: false },
          { video: true, audio: false },   // último recurso: qualquer câmara
        ];
        let stream = null;
        let lastErr = null;
        for (const constraints of attempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (e) {
            lastErr = e;
            // Erros de permissão não adianta repetir
            if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") break;
          }
        }
        if (!stream) throw lastErr || new Error("camera-failed");
        if (cancelled) { stream.getTracks().forEach(tr => tr.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true"); // essencial iOS/Android
        await video.play();

        setStatus("ready");
        renderLoop();
      } catch (err) {
        console.error("Camera/MediaPipe init:", err);
        if (cancelled) return;
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setStatus("denied");
        } else {
          setStatus("error");
          setErrorMsg(
            err.name === "NotFoundError"
              ? "Nenhuma câmara encontrada neste dispositivo."
              : err.name === "NotSupportedError"
              ? "Este navegador não suporta câmara ao vivo. Usa o upload de ficheiro ou abre noutro navegador (Chrome)."
              : err.name === "NotReadableError"
              ? "A câmara está a ser usada por outra aplicação. Fecha-a e tenta de novo."
              : "Não foi possível iniciar a câmara ao vivo. Usa o upload de ficheiro."
          );
        }
      }
    }

    function renderLoop() {
      const video = videoRef.current;
      const pose  = poseRef.current;
      if (!video || !pose) return;

      if (video.readyState >= 2) {
        const result = pose.detectForVideo(video, performance.now());
        const lm = result?.landmarks?.[0] || null;
        latestLandmarks.current = lm;
        setFraming(evaluateFraming(lm));
        drawSkeleton(lm);
      }
      rafRef.current = requestAnimationFrame(renderLoop);
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(tr => tr.stop());
      if (poseRef.current?.close) poseRef.current.close();
    };
  }, [evaluateFraming, drawSkeleton]);

  // ── Captura o frame actual ──────────────────────────────────
  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
  };

  // ── UI ──────────────────────────────────────────────────────
  const S = {
    overlay: {
      position: "fixed", inset: 0, background: "#000",
      zIndex: 300, display: "flex", flexDirection: "column",
      fontFamily: t.font,
    },
    videoWrap: {
      flex: 1, position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    video:  { width: "100%", height: "100%", objectFit: "cover" },
    canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
    topBar: {
      position: "absolute", top: 0, left: 0, right: 0,
      padding: "16px 20px", display: "flex", justifyContent: "space-between",
      alignItems: "center",
      background: "linear-gradient(180deg, rgba(0,0,0,0.6), transparent)",
      zIndex: 2,
    },
    hint: (ok) => ({
      position: "absolute", left: "50%", transform: "translateX(-50%)",
      bottom: 130, whiteSpace: "nowrap",
      background: ok ? "rgba(58,214,191,0.95)" : "rgba(245,158,11,0.95)",
      color: ok ? "#06302a" : "#3a2800",
      fontWeight: 700, fontSize: 14,
      padding: "10px 18px", borderRadius: 22,
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      zIndex: 2,
    }),
    bottomBar: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: "20px 24px 32px", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(0deg, rgba(0,0,0,0.6), transparent)",
      zIndex: 2,
    },
    shutter: (ok) => ({
      width: 74, height: 74, borderRadius: "50%",
      border: `5px solid ${ok ? "#3ad6bf" : "rgba(255,255,255,0.5)"}`,
      background: ok ? "#3ad6bf" : "rgba(255,255,255,0.25)",
      cursor: "pointer",
      boxShadow: ok ? "0 0 24px rgba(58,214,191,0.7)" : "none",
      transition: "all 0.2s",
    }),
    centerMsg: {
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: "#fff", textAlign: "center", padding: 32, gap: 16,
    },
  };

  return (
    <div style={S.overlay}>
      {/* Top bar */}
      <div style={S.topBar}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
          📷 Câmara ao vivo
        </span>
        <button onClick={onCancel} style={{
          background: "rgba(255,255,255,0.18)", border: "none",
          color: "#fff", width: 34, height: 34, borderRadius: "50%",
          fontSize: 16, cursor: "pointer", fontWeight: 700,
        }}>✕</button>
      </div>

      {/* Loading */}
      {status === "loading" && (
        <div style={S.centerMsg}>
          <div style={{
            width: 48, height: 48,
            border: "4px solid rgba(255,255,255,0.2)",
            borderTopColor: "#3ad6bf", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <div style={{ fontWeight: 600 }}>A iniciar câmara e detecção de pose...</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
            Pode demorar alguns segundos na primeira vez
          </div>
        </div>
      )}

      {/* Permission denied */}
      {status === "denied" && (
        <div style={S.centerMsg}>
          <div style={{ fontSize: 44 }}>🚫</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Acesso à câmara negado</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
            Para usar a câmara ao vivo, autoriza o acesso nas definições do
            navegador e tenta novamente.
          </div>
          <button style={{ ...btn(t, "primary"), marginTop: 8 }} onClick={onCancel}>
            Usar upload de ficheiro
          </button>
        </div>
      )}

      {/* In-app browser (WhatsApp, Instagram...) */}
      {status === "inapp" && (
        <div style={S.centerMsg}>
          <div style={{ fontSize: 44 }}>📲</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            Abre no navegador do telemóvel
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
            Estás a usar a Fyziq dentro do {errorMsg}, que não permite
            acesso à câmara.
            <br /><br />
            Toca nos <strong>três pontos (⋯)</strong> no canto e escolhe
            <strong> "Abrir no Chrome"</strong> ou <strong>"Abrir no Safari"</strong>.
            A câmara ao vivo funciona aí.
          </div>
          <button style={{ ...btn(t, "primary"), marginTop: 8 }} onClick={onCancel}>
            Usar upload de ficheiro
          </button>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={S.centerMsg}>
          <div style={{ fontSize: 44 }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Câmara indisponível</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{errorMsg}</div>
          <button style={{ ...btn(t, "primary"), marginTop: 8 }} onClick={onCancel}>
            Usar upload de ficheiro
          </button>
        </div>
      )}

      {/* Live view */}
      <div style={{ ...S.videoWrap, display: status === "ready" ? "flex" : "none" }}>
        <video ref={videoRef} style={S.video} playsInline muted />
        <canvas ref={canvasRef} style={S.canvas} />

        <div style={S.hint(framing.ok)}>
          {framing.ok ? "✓ " : ""}{framing.msg}
        </div>

        <div style={S.bottomBar}>
          <button
            style={S.shutter(framing.ok)}
            onClick={capture}
            title={framing.ok ? "Capturar" : "Captura mesmo assim"}
          />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
