import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Search, X } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
}

interface ProductPickerProps {
  value: string;
  onChange: (name: string) => void;
}

const ProductPicker = ({ value, onChange }: ProductPickerProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loaded) {
      supabase.from('products').select('id, code, name').order('name').then(({ data }) => {
        setProducts((data as Product[]) || []);
        setLoaded(true);
      });
    }
  }, [loaded]);

  useEffect(() => { setSearch(value); }, [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0 w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setShowDropdown(true)}
          className="h-10 rounded-full pl-9 pr-8 bg-secondary border-0 w-full"
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
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum produto encontrado</p>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  onChange(p.name);
                  setSearch(p.name);
                  setShowDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-secondary transition-colors text-sm"
              >
                <span className="block break-words leading-snug">{p.name}</span>
                <span className="text-[10px] text-muted-foreground">Cód: {p.code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProductPicker;
