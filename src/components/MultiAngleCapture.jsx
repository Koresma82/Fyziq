import { useRef, useState } from "react";
import { theme, btn } from "../config/theme";
import { processImageFile, formatBytes } from "../utils/image";
import CameraCapture from "./CameraCapture";

const t = theme;

// Os 4 ângulos. front é obrigatório; left/right dão profundidade.
export const ANGLES = [
  { key: "front", label: "Frente",  icon: "🧍", required: true,
    hint: "Obrigatória · de frente para a câmara" },
  { key: "left",  label: "Perfil Esq.", icon: "🚶", required: false,
    hint: "Recomendada · melhora a precisão dos perímetros" },
  { key: "right", label: "Perfil Dto.", icon: "🚶", required: false,
    hint: "Opcional · perfil direito" },
  { key: "back",  label: "Costas",  icon: "🧍", required: false,
    hint: "Opcional · avalia coluna e simetria" },
];

export default function MultiAngleCapture({ onConfirm, onCancel }) {
  // images: { front: {dataUrl, mediaType, info}, left: {...}, ... }
  const [images, setImages]   = useState({});
  const [activeAngle, setActiveAngle] = useState(null); // ângulo a capturar
  const [cameraFor, setCameraFor] = useState(null);     // ângulo via câmara
  const [processing, setProcessing] = useState(false);
  const [error, setError]     = useState("");
  const fileRef = useRef(null);

  const hasFront = !!images.front;
  const count = Object.keys(images).length;

  // Recebe ficheiro para o ângulo activo
  const handleFile = async (file) => {
    if (!file || !activeAngle) return;
    if (!file.type?.startsWith("image/")) {
      setError("O ficheiro não é uma imagem.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const { dataUrl, mediaType, info } = await processImageFile(file);
      setImages(prev => ({ ...prev, [activeAngle]: { dataUrl, mediaType, info } }));
    } catch (err) {
      setError(err.message || "Erro ao processar a imagem.");
    } finally {
      setProcessing(false);
      setActiveAngle(null);
    }
  };

  const handleCameraCapture = (dataUrl) => {
    const angle = cameraFor;
    setCameraFor(null);
    if (!angle) return;
    setImages(prev => ({
      ...prev,
      [angle]: { dataUrl, mediaType: "image/jpeg", info: { fromCamera: true } },
    }));
  };

  const removeAngle = (key) => {
    setImages(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const confirm = () => {
    if (!hasFront) {
      setError("A foto de frente é obrigatória.");
      return;
    }
    onConfirm(images);
  };

  // Câmara ao vivo para um ângulo
  if (cameraFor) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onCancel={() => setCameraFor(null)}
      />
    );
  }

  const S = {
    overlay: {
      position: "fixed", inset: 0, background: "rgba(28,39,56,0.55)",
      backdropFilter: "blur(4px)", zIndex: 200,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      fontFamily: t.font,
    },
    sheet: {
      background: t.bg, borderRadius: `${t.rXl}px ${t.rXl}px 0 0`,
      width: "100%", maxWidth: 460, maxHeight: "94vh", overflowY: "auto",
      padding: 22,
    },
    card: (filled) => ({
      border: `1.5px solid ${filled ? t.teal : t.border}`,
      borderRadius: t.rMd, padding: 12, background: t.card,
      display: "flex", alignItems: "center", gap: 12,
    }),
  };

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 19, fontWeight: 800, color: t.navy, marginBottom: 4 }}>
          Fotos para Análise
        </div>
        <div style={{ fontSize: 12.5, color: t.textSoft, marginBottom: 18, lineHeight: 1.5 }}>
          A foto de <strong>frente</strong> é obrigatória. Junta o <strong>perfil</strong> para
          medições mais precisas, e as restantes para uma avaliação postural completa.
        </div>

        {/* Lista de ângulos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {ANGLES.map(a => {
            const img = images[a.key];
            return (
              <div key={a.key} style={S.card(!!img)}>
                {/* Miniatura ou ícone */}
                {img ? (
                  <img src={img.dataUrl} alt={a.label}
                    style={{ width: 54, height: 54, borderRadius: t.rSm, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 54, height: 54, borderRadius: t.rSm, flexShrink: 0,
                    background: t.cardAlt, display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 24,
                  }}>{a.icon}</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
                    {a.label}
                    {a.required && (
                      <span style={{ color: t.red, marginLeft: 4, fontSize: 12 }}>*</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: img ? t.teal : t.textSoft, marginTop: 1 }}>
                    {img ? "✓ Adicionada" : a.hint}
                  </div>
                </div>

                {/* Ações */}
                {img ? (
                  <button onClick={() => removeAngle(a.key)} style={{
                    background: "rgba(239,68,68,0.1)", border: "none",
                    color: t.red, borderRadius: t.rSm, padding: "7px 10px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: t.font,
                  }}>Remover</button>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setCameraFor(a.key)} style={{
                      background: t.gradientSoft, border: "none", color: t.teal,
                      borderRadius: t.rSm, padding: "8px 9px", fontSize: 15,
                      cursor: "pointer",
                    }} title="Câmara">📷</button>
                    <button onClick={() => { setActiveAngle(a.key); fileRef.current?.click(); }}
                      style={{
                        background: t.cardAlt, border: `1px solid ${t.border}`,
                        color: t.textMid, borderRadius: t.rSm, padding: "8px 9px",
                        fontSize: 15, cursor: "pointer",
                      }} title="Carregar ficheiro">📁</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { handleFile(e.target.files[0]); e.target.value = ""; }} />

        {processing && (
          <div style={{ fontSize: 13, color: t.textMid, marginBottom: 12, textAlign: "center" }}>
            A processar imagem...
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: t.rMd, padding: "10px 13px", marginBottom: 12,
            fontSize: 12.5, color: t.red, display: "flex", gap: 7,
          }}>
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* Resumo */}
        <div style={{
          fontSize: 12, color: t.textMid, textAlign: "center", marginBottom: 12,
        }}>
          {count} foto{count !== 1 ? "s" : ""} ·{" "}
          {images.front && (images.left || images.right)
            ? "✓ precisão alta nos perímetros"
            : images.front
            ? "junta um perfil para mais precisão"
            : "adiciona pelo menos a foto de frente"}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...btn(t, "ghost"), flex: 1 }} onClick={onCancel}>
            Cancelar
          </button>
          <button style={{ ...btn(t, "primary"), flex: 2, opacity: hasFront ? 1 : 0.5 }}
            onClick={confirm} disabled={!hasFront || processing}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
