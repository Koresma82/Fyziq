// ─────────────────────────────────────────────────────────────
//  Fyziq — Utilitários de imagem
//  Redimensiona/comprime fotos grandes antes de enviar à IA.
// ─────────────────────────────────────────────────────────────

const MAX_DIMENSION = 1280; // Suficiente para análise; mais pequeno = mais rápido
const TARGET_BYTES  = 2.5 * 1024 * 1024; // ~2.5MB por imagem, evita timeouts

/** Tamanho aproximado em bytes de uma dataURL base64 */
export function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.floor(base64.length * 0.75);
}

/** Formata bytes para leitura humana (ex: "6.2 MB") */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Carrega um File e devolve uma dataURL JPEG redimensionada/comprimida
 * para caber no limite da API. Devolve { dataUrl, mediaType, info }.
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      return reject(new Error("O ficheiro não é uma imagem válida."));
    }

    const originalBytes = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("A imagem está corrompida ou num formato não suportado."));
      img.onload = () => {
        let { width, height } = img;

        // Redimensiona se exceder a dimensão máxima
        const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
        width  = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Comprime progressivamente até caber no limite
        let quality = 0.92;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrlBytes(dataUrl) > TARGET_BYTES && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        const finalBytes = dataUrlBytes(dataUrl);

        if (finalBytes > TARGET_BYTES) {
          return reject(new Error(
            `A imagem é demasiado grande (${formatBytes(originalBytes)}) e não foi possível ` +
            `comprimi-la o suficiente. Tenta uma foto com menos resolução.`
          ));
        }

        resolve({
          dataUrl,
          mediaType: "image/jpeg",
          info: {
            originalBytes,
            finalBytes,
            resized: scale < 1,
            originalDimensions: `${img.width}×${img.height}`,
            finalDimensions: `${width}×${height}`,
          },
        });
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}
