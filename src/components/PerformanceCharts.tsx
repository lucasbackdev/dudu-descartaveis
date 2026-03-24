import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { Profile, Delivery } from '@/lib/types';
import { CalendarDays } from 'lucide-react';

interface PerformanceChartsProps {
  deliveries: Delivery[];
  employees: Profile[];
}

type Period = '7d' | '30d';

const periodLabels: Record<Period, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
};

const COLORS = [
  'hsl(220, 90%, 56%)', 'hsl(340, 82%, 52%)',
  'hsl(160, 84%, 39%)', 'hsl(32, 95%, 50%)',
  'hsl(270, 70%, 55%)', 'hsl(190, 80%, 45%)',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const PerformanceCharts = ({ deliveries, employees }: PerformanceChartsProps) => {
  const [period, setPeriod] = useState<Period>('7d');
  const approvedEmployees = employees.filter(e => e.approved);

  const cutoffDate = useMemo(() => {
    const d = new Date();
    switch (period) {
      case '7d': d.setDate(d.getDate() - 7); break;
      case '30d': d.setDate(d.getDate() - 30); break;
    }
    return d;
  }, [period]);

  const filteredDeliveries = useMemo(() =>
    deliveries.filter(d => new Date(d.created_at) >= cutoffDate),
    [deliveries, cutoffDate]
  );

  const empColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    approvedEmployees.forEach((emp, i) => {
      map[emp.id] = COLORS[i % COLORS.length];
    });
    return map;
  }, [approvedEmployees]);

  const barData = useMemo(() =>
    approvedEmployees.map(emp => ({
      name: emp.name.split(' ')[0],
      entregues: filteredDeliveries.filter(d => d.employee_id === emp.id && d.status === 'delivered').length,
      color: empColorMap[emp.id],
    })),
    [approvedEmployees, filteredDeliveries, empColorMap]
  );

  const pieData = useMemo(() =>
    approvedEmployees.map(emp => ({
      name: emp.name.split(' ')[0],
      value: filteredDeliveries.filter(d => d.employee_id === emp.id && d.status === 'delivered').length,
      color: empColorMap[emp.id],
    })).filter(d => d.value > 0),
    [approvedEmployees, filteredDeliveries, empColorMap]
  );

  const totalFiltered = filteredDeliveries.length;
  const totalDelivered = filteredDeliveries.filter(d => d.status === 'delivered').length;

  if (deliveries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Desempenho da Equipe</h1>
          <p className="text-sm text-muted-foreground">Nenhuma entrega registrada ainda para exibir gráficos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Desempenho da Equipe</h1>
        <p className="text-sm text-muted-foreground">Métricas e gráficos detalhados</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        {(Object.keys(periodLabels) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === p ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalFiltered}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-secondary rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalDelivered}</p>
          <p className="text-xs text-muted-foreground">Entregues</p>
        </div>
        <div className="bg-secondary rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{totalFiltered > 0 ? Math.round((totalDelivered / totalFiltered) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Taxa</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Entregas por Funcionário</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="entregues" name="Entregues" radius={[8, 8, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {pieData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-4">Distribuição de Entregas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={90}
                  paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">🏆 Ranking do Período</h3>
        <div className="space-y-2">
          {[...barData].sort((a, b) => b.entregues - a.entregues).map((emp, i) => (
            <div key={emp.name} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <span className="text-lg font-bold w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: emp.color }}>
                {emp.name.charAt(0)}
              </div>
              <span className="text-sm font-semibold flex-1">{emp.name}</span>
              <span className="text-lg font-bold">{emp.entregues}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;
