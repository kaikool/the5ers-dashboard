import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface Props {
  data: any[];
}

export default function DrawdownChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="chart-section">
      <div className="section-label" style={{ font: 'var(--md-title-small)', color: 'var(--md-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>show_chart</span>
        Equity Curve
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-outline-variant)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--md-on-surface-variant)"
              fontSize={11}
              tickMargin={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--md-on-surface-variant)"
              fontSize={11}
              domain={['dataMin - 1000', 'dataMax + 1000']}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--md-surface-container-lowest)',
                border: '1px solid var(--md-outline-variant)',
                borderRadius: 'var(--md-shape-sm)',
                boxShadow: 'var(--md-elevation-2)',
                font: 'var(--md-body-small)'
              }}
              itemStyle={{ color: 'var(--md-on-surface)', fontWeight: 500 }}
              labelStyle={{ color: 'var(--md-on-surface-variant)' }}
            />

            <ReferenceLine
              y={data[0].dailyLimit}
              stroke="var(--color-loss)"
              strokeDasharray="4 4"
              label={{
                position: 'insideTopLeft', value: 'DAILY',
                fill: 'var(--color-loss)', fontSize: 10, fontWeight: 600
              }}
            />
            <ReferenceLine
              y={data[0].overallLimit}
              stroke="var(--color-loss)"
              strokeDasharray="4 4"
              label={{
                position: 'insideBottomLeft', value: 'MAX',
                fill: 'var(--color-loss)', fontSize: 10, fontWeight: 600
              }}
            />

            <Line type="monotone" dataKey="balance" stroke="var(--md-outline)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="equity" stroke="var(--md-primary)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
