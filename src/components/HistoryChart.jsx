import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { theme } from "../config/theme";

const t = theme;

function fmt(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

const Dot = ({ cx, cy, stroke }) => (
  <circle cx={cx} cy={cy} r={4} fill="#fff" stroke={stroke} strokeWidth={2.5} />
);

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: `1px solid ${t.border}`,
      borderRadius: 10, padding: "8px 12px", fontSize: 12,
      boxShadow: t.shadowMd,
    }}>
      <div style={{ color: t.textSoft, marginBottom: 3 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {p.value?.toFixed(1)} {p.unit}
        </div>
      ))}
    </div>
  );
};

export default function HistoryChart({ analyses }) {
  if (!analyses || analyses.length < 2) return null;

  const data = [...analyses]
    .sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return da - db;
    })
    .map(a => ({
      date:   fmt(a.date),
      imc:    a.metrics?.imc,
      bf:     a.metrics?.bf,
      weight: a.patientSnapshot?.weight,
    }));

  const charts = [
    { key: "imc",    label: "IMC",       color: t.teal,   unit: "kg/m²", ref: 25 },
    { key: "bf",     label: "% Gordura", color: t.orange, unit: "%",     ref: null },
    { key: "weight", label: "Peso",      color: t.blue,   unit: "kg",    ref: null },
  ].filter(c => data.some(d => d[c.key] != null));

  return (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: t.rLg, padding: 18, boxShadow: t.shadowSm,
      fontFamily: t.font,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: t.textSoft, textTransform: "uppercase", marginBottom: 16 }}>
        📈 Evolução · {analyses.length} análises
      </div>
      {charts.map(({ key, label, color, unit, ref }) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
          <ResponsiveContainer width="100%" height={92}>
            <LineChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.textSoft }} tickLine={false} axisLine={{ stroke: t.border }} />
              <YAxis tick={{ fontSize: 10, fill: t.textSoft }} tickLine={false} axisLine={false} domain={["auto","auto"]} />
              <Tooltip content={<TT />} />
              {ref && <ReferenceLine y={ref} stroke={color} strokeDasharray="3 3" strokeOpacity={0.35} />}
              <Line type="monotone" dataKey={key} name={label} unit={unit}
                stroke={color} strokeWidth={2.5}
                dot={<Dot stroke={color} />} activeDot={{ r: 6, fill: color }}
                connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}
