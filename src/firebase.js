import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import env from "./config/env";

const app = initializeApp(env.FIREBASE);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics — só em browser compatível e fora de DEV
if (env.IS_PROD && env.FIREBASE.measurementId) {
  isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
}

export default app;
