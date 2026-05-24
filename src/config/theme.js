// ─────────────────────────────────────────────────────────────
//  Fyziq — Design Tokens (tema claro moderno)
// ─────────────────────────────────────────────────────────────

export const theme = {
  // Brand colours (do logo)
  navy:      "#283750",
  navyDark:  "#1c2738",
  teal:      "#1a9fc6",
  mint:      "#3ad6bf",
  gradient:  "linear-gradient(135deg, #3ad6bf 0%, #1a9fc6 100%)",
  gradientSoft: "linear-gradient(135deg, rgba(58,214,191,0.12) 0%, rgba(26,159,198,0.12) 100%)",

  // Surfaces
  bg:        "#eef1f5",
  card:      "#ffffff",
  cardAlt:   "#f7f9fb",
  border:    "#e3e8ef",
  borderHover: "#cdd5e0",

  // Text
  text:      "#1c2738",
  textMid:   "#5a6678",
  textSoft:  "#94a0b3",

  // Status
  green:  "#10b981",
  amber:  "#f59e0b",
  orange: "#f97316",
  red:    "#ef4444",
  blue:   "#3b82f6",
  purple: "#8b5cf6",

  // Shadows
  shadowSm: "0 1px 3px rgba(28,39,56,0.06)",
  shadowMd: "0 4px 16px rgba(28,39,56,0.08)",
  shadowLg: "0 12px 32px rgba(28,39,56,0.12)",
  shadowBrand: "0 6px 20px rgba(26,159,198,0.28)",

  // Radii
  rSm: 10,
  rMd: 14,
  rLg: 20,
  rXl: 26,

  font: "'DM Sans', -apple-system, 'Segoe UI', sans-serif",
};

// Reusable button styles
export function btn(theme, variant = "primary") {
  const base = {
    padding: "11px 22px",
    borderRadius: theme.rMd,
    border: "none",
    cursor: "pointer",
    fontFamily: theme.font,
    fontWeight: 700,
    fontSize: 14,
    transition: "transform 0.1s, box-shadow 0.2s, background 0.2s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
  const variants = {
    primary: {
      background: theme.gradient,
      color: "#fff",
      boxShadow: theme.shadowBrand,
    },
    ghost: {
      background: theme.card,
      color: theme.textMid,
      border: `1px solid ${theme.border}`,
    },
    soft: {
      background: theme.gradientSoft,
      color: theme.teal,
      border: `1px solid rgba(26,159,198,0.2)`,
    },
    danger: {
      background: "rgba(239,68,68,0.08)",
      color: theme.red,
      border: "1px solid rgba(239,68,68,0.2)",
    },
  };
  return { ...base, ...variants[variant] };
}

export const IMC_RANGES_UI = [
  { max: 18.5, label: "Abaixo do peso",  color: "#3b82f6" },
  { max: 25,   label: "Peso normal",     color: "#10b981" },
  { max: 30,   label: "Excesso de peso", color: "#f59e0b" },
  { max: 35,   label: "Obesidade I",     color: "#f97316" },
  { max: 40,   label: "Obesidade II",    color: "#ef4444" },
  { max: 999,  label: "Obesidade III",   color: "#b91c1c" },
];
