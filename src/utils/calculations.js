// ── IMC ────────────────────────────────────────────────────────────────────────
export function calcIMC(weight, height) {
  const h = height / 100;
  return weight / (h * h);
}

export const IMC_RANGES = [
  { max: 18.5, label: "Abaixo do peso",  color: "#60a5fa" },
  { max: 25,   label: "Peso normal",     color: "#22c55e" },
  { max: 30,   label: "Excesso de peso", color: "#f59e0b" },
  { max: 35,   label: "Obesidade I",     color: "#f97316" },
  { max: 40,   label: "Obesidade II",    color: "#ef4444" },
  { max: 999,  label: "Obesidade III",   color: "#7f1d1d" },
];

export function imcCategory(imc) {
  return IMC_RANGES.find(r => imc < r.max) || IMC_RANGES.at(-1);
}

// ── Body Fat – US Navy ─────────────────────────────────────────────────────────
// waist, neck, hip (women) in cm; height in cm
export function calcBodyFatNavy(sex, height, waist, neck, hip = 0) {
  let val;
  if (sex === "M") {
    val = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    return Math.max(2, Math.min(60, parseFloat(val.toFixed(1))));
  } else {
    val = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    return Math.max(8, Math.min(70, parseFloat(val.toFixed(1))));
  }
}

export const BF_RANGES = {
  M: [
    { max: 6,   label: "Essencial", color: "#60a5fa" },
    { max: 14,  label: "Atleta",    color: "#22c55e" },
    { max: 18,  label: "Fitness",   color: "#84cc16" },
    { max: 25,  label: "Aceitável", color: "#f59e0b" },
    { max: 999, label: "Obesidade", color: "#ef4444" },
  ],
  F: [
    { max: 14,  label: "Essencial", color: "#60a5fa" },
    { max: 21,  label: "Atleta",    color: "#22c55e" },
    { max: 25,  label: "Fitness",   color: "#84cc16" },
    { max: 32,  label: "Aceitável", color: "#f59e0b" },
    { max: 999, label: "Obesidade", color: "#ef4444" },
  ],
};

export function bfCategory(bf, sex) {
  return (BF_RANGES[sex] || BF_RANGES.M).find(r => bf < r.max) || BF_RANGES.M.at(-1);
}

// ── BMR – Mifflin-St Jeor ──────────────────────────────────────────────────────
export function calcBMR(sex, weight, height, age) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === "M" ? base + 5 : base - 161;
}

// ── TDEE activity multipliers ──────────────────────────────────────────────────
export const ACTIVITY_LEVELS = [
  { label: "Sedentário",       multiplier: 1.2   },
  { label: "Leve (1-3x/sem)", multiplier: 1.375 },
  { label: "Moderado (3-5x)", multiplier: 1.55  },
  { label: "Intenso (6-7x)",  multiplier: 1.725 },
  { label: "Muito intenso",   multiplier: 1.9   },
];

// ── Build metrics object from inputs + AI measurements ─────────────────────────
export function buildMetrics({ sex, weight, height, age }, measurements, bodyFatEstimate) {
  const imc     = calcIMC(weight, height);
  const imcCat  = imcCategory(imc);
  const bmr     = calcBMR(sex, weight, height, age);

  let bf = null, bfCat = null, fatMass = null, leanMass = null;

  const m = measurements || {};
  if (m.waist && m.neck && (sex === "M" || m.hip)) {
    bf = calcBodyFatNavy(sex, height, m.waist, m.neck, m.hip || 0);
  } else if (bodyFatEstimate) {
    bf = parseFloat(bodyFatEstimate.toFixed(1));
  }

  if (bf !== null) {
    bfCat    = bfCategory(bf, sex);
    fatMass  = parseFloat((weight * bf / 100).toFixed(1));
    leanMass = parseFloat((weight - fatMass).toFixed(1));
  }

  return { imc: parseFloat(imc.toFixed(1)), imcCat, bmr: Math.round(bmr), bf, bfCat, fatMass, leanMass };
}
