import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  razao_social: string;
  cnpj_cpf: string;
  telefone: string;
}

interface ClientPickerProps {
  value: string;
  onChange: (name: string) => void;
}

const ClientPicker = ({ value, onChange }: ClientPickerProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) {
      supabase.from('clients').select('id, name, razao_social, cnpj_cpf, telefone').order('name').then(({ data }) => {
        setClients((data as Client[]) || []);
        setLoaded(true);
      });
    }
  }, [loaded]);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj_cpf.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const handleAddNew = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('clients').insert({ name: newName.trim() }).select().single();
    setSaving(false);
    if (error) {
      toast.error('Erro ao cadastrar cliente');
      return;
    }
    setClients(prev => [...prev, data as Client].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(newName.trim());
    setSearch(newName.trim());
    setShowNewForm(false);
    setShowDropdown(false);
    setNewName('');
    toast.success('Cliente cadastrado!');
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setShowDropdown(true)}
          className="h-11 rounded-full pl-9 pr-8 bg-secondary border-0 w-full"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); onChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {showDropdown && search.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum cliente encontrado</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c.name);
                  setSearch(c.name);
                  setShowDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-secondary transition-colors text-sm"
              >
                <span className="block break-words leading-snug font-medium">{c.name}</span>
                {c.cnpj_cpf && c.cnpj_cpf !== '---' && (
                  <span className="text-[10px] text-muted-foreground">CNPJ/CPF: {c.cnpj_cpf}</span>
                )}
              </button>
            ))
          )}
          <div className="border-t border-border p-2">
            {showNewForm ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do novo cliente"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9 rounded-full px-3 bg-secondary border-0 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                />
                <Button size="sm" onClick={handleAddNew} disabled={saving} className="rounded-full h-9 text-xs">
                  {saving ? '...' : 'Salvar'}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setShowNewForm(true); setNewName(search); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-secondary rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Cadastrar novo cliente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPicker;
