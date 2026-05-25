import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import env from "./config/env";

const app = initializeApp(env.FIREBASE);

export const auth = getAuth(app);

// Firestore com cache local persistente:
// na 2ª visita os dados aparecem instantaneamente do cache,
// e sincroniza com o servidor em segundo plano.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics — só em browser compatível e em PROD
if (env.IS_PROD && env.FIREBASE.measurementId) {
  isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
}

export default app;
