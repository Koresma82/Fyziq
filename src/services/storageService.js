import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Upload a base64 image to Firebase Storage.
 * Returns { url, path }
 */
export async function uploadAnalysisImage(userId, base64DataUrl, mediaType = "image/jpeg") {
  const analysisId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const ext = mediaType.split("/")[1] || "jpg";
  const path = `analyses/${userId}/${analysisId}.${ext}`;

  // Convert base64 to Blob
  const res = await fetch(base64DataUrl);
  const blob = await res.blob();

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: mediaType });
  const url = await getDownloadURL(storageRef);

  return { url, path };
}

/**
 * Delete an image from Firebase Storage by path.
 */
export async function deleteAnalysisImage(imagePath) {
  if (!imagePath) return;
  try {
    await deleteObject(ref(storage, imagePath));
  } catch (e) {
    // Ignore if already deleted
    console.warn("Storage delete:", e.code);
  }
}
