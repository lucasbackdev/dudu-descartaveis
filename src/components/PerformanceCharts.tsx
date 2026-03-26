import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Profile, Delivery, EMPLOYEE_COLORS } from '@/lib/types';
import { CalendarDays, User, Users } from 'lucide-react';

interface PerformanceChartsProps {
  deliveries: Delivery[];
  employees: Profile[];
}

type Period = 'today' | '7d' | '30d';

const periodLabels: Record<Period, string> = {
  'today': 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const PerformanceCharts = ({ deliveries, employees }: PerformanceChartsProps) => {
  const [period, setPeriod] = useState<Period>('7d');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const approvedEmployees = employees.filter(e => e.approved);

  const cutoffDate = useMemo(() => {
    const d = new Date();
    switch (period) {
      case 'today': d.setHours(0, 0, 0, 0); break;
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
      map[emp.id] = emp.color || EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length];
    });
    return map;
  }, [approvedEmployees]);

  const barData = useMemo(() =>
    approvedEmployees.map(emp => ({
      id: emp.id,
      name: emp.name.split(' ')[0],
      entregues: filteredDeliveries.filter(d => d.employee_id === emp.id && d.status === 'delivered').length,
      pendentes: filteredDeliveries.filter(d => d.employee_id === emp.id && d.status !== 'delivered').length,
      total: filteredDeliveries.filter(d => d.employee_id === emp.id).length,
      color: empColorMap[emp.id],
    })),
    [approvedEmployees, filteredDeliveries, empColorMap]
  );

  const pieData = useMemo(() =>
    barData.filter(d => d.entregues > 0).map(d => ({ name: d.name, value: d.entregues, color: d.color })),
    [barData]
  );

  const totalFiltered = filteredDeliveries.length;
  const totalDelivered = filteredDeliveries.filter(d => d.status === 'delivered').length;

  // Daily breakdown - uses real calendar dates
  const dailyData = useMemo(() => {
    const numDays = period === 'today' ? 1 : period === '7d' ? 7 : 30;
    const days: { date: Date; label: string }[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      if (period === 'today') {
        days.push({ date: d, label: `${WEEKDAYS[d.getDay()]} (Hoje)` });
      } else {
        days.push({ date: d, label: `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` });
      }
    }

    const empsToShow = compareMode
      ? approvedEmployees
      : selectedEmployeeId
        ? approvedEmployees.filter(e => e.id === selectedEmployeeId)
        : approvedEmployees;

    return days.map(day => {
      const nextDay = new Date(day.date);
      nextDay.setDate(nextDay.getDate() + 1);

      const row: any = { name: day.label };
      empsToShow.forEach(emp => {
        row[emp.name.split(' ')[0]] = deliveries.filter(
          d => d.employee_id === emp.id && d.status === 'delivered' &&
            new Date(d.created_at) >= day.date && new Date(d.created_at) < nextDay
        ).length;
      });
      return row;
    });
  }, [deliveries, approvedEmployees, selectedEmployeeId, compareMode, period]);

  const empsForDailyChart = compareMode
    ? approvedEmployees
    : selectedEmployeeId
      ? approvedEmployees.filter(e => e.id === selectedEmployeeId)
      : approvedEmployees;

  const displayBarData = barData.length > 0 ? barData : [{ name: '—', entregues: 0, pendentes: 0, total: 0, color: EMPLOYEE_COLORS[0], id: '' }];

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

      {/* Employee filter */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Filtrar por funcionário</p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setSelectedEmployeeId(null); setCompareMode(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
              !selectedEmployeeId && !compareMode ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            }`}
          >
            <Users className="w-3 h-3" /> Todos
          </button>
          <button
            onClick={() => { setCompareMode(!compareMode); setSelectedEmployeeId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              compareMode ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            }`}
          >
            Comparar
          </button>
          {approvedEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => { setSelectedEmployeeId(emp.id); setCompareMode(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedEmployeeId === emp.id ? 'text-white' : 'bg-secondary text-muted-foreground'
              }`}
              style={selectedEmployeeId === emp.id ? { backgroundColor: empColorMap[emp.id] } : {}}
            >
              <User className="w-3 h-3" />
              {emp.name.split(' ')[0]}
            </button>
          ))}
        </div>
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

      {/* Daily breakdown chart */}
      {(
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-1">
            Entregas Diárias ({periodLabels[period]})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {selectedEmployeeId
              ? `Detalhamento de ${approvedEmployees.find(e => e.id === selectedEmployeeId)?.name.split(' ')[0]}`
              : compareMode ? 'Comparando todos' : 'Todos os funcionários'}
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: period === '30d' ? 9 : 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {empsForDailyChart.map(emp => (
                  <Bar key={emp.id} dataKey={emp.name.split(' ')[0]} name={emp.name.split(' ')[0]} fill={empColorMap[emp.id]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Line trend chart */}
      {period !== 'today' && (compareMode || selectedEmployeeId) && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-4">Tendência ({periodLabels[period]})</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: period === '30d' ? 9 : 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {empsForDailyChart.map(emp => (
                  <Line key={emp.id} type="monotone" dataKey={emp.name.split(' ')[0]} name={emp.name.split(' ')[0]} stroke={empColorMap[emp.id]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Total bar chart */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Entregas por Funcionário</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayBarData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="entregues" name="Entregues" radius={[8, 8, 0, 0]}>
                {displayBarData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie chart */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Distribuição de Entregas</h3>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados de entrega no período</p>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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
          </>
        )}
      </div>

      {/* Ranking */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">🏆 Ranking do Período</h3>
        <div className="space-y-2">
          {[...displayBarData].sort((a, b) => b.entregues - a.entregues).map((emp, i) => (
            <div
              key={emp.name}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                selectedEmployeeId === emp.id ? 'bg-foreground/10 border border-foreground/20' : 'bg-secondary'
              }`}
              onClick={() => { setSelectedEmployeeId(emp.id === selectedEmployeeId ? null : emp.id); setCompareMode(false); }}
            >
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
