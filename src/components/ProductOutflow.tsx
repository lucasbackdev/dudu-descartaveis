import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, PackageMinus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ExcelJS from 'exceljs';
import { toast } from 'sonner';
import type { Delivery } from '@/lib/types';

type Preset = 'today' | '2d' | '7d' | '15d' | '30d' | 'custom';

interface Props {
  deliveries: Delivery[];
}

const presets: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '2d', label: '2 dias' },
  { key: '7d', label: '7 dias' },
  { key: '15d', label: '15 dias' },
  { key: '30d', label: '1 mês' },
  { key: 'custom', label: 'Personalizado' },
];

const ProductOutflow = ({ deliveries }: Props) => {
  const [preset, setPreset] = useState<Preset>('7d');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [search, setSearch] = useState('');

  const { start, end } = useMemo(() => {
    const now = new Date();
    const e = new Date(now);
    e.setHours(23, 59, 59, 999);
    const s = new Date(now);
    s.setHours(0, 0, 0, 0);
    switch (preset) {
      case 'today':
        return { start: s, end: e };
      case '2d':
        s.setDate(s.getDate() - 1);
        return { start: s, end: e };
      case '7d':
        s.setDate(s.getDate() - 6);
        return { start: s, end: e };
      case '15d':
        s.setDate(s.getDate() - 14);
        return { start: s, end: e };
      case '30d':
        s.setDate(s.getDate() - 29);
        return { start: s, end: e };
      case 'custom': {
        const cs = from ? new Date(from) : s;
        cs.setHours(0, 0, 0, 0);
        const ce = to ? new Date(to) : e;
        ce.setHours(23, 59, 59, 999);
        return { start: cs, end: ce };
      }
    }
  }, [preset, from, to]);

  const aggregated = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; total: number }>();
    for (const d of deliveries) {
      const dateStr = d.completed_at || d.created_at;
      if (!dateStr) continue;
      const dt = new Date(dateStr);
      if (dt < start || dt > end) continue;
      for (const it of d.delivery_items || []) {
        const key = it.name.trim().toLowerCase();
        const prev = map.get(key) || { name: it.name, quantity: 0, total: 0 };
        prev.quantity += it.quantity;
        prev.total += (Number(it.sale_price) || 0) * it.quantity;
        map.set(key, prev);
      }
    }
    let arr = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    return arr;
  }, [deliveries, start, end, search]);

  const totalQty = aggregated.reduce((s, p) => s + p.quantity, 0);
  const totalValue = aggregated.reduce((s, p) => s + p.total, 0);

  const handleExport = async () => {
    if (aggregated.length === 0) {
      toast.error('Nenhuma saída para exportar');
      return;
    }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Saídas');
    ws.columns = [
      { header: 'Produto', key: 'name', width: 40 },
      { header: 'Quantidade', key: 'qty', width: 14 },
      { header: 'Valor Total', key: 'total', width: 16 },
    ];
    aggregated.forEach(p => ws.addRow({ name: p.name, qty: p.quantity, total: Number(p.total.toFixed(2)) }));
    ws.addRow({});
    ws.addRow({ name: 'TOTAL', qty: totalQty, total: Number(totalValue.toFixed(2)) }).font = { bold: true };
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saidas_${format(start, 'yyyy-MM-dd')}_a_${format(end, 'yyyy-MM-dd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Planilha exportada!');
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto px-4 pt-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PackageMinus className="w-5 h-5" />
            Saídas de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={preset === p.key ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('rounded-full', !from && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {from ? format(from, 'dd/MM/yyyy', { locale: ptBR }) : 'Data inicial'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('rounded-full', !to && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {to ? format(to, 'dd/MM/yyyy', { locale: ptBR }) : 'Data final'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Período: {format(start, 'dd/MM/yyyy', { locale: ptBR })} — {format(end, 'dd/MM/yyyy', { locale: ptBR })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-secondary p-3">
              <div className="text-xs text-muted-foreground">Total de itens</div>
              <div className="text-xl font-bold">{totalQty}</div>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <div className="text-xs text-muted-foreground">Valor total</div>
              <div className="text-xl font-bold">R$ {totalValue.toFixed(2)}</div>
            </div>
          </div>

          <Button onClick={handleExport} className="w-full rounded-full" variant="default">
            <Download className="w-4 h-4 mr-2" />
            Baixar Planilha (Excel)
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {aggregated.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma saída no período</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregated.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right font-bold">{p.quantity}</TableCell>
                    <TableCell className="text-right">R$ {p.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductOutflow;
