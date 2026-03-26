import { useState, useMemo } from 'react';
import { Profile, Delivery } from '@/lib/types';
import { TruckIcon, ChevronDown, ChevronRight, Calendar, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadForecastProps {
  deliveries: Delivery[];
  employees: Profile[];
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const LoadForecast = ({ deliveries, employees }: LoadForecastProps) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDay();

  const [selectedDay, setSelectedDay] = useState<number>(tomorrowDay);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [expandedEmployees, setExpandedEmployees] = useState<string[]>([]);
  const [weeksToConsider, setWeeksToConsider] = useState<number>(4);

  const activeEmployees = employees.filter(e => e.approved);

  // Calculate averages from completed deliveries
  const forecast = useMemo(() => {
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered' && d.completed_at);

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeksToConsider * 7));

    const relevantDeliveries = completedDeliveries.filter(d => {
      const date = new Date(d.completed_at!);
      return date >= cutoffDate;
    });

    // Group: employee -> dayOfWeek -> product -> quantities[]
    const data: Record<string, Record<number, Record<string, number[]>>> = {};

    relevantDeliveries.forEach(d => {
      const dayOfWeek = new Date(d.completed_at!).getDay();
      const empId = d.employee_id;

      if (!data[empId]) data[empId] = {};
      if (!data[empId][dayOfWeek]) data[empId][dayOfWeek] = {};

      d.delivery_items?.forEach(item => {
        const productName = item.name;
        if (!data[empId][dayOfWeek][productName]) data[empId][dayOfWeek][productName] = [];
        data[empId][dayOfWeek][productName].push(item.quantity);
      });
    });

    // Count weeks per employee per day to calculate proper averages
    const weekCounts: Record<string, Record<number, number>> = {};
    relevantDeliveries.forEach(d => {
      const date = new Date(d.completed_at!);
      const dayOfWeek = date.getDay();
      const empId = d.employee_id;
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;

      if (!weekCounts[empId]) weekCounts[empId] = {};
      if (!weekCounts[`${empId}-${dayOfWeek}-weeks`]) weekCounts[`${empId}-${dayOfWeek}-weeks`] = {};
      (weekCounts[`${empId}-${dayOfWeek}-weeks`] as any)[weekKey] = true;
    });

    // Calculate averages
    const result: Record<string, { product: string; avg: number; total: number; occurrences: number }[]> = {};

    Object.entries(data).forEach(([empId, days]) => {
      if (!days[selectedDay]) return;

      const products = days[selectedDay];
      const weekSet = weekCounts[`${empId}-${selectedDay}-weeks`] as any;
      const numWeeks = weekSet ? Object.keys(weekSet).length : 1;

      result[empId] = Object.entries(products)
        .map(([product, quantities]) => {
          const total = quantities.reduce((a, b) => a + b, 0);
          return {
            product,
            avg: Math.ceil(total / numWeeks), // round up to avoid shortage
            total,
            occurrences: quantities.length,
          };
        })
        .sort((a, b) => b.avg - a.avg);
    });

    return result;
  }, [deliveries, selectedDay, weeksToConsider]);

  const toggleEmployee = (id: string) => {
    setExpandedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const filteredEmployees = selectedEmployee === 'all'
    ? activeEmployees
    : activeEmployees.filter(e => e.id === selectedEmployee);

  // Total products across all employees for the selected day
  const totalProducts = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredEmployees.forEach(emp => {
      forecast[emp.id]?.forEach(item => {
        totals[item.product] = (totals[item.product] || 0) + item.avg;
      });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [forecast, filteredEmployees]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TruckIcon className="w-5 h-5" />
          Previsão de Carga
        </h1>
        <p className="text-sm text-muted-foreground">
          Quantidade sugerida de produtos por funcionário baseada nas médias de vendas
        </p>
      </div>

      {/* Day selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dia da semana</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {DAY_SHORT.map((name, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedDay === i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {name}
              {i === tomorrowDay && <span className="ml-1 text-[9px] opacity-70">amanhã</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Weeks range */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Considerar últimas</span>
        {[2, 4, 8, 12].map(w => (
          <button
            key={w}
            onClick={() => setWeeksToConsider(w)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              weeksToConsider === w
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {w} sem
          </button>
        ))}
      </div>

      {/* Employee filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funcionário</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedEmployee('all')}
            className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedEmployee === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            Todos
          </button>
          {activeEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployee(emp.id)}
              className={`px-3 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                selectedEmployee === emp.id
                  ? 'text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
              style={selectedEmployee === emp.id ? { backgroundColor: emp.color || 'hsl(var(--primary))' } : {}}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: emp.color || '#3B82F6' }}
              />
              {emp.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Total summary */}
      {totalProducts.length > 0 && selectedEmployee === 'all' && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Total para {DAY_NAMES[selectedDay]}</h3>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {totalProducts.map(([product, qty]) => (
              <div key={product} className="flex justify-between items-center py-1 px-2 rounded-lg hover:bg-primary/5">
                <span className="text-sm">{product}</span>
                <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {qty} un
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per employee breakdown */}
      <div className="space-y-3">
        {filteredEmployees.map(emp => {
          const empForecast = forecast[emp.id] || [];
          const isExpanded = expandedEmployees.includes(emp.id) || selectedEmployee !== 'all';
          const hasData = empForecast.length > 0;

          return (
            <div key={emp.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleEmployee(emp.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: emp.color || '#3B82F6' }}
                >
                  {emp.avatar_url ? (
                    <img src={emp.avatar_url} alt={emp.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    emp.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {hasData
                      ? `${empForecast.length} produto(s) • ${DAY_NAMES[selectedDay]}`
                      : `Sem dados para ${DAY_NAMES[selectedDay]}`
                    }
                  </p>
                </div>
                {hasData && (
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-lg font-bold">{empForecast.reduce((a, b) => a + b.avg, 0)}</p>
                    <p className="text-[10px] text-muted-foreground">itens total</p>
                  </div>
                )}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isExpanded && hasData && (
                <div className="px-4 pb-4 space-y-1 border-t border-border/50 pt-3">
                  <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                    <span>Produto</span>
                    <span>Qtd sugerida</span>
                  </div>
                  {empForecast.map(item => (
                    <div key={item.product} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-secondary">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.product}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Média: {(item.total / item.occurrences).toFixed(1)} • {item.occurrences} entrega(s)
                        </p>
                      </div>
                      <span
                        className="text-sm font-bold px-3 py-1 rounded-full shrink-0 ml-2"
                        style={{ 
                          backgroundColor: `${emp.color || '#3B82F6'}20`,
                          color: emp.color || '#3B82F6'
                        }}
                      >
                        {item.avg} un
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {isExpanded && !hasData && (
                <div className="px-4 pb-4 border-t border-border/50 pt-3">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma entrega concluída neste dia da semana nas últimas {weeksToConsider} semanas.
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {activeEmployees.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum funcionário ativo cadastrado.</p>
        )}
      </div>
    </div>
  );
};

export default LoadForecast;
