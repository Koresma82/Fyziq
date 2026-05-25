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

  const { imageBase64, mediaType, sex, height, weight, age } = body;
  if (!imageBase64 || !height || !weight) {
    return { statusCode: 400, body: JSON.stringify({ error: "Parâmetros em falta." }) };
  }

  const sexLabel = sex === "M" ? "masculino" : "feminino";

  const prompt = `És um especialista em avaliação postural e antropometria. Analisa esta fotografia de forma RIGOROSA, OBJECTIVA e CONSISTENTE.

DADOS DO PACIENTE:
- Sexo: ${sexLabel}
- Altura: ${height} cm
- Peso: ${weight} kg
- Idade: ${age} anos

METODOLOGIA DE ANÁLISE (segue exactamente esta ordem):

1. ESCALA: Usa a altura (${height} cm) como referência. Mede a altura total do corpo em pixels e calcula a proporção cm/pixel. Aplica essa proporção a TODAS as medições de perímetro.

2. PERÍMETROS: Estima cada circunferência observando a largura do corpo nesse ponto e multiplicando por π (assumindo secção aproximadamente elíptica). Sê consistente — para o mesmo corpo, os valores não devem variar.

3. POSTURA — avalia SISTEMATICAMENTE estes 8 pontos, cada um numa escala 0-100:
   a) Alinhamento da cabeça (projecção anterior / inclinação lateral)
   b) Nível dos ombros (simetria de altura esquerda/direita)
   c) Alinhamento da coluna (curvatura, desvios laterais)
   d) Posição da bacia (báscula anterior/posterior, rotação)
   e) Alinhamento dos joelhos (valgo / varo)
   f) Distribuição de peso (esquerda vs direita)
   g) Posição dos pés (pronação / supinação aparente)
   h) Simetria global (assimetrias entre os dois lados)

4. POSTURE SCORE: média ponderada dos 8 pontos acima.

REGRAS DE OUTPUT:
- Responde APENAS com JSON válido, sem markdown, sem texto extra.
- Todo o texto em português europeu.
- Sê específico e clínico nas descrições — menciona a região anatómica e a implicação funcional.
- severity: "low" (desvio ligeiro), "medium" (desvio moderado, merece atenção), "high" (desvio acentuado).

FORMATO JSON EXACTO:
{
  "bodyVisible": true,
  "viewAngle": "frontal",
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
  "landmarks": {
    "nose": {"x":0.50,"y":0.07},
    "left_shoulder": {"x":0.37,"y":0.26}, "right_shoulder": {"x":0.63,"y":0.26},
    "left_elbow": {"x":0.30,"y":0.41}, "right_elbow": {"x":0.70,"y":0.41},
    "left_wrist": {"x":0.27,"y":0.54}, "right_wrist": {"x":0.73,"y":0.54},
    "left_hip": {"x":0.42,"y":0.54}, "right_hip": {"x":0.58,"y":0.54},
    "left_knee": {"x":0.41,"y":0.73}, "right_knee": {"x":0.59,"y":0.73},
    "left_ankle": {"x":0.40,"y":0.92}, "right_ankle": {"x":0.60,"y":0.92}
  },
  "postureIssues": [
    {"name":"Nome curto do problema","severity":"medium","region":"cervical","description":"Descrição clínica detalhada com região e implicação funcional."}
  ],
  "postureStrengths": ["Aspecto postural positivo e específico"],
  "recommendations": ["Recomendação prática e accionável"],
  "bodyCompositionNote": "Nota sobre composição corporal.",
  "summary": "Resumo executivo da avaliação em 1-2 frases."
}

Notas: x,y são coordenadas 0-1 (0,0 = canto superior esquerdo). Inclui apenas landmarks visíveis. viewAngle: frontal/lateral_left/lateral_right/posterior.`;

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
        max_tokens:  2500,
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        }],
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
