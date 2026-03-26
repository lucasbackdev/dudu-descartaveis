import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Download, X, Share, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isIOSSafari = () => {
  const ua = navigator.userAgent;
  return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
};

const isIOSChrome = () => {
  return isIOS() && /CriOS/.test(navigator.userAgent);
};

const isInStandaloneMode = () => {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
};

const PWAInstallBanner = () => {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isiOSDevice, setIsiOSDevice] = useState(false);

  useEffect(() => {
    if (isIOS() && !isInStandaloneMode()) {
      setIsiOSDevice(true);
    }
  }, []);

  if (isInstalled || isInStandaloneMode() || dismissed) return null;

  // iOS: show custom banner with guide
  if (isiOSDevice) {
    return (
      <>
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-primary text-primary-foreground rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Download className="h-6 w-6 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Instalar Dudu Descartáveis</p>
            <p className="text-xs opacity-80">Adicione à tela de início</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowIOSGuide(true)}
            className="shrink-0 font-bold"
          >
            Como?
          </Button>
          <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center p-4" onClick={() => setShowIOSGuide(false)}>
            <div className="bg-card text-card-foreground rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Instalar no iPhone</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Toque no botão <strong>Compartilhar</strong></p>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      <Share className="h-5 w-5" />
                      <span className="text-xs">(ícone na barra do Safari)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Role e toque em <strong>"Adicionar à Tela de Início"</strong></p>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      <Plus className="h-5 w-5" />
                      <span className="text-xs">Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0">3</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Toque em <strong>"Adicionar"</strong></p>
                    <p className="text-xs text-muted-foreground mt-1">Pronto! O app aparecerá na sua tela inicial</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">Use o Safari para instalar. Não funciona no Chrome do iPhone.</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android/Chrome: show standard install banner
  if (!canInstall) return null;

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
