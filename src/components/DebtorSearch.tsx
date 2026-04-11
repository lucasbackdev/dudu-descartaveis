import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DebtorDelivery {
  id: string;
  client: string;
  address: string;
  payment_method: string;
  payment_due_date: string;
  completed_at: string;
}

const DebtorSearch = ({ employeeId }: { employeeId: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [debtors, setDebtors] = useState<DebtorDelivery[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadDebtors = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data } = await supabase
      .from('deliveries')
      .select('id, client, address, payment_method, payment_due_date, completed_at')
      .eq('employee_id', employeeId)
      .eq('status', 'delivered')
      .in('payment_method', ['prazo', 'boleto'])
      .lte('payment_due_date', new Date().toISOString().split('T')[0])
      .order('payment_due_date', { ascending: true });

    setDebtors((data as DebtorDelivery[]) || []);
    setLoaded(true);
  };

  const handleToggle = () => {
    if (!expanded && !loaded) loadDebtors();
    setExpanded(!expanded);
  };

  const filtered = debtors.filter(d =>
    d.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-destructive/10 text-destructive">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Clientes com pagamento vencido</p>
          <p className="text-xs text-muted-foreground">Prazo e boleto com data vencida</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-full pl-9 bg-secondary border-0"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {loaded ? 'Nenhum cliente com pagamento vencido' : 'Carregando...'}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filtered.map(d => (
                <div key={d.id} className="bg-secondary rounded-xl p-3 space-y-1">
                  <p className="text-sm font-semibold">{d.client}</p>
                  <p className="text-xs text-muted-foreground">{d.address}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-destructive font-medium">
                      📅 Venceu: {new Date(d.payment_due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-muted-foreground">
                      {d.payment_method === 'boleto' ? 'Boleto' : 'A Prazo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={loadDebtors} className="rounded-full text-xs w-full">
            Atualizar lista
          </Button>
        </div>
      )}
    </div>
  );
};

export default DebtorSearch;
