// ─────────────────────────────────────────────────────────────
//  Fyziq — Planos e limites
//
//  Os limites têm DEFAULTS no código, mas podem ser sobrepostos
//  pelo super admin (documento Firestore config/plans).
//  Usa getPlans(overrides) para obter os limites efectivos.
// ─────────────────────────────────────────────────────────────

// Custo estimado por análise IA — também configurável pelo super admin.
export const DEFAULT_AI_COST = 0.005; // USD

// Limites por defeito. -1 = ilimitado.
export const DEFAULT_PLANS = {
  trial: {
    label: "Trial",
    color: "#f59e0b",
    maxPatients: 5,
    maxAnalysesPerMonth: 10,
    trialDays: 7,
  },
  standard: {
    label: "Standard",
    color: "#5a6678",
    maxPatients: 20,
    maxAnalysesPerMonth: 30,
  },
  premium: {
    label: "Premium",
    color: "#1a9fc6",
    maxPatients: -1,
    maxAnalysesPerMonth: -1,
  },
};

/**
 * Funde os defaults com os overrides do super admin.
 * overrides: { trial:{maxPatients,...}, standard:{...}, premium:{...}, aiCost }
 */
export function getPlans(overrides) {
  if (!overrides) return DEFAULT_PLANS;
  const merged = {};
  for (const key of Object.keys(DEFAULT_PLANS)) {
    merged[key] = { ...DEFAULT_PLANS[key], ...(overrides[key] || {}) };
  }
  return merged;
}

/** Custo de IA efectivo (override do super admin ou default) */
export function getAiCost(overrides) {
  const v = overrides?.aiCost;
  return (typeof v === "number" && v >= 0) ? v : DEFAULT_AI_COST;
}

/** Config de um plano específico, com overrides aplicados */
export function getPlan(planId, overrides) {
  const plans = getPlans(overrides);
  return plans[planId] || plans.trial;
}

/** True se o trial de uma conta já expirou */
export function isTrialExpired(professional) {
  if (professional?.plan !== "trial") return false;
  const end = professional?.trialEndsAt;
  if (!end) return false;
  const endDate = end?.toDate ? end.toDate() : new Date(end);
  return Date.now() > endDate.getTime();
}

/** Plano efectivo: trial expirado comporta-se como standard */
export function effectivePlan(professional) {
  if (!professional) return "trial";
  if (professional.plan === "trial" && isTrialExpired(professional)) {
    return "standard";
  }
  return professional.plan || "trial";
}

/** Dias restantes de trial (null se não aplicável) */
export function trialDaysLeft(professional) {
  if (professional?.plan !== "trial" || !professional?.trialEndsAt) return null;
  const end = professional.trialEndsAt?.toDate
    ? professional.trialEndsAt.toDate()
    : new Date(professional.trialEndsAt);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Pode criar mais um paciente?
 * overrides = limites do super admin (opcional).
 */
export function canCreatePatient(professional, currentPatientCount, overrides) {
  const plan = getPlan(effectivePlan(professional), overrides);
  if (plan.maxPatients === -1) return { allowed: true };
  if (currentPatientCount >= plan.maxPatients) {
    return {
      allowed: false,
      limit: plan.maxPatients,
      reason: `O plano ${plan.label} permite até ${plan.maxPatients} pacientes. Faz upgrade para criar mais.`,
    };
  }
  return { allowed: true, limit: plan.maxPatients };
}

/** Pode fazer mais uma análise IA este mês? */
export function canRunAnalysis(professional, usageThisMonth, overrides) {
  const plan = getPlan(effectivePlan(professional), overrides);
  if (plan.maxAnalysesPerMonth === -1) return { allowed: true };
  if (usageThisMonth >= plan.maxAnalysesPerMonth) {
    return {
      allowed: false,
      limit: plan.maxAnalysesPerMonth,
      reason: `O plano ${plan.label} permite ${plan.maxAnalysesPerMonth} análises IA por mês. Faz upgrade para análises ilimitadas.`,
    };
  }
  return { allowed: true, limit: plan.maxAnalysesPerMonth };
}

/** Chave do mês corrente, ex: "2026-05" */
export function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
