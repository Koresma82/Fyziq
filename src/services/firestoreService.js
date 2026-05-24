import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ════════════════════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════════════════════

/** Get a user profile by UID */
export async function getUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get pending profile by email (created by admin before first login) */
export async function getPendingProfile(email) {
  const key = email.toLowerCase().replace(/\./g, "_");
  const snap = await getDoc(doc(db, "pendingProfiles", key));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Called on first Google login — merges pending profile if exists */
export async function createOrMergeUser(firebaseUser) {
  const { uid, email, displayName, photoURL } = firebaseUser;

  // Já tem perfil? Devolve-o.
  const existing = await getUser(uid);
  if (existing) return existing;

  // Convite pendente criado pelo admin (se houver).
  const pending = await getPendingProfile(email);

  // Primeiro utilizador de todos → admin.
  // Usa o doc meta/bootstrap (legível por todos) em vez de listar users.
  const isFirst = await isFirstUser();
  const role = isFirst ? "admin" : (pending?.role || "user");

  const userData = {
    email,
    name:      pending?.name || displayName || email,
    photoURL:  photoURL || "",
    role,
    sex:       pending?.sex    || "M",
    age:       pending?.age    || 25,
    height:    pending?.height || 170,
    weight:    pending?.weight || 70,
    active:    true,
    createdAt: serverTimestamp(),
    createdBy: pending?.createdBy || uid,
  };

  // Cria o doc do utilizador.
  await setDoc(doc(db, "users", uid), userData);

  // Marca o bootstrap como concluído (primeiro admin criado).
  if (isFirst) {
    await setDoc(doc(db, "meta", "bootstrap"), {
      initialized: true,
      firstAdmin: uid,
      at: serverTimestamp(),
    });
  }

  // Remove o convite pendente, se existia.
  if (pending) {
    const key = email.toLowerCase().replace(/\./g, "_");
    try { await deleteDoc(doc(db, "pendingProfiles", key)); } catch (e) { /* noop */ }
  }

  return { id: uid, ...userData };
}

/** True se ainda não existe nenhum utilizador (bootstrap por fazer). */
async function isFirstUser() {
  const snap = await getDoc(doc(db, "meta", "bootstrap"));
  return !snap.exists();
}

/** Admin: list all active users */
export async function listUsers() {
  // Query simples (sem índice composto): vai buscar todos e
  // filtra/ordena em memória. Volume pequeno, sem custo relevante.
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt"));
}

/** Admin: list pending profiles (not yet logged in) */
export async function listPendingProfiles() {
  const snap = await getDocs(collection(db, "pendingProfiles"));
  return snap.docs.map(d => ({ id: d.id, ...d.data(), isPending: true }));
}

/** Admin: create a pending profile for a new user */
export async function createPendingProfile(adminUid, { email, name, sex, age, height, weight, role = "user" }) {
  const key = email.toLowerCase().replace(/\./g, "_");
  await setDoc(doc(db, "pendingProfiles", key), {
    email, name, sex, age, height, weight, role,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
  });
}

/** Admin: delete a pending profile */
export async function deletePendingProfile(email) {
  const key = email.toLowerCase().replace(/\./g, "_");
  await deleteDoc(doc(db, "pendingProfiles", key));
}

/** Update a user's profile data */
export async function updateUser(uid, data) {
  await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
}

/** Admin: deactivate a user */
export async function deactivateUser(uid) {
  await updateDoc(doc(db, "users", uid), { active: false });
}

// ════════════════════════════════════════════════════════════
// ANALYSES
// ════════════════════════════════════════════════════════════

/** Save a completed analysis for a user */
export async function saveAnalysis(userId, analysisData) {
  const ref = await addDoc(collection(db, "analyses"), {
    ...analysisData,
    userId,
    date: serverTimestamp(),
  });
  return ref.id;
}

/** Get all analyses for a user, newest first */
export async function getUserAnalyses(userId) {
  // where() simples num só campo NÃO precisa de índice composto.
  // A ordenação por data é feita em memória.
  const snap = await getDocs(
    query(collection(db, "analyses"), where("userId", "==", userId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      return db2 - da; // mais recente primeiro
    });
}

/** Get a single analysis */
export async function getAnalysis(analysisId) {
  const snap = await getDoc(doc(db, "analyses", analysisId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Delete an analysis (admin only) */
export async function deleteAnalysis(analysisId) {
  await deleteDoc(doc(db, "analyses", analysisId));
}
