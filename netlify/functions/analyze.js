exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: "API key não configurada." }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Body inválido." }) };
  }

  const { imageBase64, mediaType, sex, height, weight, age } = body;
  if (!imageBase64 || !height || !weight) {
    return { statusCode: 400, body: JSON.stringify({ error: "Parâmetros em falta." }) };
  }

  const prompt = `Analyze this person's body composition and posture. They are ${height}cm tall, ${weight}kg, age ${age}, sex ${sex === "M" ? "male" : "female"}.

Using their height (${height}cm) as scale reference, estimate body circumference measurements in cm. Also analyze posture and estimate body fat % visually.

Return ONLY valid JSON (no markdown, no extra text):
{
  "bodyVisible": true,
  "viewAngle": "frontal",
  "postureScore": 72,
  "bodyFatEstimate": 18.5,
  "measurements": {
    "neck": 38,
    "chest": 96,
    "waist": 82,
    "abdomen": 88,
    "hip": 96,
    "thigh_left": 56,
    "arm_left": 32,
    "calf_left": 37
  },
  "landmarks": {
    "nose": {"x": 0.50, "y": 0.07},
    "left_shoulder": {"x": 0.37, "y": 0.26},
    "right_shoulder": {"x": 0.63, "y": 0.26},
    "left_elbow": {"x": 0.30, "y": 0.41},
    "right_elbow": {"x": 0.70, "y": 0.41},
    "left_wrist": {"x": 0.27, "y": 0.54},
    "right_wrist": {"x": 0.73, "y": 0.54},
    "left_hip": {"x": 0.42, "y": 0.54},
    "right_hip": {"x": 0.58, "y": 0.54},
    "left_knee": {"x": 0.41, "y": 0.73},
    "right_knee": {"x": 0.59, "y": 0.73},
    "left_ankle": {"x": 0.40, "y": 0.92},
    "right_ankle": {"x": 0.60, "y": 0.92}
  },
  "postureIssues": [
    {"name": "Problema de postura", "severity": "medium", "description": "Descrição detalhada"}
  ],
  "postureStrengths": ["Ponto positivo da postura"],
  "bodyCompositionNote": "Nota visual sobre composição corporal em português europeu",
  "summary": "Resumo geral em português europeu"
}

Rules:
- x,y are 0–1 proportional coords (0,0 = top-left of image)
- Only include visible landmarks
- measurements are circumferences in cm
- bodyFatEstimate as visual percentage estimate
- All text in European Portuguese
- viewAngle: frontal / lateral_left / lateral_right / posterior
- severity: low / medium / high
- postureScore: 0–100`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            ANTHROPIC_KEY,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 2000,
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

    const text = data.content
      ?.filter(b => b.type === "text")
      .map(b => b.text)
      .join("") || "";

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error("Analyze function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro interno na análise." }),
    };
  }
};
