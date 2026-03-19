import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Delivery, User, EMPLOYEE_COLORS } from '@/lib/mock-data';
import { CalendarDays } from 'lucide-react';

interface PerformanceChartsProps {
  deliveries: Delivery[];
  employees: User[];
}

type Period = '1d' | '7d' | '30d' | '1y' | '2y';

const periodLabels: Record<Period, string> = {
  '1d': 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  '1y': '1 ano',
  '2y': '2 anos',
};

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
  const approvedEmployees = employees.filter(e => e.approved && e.role === 'employee');

  const cutoffDate = useMemo(() => {
    const now = new Date(2026, 2, 19);
    const d = new Date(now);
    switch (period) {
      case '1d': d.setDate(d.getDate() - 1); break;
      case '7d': d.setDate(d.getDate() - 7); break;
      case '30d': d.setDate(d.getDate() - 30); break;
      case '1y': d.setFullYear(d.getFullYear() - 1); break;
      case '2y': d.setFullYear(d.getFullYear() - 2); break;
    }
    return d;
  }, [period]);

  const filteredDeliveries = useMemo(() =>
    deliveries.filter(d => new Date(d.createdAt) >= cutoffDate),
    [deliveries, cutoffDate]
  );

  // Bar chart data: deliveries per employee
  const barData = useMemo(() =>
    approvedEmployees.map(emp => ({
      name: emp.name.split(' ')[0],
      total: filteredDeliveries.filter(d => d.employeeId === emp.id).length,
      entregues: filteredDeliveries.filter(d => d.employeeId === emp.id && d.status === 'delivered').length,
      color: EMPLOYEE_COLORS[emp.id] || 'hsl(0,0%,50%)',
    })),
    [approvedEmployees, filteredDeliveries]
  );

  // Pie chart data
  const pieData = useMemo(() =>
    approvedEmployees.map(emp => ({
      name: emp.name.split(' ')[0],
      value: filteredDeliveries.filter(d => d.employeeId === emp.id && d.status === 'delivered').length,
      color: EMPLOYEE_COLORS[emp.id] || 'hsl(0,0%,50%)',
    })).filter(d => d.value > 0),
    [approvedEmployees, filteredDeliveries]
  );

  // Timeline data
  const timelineData = useMemo(() => {
    const buckets = new Map<string, Record<string, number>>();
    const isDaily = period === '1d';
    const isWeekly = period === '7d';

    filteredDeliveries.forEach(d => {
      const date = new Date(d.createdAt);
      let key: string;
      if (isDaily) {
        key = `${date.getHours()}h`;
      } else if (isWeekly) {
        key = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      } else if (period === '30d') {
        key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      } else {
        key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }

      if (!buckets.has(key)) buckets.set(key, {});
      const bucket = buckets.get(key)!;
      const empName = d.employeeName.split(' ')[0];
      bucket[empName] = (bucket[empName] || 0) + 1;
    });

    return Array.from(buckets.entries())
      .map(([label, counts]) => ({ label, ...counts }))
      .reverse();
  }, [filteredDeliveries, period]);

  // Avg per day per employee
  const avgData = useMemo(() => {
    const days = Math.max(1, Math.ceil((new Date(2026, 2, 19).getTime() - cutoffDate.getTime()) / 86400000));
    return approvedEmployees.map(emp => {
      const total = filteredDeliveries.filter(d => d.employeeId === emp.id && d.status === 'delivered').length;
      return {
        name: emp.name.split(' ')[0],
        media: Math.round((total / days) * 10) / 10,
        color: EMPLOYEE_COLORS[emp.id] || 'hsl(0,0%,50%)',
      };
    });
  }, [approvedEmployees, filteredDeliveries, cutoffDate]);

  const totalFiltered = filteredDeliveries.length;
  const totalDelivered = filteredDeliveries.filter(d => d.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Desempenho da Equipe</h1>
        <p className="text-sm text-muted-foreground">Métricas e gráficos detalhados</p>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        {(Object.keys(periodLabels) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === p
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
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

      {/* Bar Chart - Deliveries per employee */}
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

      {/* Pie Chart - Distribution */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Distribuição de Entregas</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
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
        {/* Legend */}
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

      {/* Area Chart - Timeline */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Evolução ao Longo do Tempo</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {approvedEmployees.map(emp => (
                <Area
                  key={emp.id}
                  type="monotone"
                  dataKey={emp.name.split(' ')[0]}
                  stackId="1"
                  stroke={EMPLOYEE_COLORS[emp.id]}
                  fill={EMPLOYEE_COLORS[emp.id]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart - Average per day */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Média Diária de Entregas</h3>
        <div className="space-y-3">
          {avgData.map(emp => (
            <div key={emp.name} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: emp.color }} />
              <span className="text-sm flex-1">{emp.name}</span>
              <div className="flex-1 bg-secondary rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (emp.media / Math.max(...avgData.map(a => a.media))) * 100)}%`,
                    backgroundColor: emp.color,
                  }}
                />
              </div>
              <span className="text-sm font-bold w-10 text-right">{emp.media}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking */}
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
