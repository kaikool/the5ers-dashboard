import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface Props {
  data: any[];
}

export default function DrawdownChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span className="status-dot safe" style={{ background: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-base)', letterSpacing: '0.05em' }}>EQUITY CURVE</span>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />
            <XAxis dataKey="day" stroke="var(--text-dim)" fontSize={11} tickMargin={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-dim)" fontSize={11} domain={['dataMin - 1000', 'dataMax + 1000']} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 8 }}
              itemStyle={{ color: '#fff', fontSize: 13 }}
              labelStyle={{ color: 'var(--text-muted)' }}
            />
            
            <ReferenceLine y={data[0].dailyLimit} stroke="var(--danger-neon)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'DAILY LIMIT', fill: 'var(--danger-neon)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }} />
            <ReferenceLine y={data[0].overallLimit} stroke="var(--danger-neon)" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: 'OVERALL LIMIT', fill: 'var(--danger-neon)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }} />

            <Line type="monotone" dataKey="balance" stroke="var(--text-muted)" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="equity" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} style={{ filter: 'drop-shadow(0px 0px 8px var(--accent-cyan-dim))' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
