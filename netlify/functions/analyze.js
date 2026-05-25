exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key não configurada." }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Body inválido." }) }; }

  // images: [{ angle: "front"|"back"|"left"|"right", base64, mediaType }]
  const { images, sex, height, weight, age, userPose } = body;
  if (!Array.isArray(images) || images.length === 0 || !height || !weight) {
    return { statusCode: 400, body: JSON.stringify({ error: "Parâmetros em falta." }) };
  }

  const sexLabel = sex === "M" ? "masculino" : "feminino";
  const ANGLE_PT = {
    front: "vista frontal", back: "vista posterior",
    left: "perfil esquerdo", right: "perfil direito",
  };
  const anglesProvided = images.map(im => ANGLE_PT[im.angle] || im.angle).join(", ");
  const hasProfile = images.some(im => im.angle === "left" || im.angle === "right");

  const prompt = `És um especialista em avaliação postural e antropometria. Analisa estas fotografias de forma RIGOROSA, OBJECTIVA e CONSISTENTE.

DADOS DO PACIENTE:
- Sexo: ${sexLabel}
- Altura: ${height} cm
- Peso: ${weight} kg
- Idade: ${age} anos

IMAGENS FORNECIDAS: ${anglesProvided}.
Cada imagem é-te dada com uma etiqueta a indicar o ângulo. Usa TODAS para a análise.

METODOLOGIA:

1. ESCALA: Usa a altura (${height} cm) como referência em cada vista. Mede a altura do corpo em pixels → proporção cm/pixel.

2. PERÍMETROS (circunferências): ${hasProfile
  ? `TENS vista frontal E de perfil. Para cada perímetro, mede a LARGURA na vista frontal e a PROFUNDIDADE na vista de perfil. Calcula a circunferência aproximando a uma elipse: perímetro ≈ π × [3(a+b) − √((3a+b)(a+3b))]/2, onde a e b são os semi-eixos (metade da largura e metade da profundidade). Isto dá uma estimativa MUITO mais precisa do que só com a vista frontal.`
  : `Tens apenas vista(s) frontal/posterior. Estima a profundidade do corpo a partir do biótipo. Indica menor confiança.`}

3. POSTURA — avalia SISTEMATICAMENTE, usando o ângulo certo para cada item:
   - Vista frontal/posterior: nível dos ombros, alinhamento da bacia, joelhos (valgo/varo), simetria, desvios laterais da coluna (escoliose)
   - Vista de perfil: projecção anterior da cabeça, cifose, lordose, báscula pélvica, alinhamento sagital
   Avalia 8 pontos, cada um 0-100:
   a) Cabeça  b) Ombros  c) Coluna  d) Bacia
   e) Joelhos  f) Distribuição de peso  g) Pés  h) Simetria global

4. POSTURE SCORE: média ponderada dos 8 pontos.

REGRAS DE OUTPUT:
- Responde APENAS com JSON válido, sem markdown nem texto extra.
- Português europeu, linguagem clínica e específica.
- severity: "low" | "medium" | "high".
- Em cada problema/recomendação, indica a que vista se refere quando relevante.

FORMATO JSON EXACTO:
{
  "bodyVisible": true,
  "anglesAnalyzed": ["front","left"],
  "measurementConfidence": "high",
  "postureScore": 72,
  "bodyFatEstimate": 18.5,
  "measurements": {
    "neck": 38, "chest": 96, "waist": 82, "abdomen": 88,
    "hip": 96, "thigh_left": 56, "arm_left": 32, "calf_left": 37
  },
  "postureBreakdown": {
    "head":      { "score": 80, "label": "Alinhamento da cabeça" },
    "shoulders": { "score": 75, "label": "Nível dos ombros" },
    "spine":     { "score": 70, "label": "Alinhamento da coluna" },
    "pelvis":    { "score": 78, "label": "Posição da bacia" },
    "knees":     { "score": 85, "label": "Alinhamento dos joelhos" },
    "weight":    { "score": 68, "label": "Distribuição de peso" },
    "feet":      { "score": 82, "label": "Posição dos pés" },
    "symmetry":  { "score": 74, "label": "Simetria global" }
  },
  "postureIssues": [
    {"name":"Nome curto","severity":"medium","region":"cervical","view":"perfil","description":"Descrição clínica detalhada."}
  ],
  "postureStrengths": ["Aspecto postural positivo e específico"],
  "recommendations": ["Recomendação prática e accionável"],
  "bodyCompositionNote": "Nota sobre composição corporal.",
  "summary": "Resumo executivo em 1-2 frases."
}

measurementConfidence: "high" se tens frontal+perfil, "medium" caso contrário.`;

  // Monta o content: cada imagem precedida de etiqueta de texto
  const content = [];
  for (const im of images) {
    content.push({ type: "text", text: `[Imagem — ${ANGLE_PT[im.angle] || im.angle}]` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: im.mediaType || "image/jpeg", data: im.base64 },
    });
  }
  content.push({ type: "text", text: prompt });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:       "claude-sonnet-4-20250514",
        max_tokens:  3000,
        temperature: 0,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "Erro Anthropic API." }),
      };
    }

    const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error("Analyze function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Erro interno na análise." }) };
  }
};
