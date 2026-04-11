import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Delivery, EMPLOYEE_COLORS } from '@/lib/types';
import PerformanceCharts from '@/components/PerformanceCharts';
import LoadForecast from '@/components/LoadForecast';
import FinancialCharts from '@/components/FinancialCharts';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Package, LogOut, Users, Truck, CheckCircle2, Clock, MapPin,
  UserCheck, UserX, ChevronDown, ChevronRight, BarChart3, TrendingUp, UserPlus, RefreshCw, Trash2, BoxesIcon, Search,
  DollarSign, Settings, Save, Edit2, Bell, Palette, TruckIcon, MoreHorizontal, Database
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = 'dashboard' | 'deliveries' | 'employees' | 'performance' | 'stock' | 'financial' | 'forecast' | 'settings';

interface Product {
  id: string;
  code: string;
  name: string;
  stock: number;
  cost_price: number;
  sale_price: number;
}

const statusConfig = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'Em trânsito', icon: Truck, color: 'bg-foreground/10 text-foreground' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
};

// Mobile bottom nav: shows first 3 tabs + "More" button with popover for the rest
const BottomNav = ({ tabs, activeTab, onTabChange }: { 
  tabs: { key: Tab; label: string; icon: typeof BarChart3 }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) => {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const primaryTabs = tabs.slice(0, 3);
  const secondaryTabs = tabs.slice(3);
  const isSecondaryActive = secondaryTabs.some(t => t.key === activeTab);

  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-30">
      <div className="max-w-2xl mx-auto flex items-center">
        {primaryTabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { onTabChange(t.key); setShowMore(false); }}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                active ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{t.label}</span>
            </button>
          );
        })}

        <div className="relative flex-1" ref={moreRef}>
          <button
            onClick={() => setShowMore(!showMore)}
            className={`w-full flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
              isSecondaryActive || showMore ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isSecondaryActive ? 'bg-foreground text-background' : showMore ? 'bg-secondary' : 'bg-secondary/60'
            }`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span>Mais</span>
          </button>

          {showMore && (
            <div className="absolute bottom-full right-0 mb-2 mr-1 bg-card border border-border rounded-2xl shadow-2xl p-2 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 z-40">
              {secondaryTabs.map(t => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { onTabChange(t.key); setShowMore(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active ? 'bg-foreground text-background' : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: '', color: EMPLOYEE_COLORS[0] });
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ stock: string; cost_price: string; sale_price: string }>({ stock: '', cost_price: '', sale_price: '' });
  const [savingProduct, setSavingProduct] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', code: '', category: '', stock: '', cost_price: '', sale_price: '' });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [stockAlertThreshold, setStockAlertThreshold] = useState(30);
  const [notifyOnEmpty, setNotifyOnEmpty] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [dbSize, setDbSize] = useState<{ used_mb: number; limit_mb: number; percentage: number } | null>(null);

  const fetchDbSize = async () => {
    try {
      const { data, error } = await supabase.rpc('get_db_size_info');
      if (!error && data) {
        const info = typeof data === 'string' ? JSON.parse(data) : data;
        setDbSize({ used_mb: info.used_mb, limit_mb: info.limit_mb, percentage: info.percentage });
      }
    } catch (e) {
      console.error('Error fetching DB size:', e);
    }
  };

  const getNextAvailableColor = () => {
    const usedColors = employees.map(e => e.color).filter(Boolean);
    return EMPLOYEE_COLORS.find(c => !usedColors.includes(c)) || EMPLOYEE_COLORS[0];
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  const fetchData = async () => {
    const [{ data: profiles }, { data: dels }, { data: prods }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'employee'),
      supabase.from('deliveries').select('*, delivery_items(*)').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ]);
    setEmployees((profiles as Profile[]) || []);
    setDeliveries((dels as Delivery[]) || []);
    setProducts((prods as Product[]) || []);

    // Load settings
    const { data: settings } = await supabase.from('admin_settings').select('*').limit(1).single();
    if (settings) {
      setStockAlertThreshold((settings as any).stock_alert_threshold || 30);
      setNotifyOnEmpty((settings as any).notify_on_empty !== false);
    }

    // Check stock alerts
    checkStockAlerts(prods as Product[] || []);

    // Fetch DB size
    fetchDbSize();
  };

  const checkStockAlerts = (productList: Product[]) => {
    productList.forEach(p => {
      if (p.stock > 0 && p.stock <= stockAlertThreshold) {
        // Show in-app alert
      }
      if (notifyOnEmpty && p.stock === 0) {
        // Show in-app alert for empty
      }
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Send push notifications for low stock
    if ('Notification' in window && Notification.permission === 'granted') {
      const lowStock = productList.filter(p => p.stock > 0 && p.stock <= stockAlertThreshold);
      const emptyStock = productList.filter(p => p.stock === 0 && notifyOnEmpty);
      
      if (lowStock.length > 0) {
        new Notification('⚠️ Estoque Baixo', {
          body: `${lowStock.length} produto(s) com estoque baixo: ${lowStock.slice(0, 3).map(p => p.name).join(', ')}${lowStock.length > 3 ? '...' : ''}`,
          icon: '/lovable-uploads/ChatGPT_Image_25_de_mar._de_2025_10_05_44.png',
        });
      }
      if (emptyStock.length > 0) {
        new Notification('🚨 Estoque Esgotado', {
          body: `${emptyStock.length} produto(s) sem estoque: ${emptyStock.slice(0, 3).map(p => p.name).join(', ')}${emptyStock.length > 3 ? '...' : ''}`,
          icon: '/lovable-uploads/ChatGPT_Image_25_de_mar._de_2025_10_05_44.png',
        });
      }
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (userId: string) => {
    await supabase.from('profiles').update({ approved: true }).eq('id', userId);
    fetchData();
    toast.success('Funcionário aprovado!');
  };

  const handleReject = async (userId: string) => {
    await supabase.from('profiles').update({ approved: false }).eq('id', userId);
    fetchData();
    toast.success('Funcionário rejeitado.');
  };

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (newEmployee.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreating(true);
    const response = await supabase.functions.invoke('create-employee', {
      body: { 
        name: newEmployee.name, 
        email: newEmployee.email, 
        password: newEmployee.password,
        color: newEmployee.color,
      },
    });
    setCreating(false);

    if (response.error || response.data?.error) {
      toast.error(response.data?.error || response.error?.message || 'Erro ao criar funcionário');
      return;
    }

    toast.success(`Funcionário ${newEmployee.name} criado com sucesso!`);
    setNewEmployee({ name: '', email: '', password: '', color: getNextAvailableColor() });
    setShowCreateEmployee(false);
    fetchData();
  };

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a conta de ${employeeName}? Os dados de entrega serão mantidos.`)) return;
    
    setDeletingId(employeeId);
    const response = await supabase.functions.invoke('delete-employee', {
      body: { employee_id: employeeId },
    });
    setDeletingId(null);

    if (response.error || response.data?.error) {
      toast.error(response.data?.error || response.error?.message || 'Erro ao excluir funcionário');
      return;
    }

    toast.success(`Conta de ${employeeName} excluída com sucesso!`);
    fetchData();
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditValues({
      stock: String(product.stock),
      cost_price: String(product.cost_price),
      sale_price: String(product.sale_price),
    });
  };

  const saveProduct = async (productId: string) => {
    setSavingProduct(true);
    const { error } = await supabase.from('products').update({
      stock: parseInt(editValues.stock) || 0,
      cost_price: parseFloat(editValues.cost_price) || 0,
      sale_price: parseFloat(editValues.sale_price) || 0,
    }).eq('id', productId);
    setSavingProduct(false);

    if (error) {
      toast.error('Erro ao salvar produto');
      return;
    }

    setEditingProductId(null);
    toast.success('Produto atualizado!');
    fetchData();
  };

  const createProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    setCreatingProduct(true);
    const { error } = await supabase.from('products').insert({
      name: newProduct.name.trim(),
      code: newProduct.code.trim(),
      category: newProduct.category.trim(),
      stock: parseInt(newProduct.stock) || 0,
      cost_price: parseFloat(newProduct.cost_price) || 0,
      sale_price: parseFloat(newProduct.sale_price) || 0,
    });
    setCreatingProduct(false);
    if (error) {
      toast.error('Erro ao criar produto');
      return;
    }
    setNewProduct({ name: '', code: '', category: '', stock: '', cost_price: '', sale_price: '' });
    setShowCreateProduct(false);
    toast.success('Produto criado!');
    fetchData();
  };

  const saveSettings = async () => {
    setSavingSettings(true);

    // Upsert settings
    const { data: existing } = await supabase.from('admin_settings').select('id').limit(1).single();
    
    if (existing) {
      await supabase.from('admin_settings').update({
        stock_alert_threshold: stockAlertThreshold,
        notify_on_empty: notifyOnEmpty,
      }).eq('id', (existing as any).id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_settings').insert({
        user_id: user?.id || '',
        stock_alert_threshold: stockAlertThreshold,
        notify_on_empty: notifyOnEmpty,
      });
    }

    setSavingSettings(false);
    toast.success('Configurações salvas!');

    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const pendingApproval = employees.filter(u => !u.approved);
  const totalDelivered = deliveries.filter(d => d.status === 'delivered').length;
  const totalPending = deliveries.filter(d => d.status !== 'delivered').length;

  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= stockAlertThreshold);
  const emptyStockProducts = products.filter(p => p.stock === 0);

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'dashboard', label: 'Painel', icon: BarChart3 },
    { key: 'deliveries', label: 'Entregas', icon: Truck },
    { key: 'stock', label: 'Estoque', icon: BoxesIcon },
    { key: 'forecast', label: 'Previsão', icon: TruckIcon },
    { key: 'financial', label: 'Financeiro', icon: DollarSign },
    { key: 'performance', label: 'Desempenho', icon: TrendingUp },
    { key: 'employees', label: 'Equipe', icon: Users },
    { key: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <span className="font-bold text-sm">Dudu Descartáveis</span>
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">ADMIN</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} className="rounded-full">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout} className="rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {tab === 'dashboard' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Visão geral das operações</p>
            </div>

            {pendingApproval.length > 0 && (
              <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-2xl p-4 flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-[hsl(var(--warning))]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{pendingApproval.length} funcionário(s) aguardando aprovação</p>
                  <p className="text-xs text-muted-foreground">Vá até a aba Equipe para aprovar</p>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => setTab('employees')}>Ver</Button>
              </div>
            )}

            {lowStockProducts.length > 0 && (
              <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-2xl p-4 flex items-center gap-3">
                <Bell className="w-5 h-5 text-[hsl(var(--warning))]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{lowStockProducts.length} produto(s) com estoque baixo</p>
                  <p className="text-xs text-muted-foreground">{lowStockProducts.slice(0, 2).map(p => p.name).join(', ')}</p>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => setTab('stock')}>Ver</Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total de Entregas', value: deliveries.length, sub: 'registradas' },
                { label: 'Entregues', value: totalDelivered, sub: deliveries.length > 0 ? `${Math.round((totalDelivered / deliveries.length) * 100)}% concluído` : '0%' },
                { label: 'Pendentes', value: totalPending, sub: 'em andamento' },
                { label: 'Funcionários', value: employees.filter(u => u.approved).length, sub: 'ativos' },
              ].map(s => (
                <div key={s.label} className="bg-secondary rounded-2xl p-4">
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </div>
              ))}
            </div>

            <div>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Atividade Recente</h2>
              <div className="space-y-2">
                {deliveries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registrada ainda.</p>
                )}
                {deliveries.slice(0, 3).map(d => {
                  const config = statusConfig[d.status as keyof typeof statusConfig];
                  const StatusIcon = config.icon;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.client}</p>
                        <p className="text-xs text-muted-foreground">{d.employee_name} • {config.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'deliveries' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Todas as Entregas</h1>
              <p className="text-sm text-muted-foreground">{deliveries.length} entregas registradas</p>
            </div>

            {deliveries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega registrada ainda.</p>
            )}

            <div className="space-y-4">
              {Object.entries(
                deliveries.reduce<Record<string, Delivery[]>>((acc, d) => {
                  const name = d.employee_name || 'Sem nome';
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(d);
                  return acc;
                }, {})
              ).map(([employeeName, empDeliveries]) => {
                const isGroupExpanded = expandedGroups.includes(employeeName);
                const completed = empDeliveries.filter(d => d.status === 'delivered').length;

                return (
                  <div key={employeeName} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedGroups(prev =>
                        prev.includes(employeeName) ? prev.filter(n => n !== employeeName) : [...prev, employeeName]
                      )}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      {(() => {
                        const emp = employees.find(e => e.name === employeeName);
                        return emp?.avatar_url ? (
                          <img src={emp.avatar_url} alt={employeeName} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                            {employeeName.charAt(0)}
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{employeeName}</p>
                        <p className="text-xs text-muted-foreground">{empDeliveries.length} entrega(s) • {completed} entregue(s)</p>
                      </div>
                      {isGroupExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {isGroupExpanded && (
                      <div className="px-3 pb-3 space-y-2">
                        {empDeliveries.map(delivery => {
                          const expanded = expandedId === delivery.id;
                          const config = statusConfig[delivery.status as keyof typeof statusConfig];
                          const StatusIcon = config.icon;

                          return (
                            <div key={delivery.id} className="bg-secondary rounded-xl overflow-hidden">
                              <button
                                onClick={() => setExpandedId(expanded ? null : delivery.id)}
                                className="w-full p-3 flex items-center gap-3 text-left"
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                                  <StatusIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{delivery.client}</p>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <p className="text-xs truncate">{delivery.address}</p>
                                  </div>
                                </div>
                                {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              </button>

                              {expanded && (
                                <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-3">
                                  <span className={`text-xs font-semibold rounded-full px-3 py-1 ${config.color}`}>
                                    {config.label}
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Itens</p>
                                    {delivery.delivery_items?.map((item: any) => (
                                      <div key={item.id} className="flex justify-between text-sm py-0.5">
                                        <span>{item.name}</span>
                                        <span className="font-semibold text-muted-foreground">
                                          x{item.quantity}
                                          {item.sale_price > 0 && (
                                            <span className="ml-2 text-foreground">R$ {(Number(item.sale_price) * item.quantity).toFixed(2)}</span>
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  {delivery.notes && (
                                    <div className="bg-background rounded-lg p-2">
                                      <p className="text-xs text-muted-foreground">📝 {delivery.notes}</p>
                                    </div>
                                  )}
                                  {delivery.payment_method && (
                                    <div className="bg-background rounded-lg p-2">
                                      <p className="text-xs font-medium">
                                        💳 Pagamento: {delivery.payment_method === 'dinheiro' ? 'Dinheiro' : delivery.payment_method === 'cartao' ? 'Cartão' : delivery.payment_method === 'prazo' ? 'A Prazo' : delivery.payment_method === 'boleto' ? 'Boleto' : 'PIX'}
                                      </p>
                                      {(delivery.payment_method === 'prazo' || delivery.payment_method === 'boleto') && delivery.payment_due_date && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          📅 Vencimento: {new Date(delivery.payment_due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'stock' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Estoque</h1>
              <p className="text-sm text-muted-foreground">{products.length} produtos cadastrados</p>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar produto..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="h-11 rounded-full pl-10 bg-secondary border-0"
              />
            </div>

            <Button
              onClick={() => setShowCreateProduct(!showCreateProduct)}
              className="w-full rounded-full h-11"
              variant={showCreateProduct ? 'outline' : 'default'}
            >
              <Package className="w-4 h-4 mr-2" />
              {showCreateProduct ? 'Cancelar' : 'Novo Produto'}
            </Button>

            {showCreateProduct && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold">Cadastrar novo produto</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do produto *"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    className="h-10 rounded-lg bg-secondary border-0 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Código"
                      value={newProduct.code}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, code: e.target.value }))}
                      className="h-10 rounded-lg bg-secondary border-0 text-sm"
                    />
                    <Input
                      placeholder="Categoria"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                      className="h-10 rounded-lg bg-secondary border-0 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Estoque</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                        className="h-9 rounded-lg bg-secondary border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Custo (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newProduct.cost_price}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, cost_price: e.target.value }))}
                        className="h-9 rounded-lg bg-secondary border-0 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Venda (R$)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newProduct.sale_price}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, sale_price: e.target.value }))}
                        className="h-9 rounded-lg bg-secondary border-0 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={createProduct} disabled={creatingProduct} className="w-full rounded-full h-10">
                  <Save className="w-4 h-4 mr-2" />
                  {creatingProduct ? 'Criando...' : 'Criar Produto'}
                </Button>
              </div>
            )}

            {emptyStockProducts.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-3">
                <p className="text-xs font-semibold text-destructive">{emptyStockProducts.length} produto(s) sem estoque</p>
              </div>
            )}

            <div className="space-y-2">
              {products
                .filter(p => p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.includes(stockSearch))
                .map(product => {
                  const isEditing = editingProductId === product.id;
                  const isLowStock = product.stock > 0 && product.stock <= stockAlertThreshold;

                  return (
                    <div key={product.id} className={`bg-card border rounded-2xl p-3 ${isLowStock ? 'border-[hsl(var(--warning))]/50' : product.stock === 0 ? 'border-destructive/50' : 'border-border'}`}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">Cód: {product.code}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground">Estoque</label>
                              <Input
                                type="number"
                                value={editValues.stock}
                                onChange={(e) => setEditValues(prev => ({ ...prev, stock: e.target.value }))}
                                className="h-9 rounded-lg bg-secondary border-0 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Custo (R$)</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.cost_price}
                                onChange={(e) => setEditValues(prev => ({ ...prev, cost_price: e.target.value }))}
                                className="h-9 rounded-lg bg-secondary border-0 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Venda (R$)</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editValues.sale_price}
                                onChange={(e) => setEditValues(prev => ({ ...prev, sale_price: e.target.value }))}
                                className="h-9 rounded-lg bg-secondary border-0 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveProduct(product.id)} disabled={savingProduct} className="flex-1 rounded-full h-9">
                              <Save className="w-3 h-3 mr-1" /> {savingProduct ? 'Salvando...' : 'Salvar'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingProductId(null)} className="rounded-full h-9">
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Cód: {product.code}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold ${product.stock <= 0 ? 'text-destructive' : isLowStock ? 'text-[hsl(var(--warning))]' : 'text-foreground'}`}>
                              {product.stock} un
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              C: R${Number(product.cost_price).toFixed(2)} | V: R${Number(product.sale_price).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => startEditProduct(product)}
                            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {tab === 'financial' && (
          <FinancialCharts deliveries={deliveries} employees={employees} />
        )}

        {tab === 'performance' && (
          <PerformanceCharts deliveries={deliveries} employees={employees} />
        )}

        {tab === 'forecast' && (
          <LoadForecast deliveries={deliveries} employees={employees} />
        )}

        {tab === 'settings' && (
          <>
            <div>
              <h1 className="text-xl font-bold">Configurações</h1>
              <p className="text-sm text-muted-foreground">Preferências do sistema</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Notificações de Estoque</h3>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Notificar quando estoque atingir (%)</label>
                <div className="flex items-center gap-3 mt-1">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={stockAlertThreshold}
                    onChange={(e) => setStockAlertThreshold(parseInt(e.target.value) || 30)}
                    className="h-11 rounded-full px-5 bg-secondary border-0 w-24"
                  />
                  <span className="text-sm text-muted-foreground">unidades restantes</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Notificar quando esgotar</p>
                  <p className="text-xs text-muted-foreground">Receber alerta quando estoque chegar a zero</p>
                </div>
                <button
                  onClick={() => setNotifyOnEmpty(!notifyOnEmpty)}
                  className={`w-12 h-7 rounded-full transition-colors ${notifyOnEmpty ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${notifyOnEmpty ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings} className="w-full rounded-full h-11">
                <Save className="w-4 h-4 mr-2" />
                {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
              </Button>

              {'Notification' in window && Notification.permission !== 'granted' && (
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Para receber notificações push, permita as notificações no navegador.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => Notification.requestPermission()}
                  >
                    Permitir Notificações
                  </Button>
                </div>
              )}
            </div>

            {/* Database Consumption */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Consumo de Banco de Dados</h3>
              </div>

              {dbSize ? (
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Usado', value: dbSize.used_mb },
                            { name: 'Livre', value: Math.max(0, dbSize.limit_mb - dbSize.used_mb) },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          <Cell fill={dbSize.percentage > 80 ? 'hsl(0, 70%, 50%)' : dbSize.percentage > 50 ? 'hsl(40, 80%, 50%)' : 'hsl(142, 70%, 45%)'} />
                          <Cell fill="hsl(var(--muted))" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold">{dbSize.percentage}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Usado</p>
                      <p className="text-lg font-bold">{dbSize.used_mb} MB</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground"><p className="text-xs text-muted-foreground">Limite</p></p>
                      <p className="text-sm font-medium">{dbSize.limit_mb} MB</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Disponível</p>
                      <p className="text-sm font-medium text-[hsl(142,70%,45%)]">{(dbSize.limit_mb - dbSize.used_mb).toFixed(1)} MB</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full rounded-full" onClick={fetchDbSize}>
                <RefreshCw className="w-4 h-4 mr-2" /> Atualizar Consumo
              </Button>
            </div>
          </>
        )}

        {tab === 'employees' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">Gestão de Equipe</h1>
                <p className="text-sm text-muted-foreground">{employees.length} funcionário(s)</p>
              </div>
              <Button onClick={() => setShowCreateEmployee(!showCreateEmployee)} className="rounded-full" size="sm">
                <UserPlus className="w-4 h-4 mr-1" /> Novo
              </Button>
            </div>

            {showCreateEmployee && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">Cadastrar Funcionário</h3>
                <Input
                  placeholder="Nome completo"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 rounded-full px-5 bg-secondary border-0"
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11 rounded-full px-5 bg-secondary border-0"
                />
                <Input
                  placeholder="Senha (mín. 6 caracteres)"
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                  className="h-11 rounded-full px-5 bg-secondary border-0"
                />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground">Cor do funcionário nos gráficos</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-secondary rounded-xl">
                    {EMPLOYEE_COLORS.filter(c => !employees.map(e => e.color).includes(c)).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewEmployee(prev => ({ ...prev, color }))}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          newEmployee.color === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateEmployee} disabled={creating} className="flex-1 rounded-full h-11">
                    {creating ? 'Criando...' : 'Criar Funcionário'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateEmployee(false)} className="rounded-full h-11">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {pendingApproval.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Aguardando Aprovação</h2>
                {pendingApproval.map(user => (
                  <div key={user.id} className="bg-card border-2 border-[hsl(var(--warning))]/30 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleApprove(user.id)} className="flex-1 rounded-full h-10">
                        <UserCheck className="w-4 h-4 mr-1" /> Aprovar
                      </Button>
                      <Button onClick={() => handleReject(user.id)} variant="outline" className="flex-1 rounded-full h-10">
                        <UserX className="w-4 h-4 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Funcionários Ativos</h2>
              {employees.filter(u => u.approved).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum funcionário cadastrado ainda.</p>
              )}
              {employees.filter(u => u.approved).map(user => {
                const userDeliveries = deliveries.filter(d => d.employee_id === user.id);
                const completed = userDeliveries.filter(d => d.status === 'delivered').length;
                return (
                  <div key={user.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-lg font-bold">{completed}/{userDeliveries.length}</p>
                          <p className="text-[10px] text-muted-foreground">entregas</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEmployee(user.id, user.name)}
                          disabled={deletingId === user.id}
                          className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Excluir conta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNav tabs={tabs} activeTab={tab} onTabChange={setTab} />
    </div>
  );
};

export default AdminDashboard;
