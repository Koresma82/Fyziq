import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
  addDoc, serverTimestamp, increment,
} from "firebase/firestore";
import { db } from "../firebase";
import { currentMonthKey } from "../config/plans";

// ════════════════════════════════════════════════════════════
//  PROFISSIONAIS (contas Google que fazem login)
// ════════════════════════════════════════════════════════════

/** Perfil do profissional autenticado */
export async function getProfessional(uid) {
  const snap = await getDoc(doc(db, "professionals", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Criado no primeiro login com Google. Primeiro de todos = admin. */
export async function createOrGetProfessional(firebaseUser) {
  const { uid, email, displayName, photoURL } = firebaseUser;

  const existing = await getProfessional(uid);
  if (existing) return existing;

  // Trial de 7 dias a contar de agora.
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 7);

  const data = {
    email,
    name:      displayName || email,
    photoURL:  photoURL || "",
    role:      "professional",
    plan:      "trial",
    trialEndsAt: trialEnds,
    active:    true,
    createdAt: serverTimestamp(),
    // Contadores de utilização (para limites e métricas)
    patientCount: 0,
    analysisCount: 0,        // total acumulado
    aiUsage: {},             // { "2026-05": 7, "2026-06": 3, ... }
  };

  await setDoc(doc(db, "professionals", uid), data);
  return { id: uid, ...data };
}

// ════════════════════════════════════════════════════════════
//  PACIENTES (fichas — não fazem login)
// ════════════════════════════════════════════════════════════

/** Lista os pacientes de um profissional, ordenados por nome */
export async function listPatients(ownerId) {
  const snap = await getDocs(
    query(collection(db, "patients"), where("ownerId", "==", ownerId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt"));
}

/** Obtém um paciente */
export async function getPatient(patientId) {
  const snap = await getDoc(doc(db, "patients", patientId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Cria uma ficha de paciente e incrementa o contador do profissional */
export async function createPatient(ownerId, { name, email, phone, sex, age, height, weight, notes }) {
  const ref = await addDoc(collection(db, "patients"), {
    ownerId,
    name:   name?.trim() || "Sem nome",
    email:  email?.trim().toLowerCase() || "",
    phone:  phone?.trim() || "",
    sex:    sex || "M",
    age:    age    ? parseInt(age)      : 25,
    height: height ? parseFloat(height) : 170,
    weight: weight ? parseFloat(weight) : 70,
    notes:  notes?.trim() || "",
    active: true,
    createdAt: serverTimestamp(),
  });
  // Incrementa contador de pacientes do profissional
  await updateDoc(doc(db, "professionals", ownerId), {
    patientCount: increment(1),
  });
  return ref.id;
}

/** Atualiza a ficha do paciente */
export async function updatePatient(patientId, data) {
  await updateDoc(doc(db, "patients", patientId), {
    ...data, updatedAt: serverTimestamp(),
  });
}

/** Remove (soft delete) um paciente e decrementa o contador */
export async function deletePatient(patientId, ownerId) {
  await updateDoc(doc(db, "patients", patientId), { active: false });
  if (ownerId) {
    await updateDoc(doc(db, "professionals", ownerId), {
      patientCount: increment(-1),
    });
  }
}

// ════════════════════════════════════════════════════════════
//  ANÁLISES (ligadas a um paciente)
// ════════════════════════════════════════════════════════════

/** Guarda uma análise e regista o uso de IA do profissional */
export async function saveAnalysis(patientId, ownerId, analysisData) {
  const ref = await addDoc(collection(db, "analyses"), {
    ...analysisData,
    patientId,
    ownerId,
    date: serverTimestamp(),
  });
  // Regista uso de IA: total + contador do mês corrente
  const monthKey = currentMonthKey();
  await updateDoc(doc(db, "professionals", ownerId), {
    analysisCount: increment(1),
    [`aiUsage.${monthKey}`]: increment(1),
  });
  return ref.id;
}

/** Histórico de análises de um paciente, mais recente primeiro */
export async function getPatientAnalyses(patientId, ownerId) {
  const snap = await getDocs(
    query(collection(db, "analyses"), where("ownerId", "==", ownerId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.patientId === patientId)
    .sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      return db2 - da;
    });
}

/** Elimina uma análise */
export async function deleteAnalysis(analysisId) {
  await deleteDoc(doc(db, "analyses", analysisId));
}

// ════════════════════════════════════════════════════════════
//  SUPER ADMIN
// ════════════════════════════════════════════════════════════

/** Verifica se um UID é super admin */
export async function isSuperAdmin(uid) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, "superAdmins", uid));
  return snap.exists();
}

/** Lista todos os profissionais (só super admin) */
export async function listAllProfessionals() {
  const snap = await getDocs(collection(db, "professionals"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return db2 - da;
    });
}

/** Super admin: altera o plano de um profissional */
export async function setProfessionalPlan(uid, plan, trialDays = 7) {
  const update = { plan };
  if (plan === "trial") {
    const ends = new Date();
    ends.setDate(ends.getDate() + trialDays);
    update.trialEndsAt = ends;
  } else {
    update.trialEndsAt = null;
  }
  await updateDoc(doc(db, "professionals", uid), update);
}

/** Super admin: ativa/desativa uma conta */
export async function setProfessionalActive(uid, active) {
  await updateDoc(doc(db, "professionals", uid), { active });
}

// ════════════════════════════════════════════════════════════
//  CONFIG DE PLANOS (editável pelo super admin)
// ════════════════════════════════════════════════════════════

/**
 * Lê os overrides de limites definidos pelo super admin.
 * Devolve null se nunca foram configurados (usa-se os defaults).
 */
export async function getPlanConfig() {
  const snap = await getDoc(doc(db, "config", "plans"));
  return snap.exists() ? snap.data() : null;
}

/** Super admin: grava os overrides de limites */
export async function savePlanConfig(overrides) {
  await setDoc(doc(db, "config", "plans"), {
    ...overrides,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
