import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

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

  // Primeiro profissional de todos → admin (via doc meta/bootstrap)
  const isFirst = await isFirstProfessional();

  const data = {
    email,
    name:      displayName || email,
    photoURL:  photoURL || "",
    role:      isFirst ? "admin" : "professional",
    active:    true,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "professionals", uid), data);

  if (isFirst) {
    await setDoc(doc(db, "meta", "bootstrap"), {
      initialized: true, firstAdmin: uid, at: serverTimestamp(),
    });
  }

  return { id: uid, ...data };
}

async function isFirstProfessional() {
  const snap = await getDoc(doc(db, "meta", "bootstrap"));
  return !snap.exists();
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

/** Cria uma ficha de paciente */
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
  return ref.id;
}

/** Atualiza a ficha do paciente */
export async function updatePatient(patientId, data) {
  await updateDoc(doc(db, "patients", patientId), {
    ...data, updatedAt: serverTimestamp(),
  });
}

/** Remove (soft delete) um paciente */
export async function deletePatient(patientId) {
  await updateDoc(doc(db, "patients", patientId), { active: false });
}

// ════════════════════════════════════════════════════════════
//  ANÁLISES (ligadas a um paciente)
// ════════════════════════════════════════════════════════════

/** Guarda uma análise para um paciente */
export async function saveAnalysis(patientId, ownerId, analysisData) {
  const ref = await addDoc(collection(db, "analyses"), {
    ...analysisData,
    patientId,
    ownerId,
    date: serverTimestamp(),
  });
  return ref.id;
}

/** Histórico de análises de um paciente, mais recente primeiro */
export async function getPatientAnalyses(patientId) {
  const snap = await getDocs(
    query(collection(db, "analyses"), where("patientId", "==", patientId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
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
