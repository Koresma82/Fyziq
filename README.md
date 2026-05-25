# Fyziq — Setup Guide

Análise de composição corporal e postura com IA (Claude Vision).
Multi-utilizador · Google Auth · Firebase · Netlify · 3 ambientes.

Repo: https://github.com/Koresma82/Fyziq

---

## Ambientes

| Branch | Firebase    | Netlify site            |
|--------|-------------|-------------------------|
| `dev`  | fyziqdev    | (criar) fyziq-dev       |
| `test` | fyziqtest   | (criar) fyziq-test      |
| `main` | fyziqprod   | (criar) fyziq / fyziq.app |

As config Firebase já estão preenchidas em `.env.dev`, `.env.test`, `.env.prod`.
A `apiKey` Firebase é pública por design — a segurança está nas Rules.

---

## 1. Instalar

```bash
git clone https://github.com/Koresma82/Fyziq.git
cd Fyziq
npm install
```

---

## 2. Anthropic API Key (único segredo)

Não vai no Git. Define em dois sítios:

**Local** — cria `.env.dev.local` (gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Netlify** — em cada site → Site settings → Environment variables:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 3. Firestore + Storage Rules

Com o Firebase CLI (`npm i -g firebase-tools`, `firebase login`):

```bash
npm run rules:dev     # deploy rules → fyziqdev
npm run rules:test    # → fyziqtest
npm run rules:prod    # → fyziqprod
```

Os aliases dev/test/prod estão no `.firebaserc`.

**CORS do Storage** (uma vez por projecto):
```bash
echo '[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://fyziqdev.firebasestorage.app
gsutil cors set cors.json gs://fyziqtest.firebasestorage.app
gsutil cors set cors.json gs://fyziqprod.firebasestorage.app
```

---

## 4. Correr localmente

```bash
npm run dev          # Netlify Dev (Vite modo dev) em localhost:8888
```

---

## 5. Deploy

### Manual
```bash
npm run deploy:dev
npm run deploy:test
npm run deploy:prod
```

### CI/CD por branch (recomendado)
No Netlify cria 3 sites ligados ao repo `Koresma82/Fyziq`:
- Site DEV  → branch `dev`  → o `netlify.toml` corre `build:dev`
- Site TEST → branch `test` → corre `build:test`
- Site PROD → branch `main` → corre `build:prod`

Push para a branch = deploy automático.

---

## 6. Primeiro Login = Admin

O primeiro utilizador a entrar com Google é automaticamente **admin**.
Depois cria utilizadores no painel e partilha o URL da app.

---

## Estrutura

```
src/
├── config/
│   ├── env.js          ← variáveis de ambiente
│   └── theme.js        ← design tokens (tema claro)
├── firebase.js
├── contexts/AuthContext.jsx
├── services/{firestoreService,storageService}.js
├── utils/calculations.js
├── pages/{LoginPage,AdminDashboard,UserDetailPage,MyProfilePage}.jsx
└── components/{AnalysisForm,AnalysisCard,HistoryChart,NavBar}.jsx

netlify/functions/analyze.js   ← proxy Anthropic
public/{favicon.svg,icon-*.png,logo-full.png,manifest.webmanifest}
.firebaserc                    ← aliases dev/test/prod
firebase.json
```

---

## Super Admin

A app tem um painel de Super Admin separado das contas de profissional.

### Criar conta de super admin

1. No Firebase Console do ambiente pretendido → **Authentication → Sign-in method**
   → ativar **Email/Password**.
2. **Project Settings → Service Accounts → Generate new private key** → guardar o JSON.
3. Instalar a dependência e correr o script:

```bash
npm install firebase-admin
node scripts/create-super-admin.js <service-account.json> <email> <password>
```

Exemplo:
```bash
node scripts/create-super-admin.js ./fyziqtest-sa.json admin@fyziq.app MinhaPass123
```

### Aceder ao painel

Na página de login, toca **5 vezes no logo** → aparece o ecrã de login
super admin → entra com o email/password criados.

### O que o super admin controla

- Lista de todos os profissionais com métricas (pacientes, análises IA, custo estimado)
- Alterar plano de cada conta: Trial / Standard / Premium
- Definir os dias de trial
- Ativar / desativar contas

### Planos e limites

| Plano    | Pacientes | Análises IA/mês |
|----------|-----------|-----------------|
| Trial    | 5         | 10              |
| Standard | 20        | 30              |
| Premium  | ∞         | ∞               |

Quando o trial expira, a conta passa a comportar-se como Standard
(os dados existentes mantêm-se visíveis, só bloqueia criar acima do limite).
