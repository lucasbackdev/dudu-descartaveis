import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const PWAInstallBanner = () => {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary text-primary-foreground rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <Download className="h-6 w-6 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Instalar Dudu Descartáveis</p>
        <p className="text-xs opacity-80">Acesse como um app no seu celular</p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={install}
        className="shrink-0 font-bold"
      >
        Instalar
      </Button>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PWAInstallBanner;
