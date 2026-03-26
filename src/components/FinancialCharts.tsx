import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Profile, Delivery } from '@/lib/types';
import { CalendarDays, DollarSign } from 'lucide-react';

interface DeliveryItemWithPrice {
  id: string;
  delivery_id: string;
  name: string;
  quantity: number;
  sale_price: number;
}

interface FinancialChartsProps {
  deliveries: Delivery[];
  employees: Profile[];
}

type Period = '7d' | '30d' | 'all';

const periodLabels: Record<Period, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  'all': 'Tudo',
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
          <span className="font-bold">R$ {Number(entry.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

const FinancialCharts = ({ deliveries, employees }: FinancialChartsProps) => {
  const [period, setPeriod] = useState<Period>('30d');
  const approvedEmployees = employees.filter(e => e.approved);

  const cutoffDate = useMemo(() => {
    if (period === 'all') return new Date(0);
    const d = new Date();
    if (period === '7d') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 30);
    return d;
  }, [period]);

  const filteredDeliveries = useMemo(() =>
    deliveries.filter(d => new Date(d.created_at) >= cutoffDate && d.status === 'delivered'),
    [deliveries, cutoffDate]
  );

  const empColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    approvedEmployees.forEach((emp, i) => {
      map[emp.id] = COLORS[i % COLORS.length];
    });
    return map;
  }, [approvedEmployees]);

  // Calculate revenue per employee
  const revenueData = useMemo(() =>
    approvedEmployees.map(emp => {
      const empDeliveries = filteredDeliveries.filter(d => d.employee_id === emp.id);
      let revenue = 0;
      empDeliveries.forEach(d => {
        d.delivery_items?.forEach((item: any) => {
          revenue += (Number(item.sale_price) || 0) * item.quantity;
        });
      });
      return {
        name: emp.name.split(' ')[0],
        fullName: emp.name,
        receita: revenue,
        entregas: empDeliveries.length,
        color: empColorMap[emp.id],
      };
    }),
    [approvedEmployees, filteredDeliveries, empColorMap]
  );

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.receita, 0);
  const totalDeliveries = filteredDeliveries.length;

  const pieData = revenueData.filter(d => d.receita > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Receitas por funcionário</p>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Receita Total</p>
          </div>
          <p className="text-2xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-secondary rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Entregas Concluídas</p>
          <p className="text-2xl font-bold">{totalDeliveries}</p>
          <p className="text-xs text-muted-foreground">
            {totalDeliveries > 0 ? `Média: R$ ${(totalRevenue / totalDeliveries).toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Revenue bar chart */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Receita por Funcionário</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData.length > 0 ? revenueData : [{ name: '—', receita: 0, color: COLORS[0] }]} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="receita" name="Receita" radius={[8, 8, 0, 0]}>
                {(revenueData.length > 0 ? revenueData : [{ color: COLORS[0] }]).map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue pie chart */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">Distribuição de Receita</h3>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados financeiros no período</p>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={90}
                    paddingAngle={3} dataKey="receita"
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
                  <span className="font-bold">R$ {d.receita.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Individual employee details */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-semibold text-sm mb-4">💰 Ranking de Receita</h3>
        <div className="space-y-2">
          {[...revenueData].sort((a, b) => b.receita - a.receita).map((emp, i) => (
            <div key={emp.name} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <span className="text-lg font-bold w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: emp.color }}>
                {emp.name.charAt(0)}
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold">{emp.name}</span>
                <p className="text-xs text-muted-foreground">{emp.entregas} entrega(s)</p>
              </div>
              <span className="text-sm font-bold">R$ {emp.receita.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialCharts;
