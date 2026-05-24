import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, orderBy, getDocs,
  addDoc, serverTimestamp, limit,
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
  const existing = await getUser(uid);
  if (existing) return existing;

  const pending = await getPendingProfile(email);

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

  await setDoc(doc(db, "users", uid), userData);

  if (pending) {
    const key = email.toLowerCase().replace(/\./g, "_");
    await deleteDoc(doc(db, "pendingProfiles", key));
  }

  return { id: uid, ...userData };
}

async function isFirstUser() {
  const snap = await getDocs(query(collection(db, "users"), limit(1)));
  return snap.empty;
}

/** Admin: list all active users */
export async function listUsers() {
  const snap = await getDocs(
    query(collection(db, "users"), where("active", "==", true), orderBy("name"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const snap = await getDocs(
    query(
      collection(db, "analyses"),
      where("userId", "==", userId),
      orderBy("date", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
