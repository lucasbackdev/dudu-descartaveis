import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, BluetoothSearching, Loader2, CheckCircle2, XCircle, Printer, Smartphone, X } from 'lucide-react';

type ConnectionStep = 'idle' | 'scanning' | 'selected' | 'connecting' | 'sending' | 'done' | 'error';

interface BluetoothPrinterModalProps {
  open: boolean;
  onClose: () => void;
  onPrint: (device: BluetoothDevice) => Promise<void>;
}

interface FoundDevice {
  device: BluetoothDevice;
  name: string;
}

const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const BluetoothPrinterModal = ({ open, onClose, onPrint }: BluetoothPrinterModalProps) => {
  const [step, setStep] = useState<ConnectionStep>('idle');
  const [selectedDevice, setSelectedDevice] = useState<FoundDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<FoundDevice[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingPaired, setLoadingPaired] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('idle');
      setSelectedDevice(null);
      setErrorMsg('');
      loadPairedDevices();
    }
  }, [open]);

  const loadPairedDevices = async () => {
    try {
      const nav = navigator as any;
      if (nav.bluetooth?.getDevices) {
        setLoadingPaired(true);
        const devices = await nav.bluetooth.getDevices();
        const found: FoundDevice[] = devices
          .filter((d: any) => d.name)
          .map((d: any) => ({ device: d, name: d.name || 'Desconhecido' }));
        setPairedDevices(found);
        setLoadingPaired(false);
      }
    } catch {
      setLoadingPaired(false);
    }
  };

  const scanForDevice = async () => {
    setStep('scanning');
    setErrorMsg('');
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        throw new Error('Bluetooth não suportado');
      }

      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      const found: FoundDevice = {
        device,
        name: device.name || `Dispositivo ${device.id?.slice(0, 8)}`,
      };
      setSelectedDevice(found);
      setStep('selected');
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        setStep('idle');
      } else {
        setErrorMsg(err.message || 'Erro ao buscar dispositivos');
        setStep('error');
      }
    }
  };

  const connectAndPrint = async () => {
    if (!selectedDevice) return;
    setStep('connecting');
    try {
      setStep('sending');
      await onPrint(selectedDevice.device);
      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao imprimir');
      setStep('error');
    }
  };

  const selectPairedDevice = (dev: FoundDevice) => {
    setSelectedDevice(dev);
    setStep('selected');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bluetooth className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Impressora Bluetooth</h3>
            <p className="text-xs text-muted-foreground">Conecte à sua impressora térmica</p>
          </div>
        </div>

        {/* Content based on step */}
        {step === 'idle' && (
          <div className="space-y-4">
            {/* Previously paired devices */}
            {pairedDevices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dispositivos pareados</p>
                <div className="space-y-1.5">
                  {pairedDevices.map((dev, i) => (
                    <button
                      key={i}
                      onClick={() => selectPairedDevice(dev)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
                    >
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">{dev.name}</span>
                      <Printer className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingPaired && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando dispositivos pareados...
              </div>
            )}

            <Button
              onClick={scanForDevice}
              className="w-full rounded-full h-12 gap-2 text-base"
            >
              <BluetoothSearching className="w-5 h-5" />
              Buscar Dispositivos
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Certifique-se que a impressora está ligada e com Bluetooth ativado
            </p>
          </div>
        )}

        {step === 'scanning' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <BluetoothSearching className="w-10 h-10 text-primary animate-pulse" />
              </div>
              {/* Scanning rings */}
              <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute -inset-3 w-26 h-26 rounded-full border border-primary/15 animate-ping" style={{ animationDelay: '0.5s' }} />
            </div>
            <p className="text-sm font-medium">Buscando dispositivos...</p>
            <p className="text-xs text-muted-foreground">
              Selecione o dispositivo no diálogo do navegador
            </p>
          </div>
        )}

        {step === 'selected' && selectedDevice && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Bluetooth className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{selectedDevice.name}</p>
                <p className="text-xs text-muted-foreground">Dispositivo selecionado</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={scanForDevice}
                className="flex-1 rounded-full h-11"
              >
                Trocar
              </Button>
              <Button
                onClick={connectAndPrint}
                className="flex-1 rounded-full h-11 gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          </div>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm font-medium">Conectando ao dispositivo...</p>
            {selectedDevice && (
              <p className="text-xs text-muted-foreground">{selectedDevice.name}</p>
            )}
          </div>
        )}

        {step === 'sending' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Printer className="w-12 h-12 text-primary" />
              <Loader2 className="w-6 h-6 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <p className="text-sm font-medium">Enviando dados para impressora...</p>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-[hsl(var(--success))]" />
            </div>
            <p className="text-sm font-semibold">Nota impressa com sucesso!</p>
            <Button onClick={onClose} className="rounded-full h-11 px-8">
              Fechar
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-sm font-semibold">Erro na impressão</p>
            <p className="text-xs text-muted-foreground text-center">{errorMsg}</p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={onClose} className="flex-1 rounded-full h-11">
                Cancelar
              </Button>
              <Button onClick={scanForDevice} className="flex-1 rounded-full h-11">
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BluetoothPrinterModal;
