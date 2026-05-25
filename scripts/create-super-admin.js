#!/usr/bin/env node
/**
 * ──────────────────────────────────────────────────────────────
 *  Fyziq — Criar conta de Super Admin
 * ──────────────────────────────────────────────────────────────
 *
 *  Cria uma conta Email/Password no Firebase Auth e regista-a
 *  como super admin no Firestore (colecção "superAdmins").
 *
 *  PRÉ-REQUISITOS:
 *  1. Ativar "Email/Password" em Authentication → Sign-in method
 *     no projecto Firebase pretendido.
 *  2. Gerar uma Service Account Key:
 *     Firebase Console → Project Settings → Service Accounts
 *     → "Generate new private key" → guardar o JSON.
 *  3. npm install firebase-admin
 *
 *  USO:
 *    node scripts/create-super-admin.js <caminho-service-account.json> <email> <password>
 *
 *  EXEMPLO:
 *    node scripts/create-super-admin.js ./fyziqtest-sa.json admin@fyziq.app MinhaPass123
 *
 *  Para cada ambiente (dev/test/prod) corre o script com a
 *  Service Account Key correspondente.
 * ──────────────────────────────────────────────────────────────
 */

const admin = require("firebase-admin");
const path  = require("path");

async function main() {
  const [, , saPath, email, password] = process.argv;

  if (!saPath || !email || !password) {
    console.error("\n❌ Argumentos em falta.\n");
    console.error("Uso:");
    console.error("  node scripts/create-super-admin.js <service-account.json> <email> <password>\n");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("❌ A password deve ter pelo menos 6 caracteres.");
    process.exit(1);
  }

  let serviceAccount;
  try {
    serviceAccount = require(path.resolve(saPath));
  } catch {
    console.error(`❌ Não foi possível ler a Service Account Key: ${saPath}`);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const auth = admin.auth();
  const db   = admin.firestore();
  const projectId = serviceAccount.project_id;

  console.log(`\n🔧 Projecto Firebase: ${projectId}`);
  console.log(`📧 Email super admin: ${email}\n`);

  // 1. Criar (ou obter) a conta no Firebase Auth
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: "Super Admin",
    });
    console.log(`✅ Conta criada no Auth — UID: ${userRecord.uid}`);
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { password });
      console.log(`ℹ️  Conta já existia — password atualizada. UID: ${userRecord.uid}`);
    } else {
      console.error("❌ Erro ao criar conta:", err.message);
      process.exit(1);
    }
  }

  // 2. Custom claim — permite proteger rotas/rules pelo token
  await auth.setCustomUserClaims(userRecord.uid, { superAdmin: true });
  console.log("✅ Custom claim 'superAdmin' aplicada.");

  // 3. Registo no Firestore (colecção superAdmins)
  await db.collection("superAdmins").doc(userRecord.uid).set({
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("✅ Registado em Firestore › superAdmins.");

  console.log("\n🎉 Super Admin pronto a usar!");
  console.log("   Acede à app, toca 5× no logo e entra com este email/password.\n");

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
