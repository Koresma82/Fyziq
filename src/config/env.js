// ─────────────────────────────────────────────────────────────
//  Fyziq — Centralização de variáveis de ambiente
//  Modos Vite: dev | test | prod
// ─────────────────────────────────────────────────────────────

const APP_ENV = import.meta.env.VITE_APP_ENV || "dev";

const env = {
  // App
  APP_ENV,
  APP_NAME: import.meta.env.VITE_APP_NAME || "Fyziq",
  IS_DEV:   APP_ENV === "dev",
  IS_TEST:  APP_ENV === "test",
  IS_PROD:  APP_ENV === "prod",

  // Firebase
  FIREBASE: {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },

  // Feature flags
  MAX_IMAGE_MB:    parseFloat(import.meta.env.VITE_MAX_IMAGE_MB || "10"),
  ENABLE_SKELETON: import.meta.env.VITE_ENABLE_SKELETON !== "false",
};

// Validação no boot (só fora de PROD)
if (!env.IS_PROD) {
  const required = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_STORAGE_BUCKET",
  ];
  const missing = required.filter(k => !import.meta.env[k]);
  if (missing.length) {
    console.error(`🔴 [Fyziq/${APP_ENV}] ENV vars em falta:`, missing.join(", "));
  } else {
    console.log(`✅ [Fyziq/${APP_ENV}] Firebase: ${env.FIREBASE.projectId}`);
  }
}

export default env;
