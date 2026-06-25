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
    <div className="rules-section" style={{ marginTop: 24, padding: '24px 0 0 0' }}>
      <h3 className="chart-title">📉 Equity &amp; Drawdown Curve</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
            <YAxis stroke="var(--text-muted)" fontSize={12} domain={['dataMin - 1000', 'dataMax + 1000']} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8 }}
              itemStyle={{ color: 'var(--text-primary)', fontSize: 13 }}
            />
            
            <ReferenceLine y={data[0].dailyLimit} stroke="var(--danger)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Daily Loss Limit', fill: 'var(--danger)', fontSize: 11 }} />
            <ReferenceLine y={data[0].overallLimit} stroke="var(--danger)" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: 'Overall Limit', fill: 'var(--danger)', fontSize: 11 }} />

            <Line type="monotone" dataKey="balance" stroke="var(--info)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="equity" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
