import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, BluetoothSearching, Loader2, CheckCircle2, XCircle, Printer, Smartphone, X, Radio } from 'lucide-react';
import { isNativeApp, initBle, scanDevices, stopScan as nativeStopScan, NativeBleDevice } from '@/lib/nativeBluetooth';

type ConnectionStep = 'idle' | 'scanning' | 'selected' | 'connecting' | 'sending' | 'done' | 'error';

interface BluetoothPrinterModalProps {
  open: boolean;
  onClose: () => void;
  onPrint: (device: any) => Promise<void>;
}

interface FoundDevice {
  id: string;
  name: string;
  device: any;
  rssi?: number;
  isNative?: boolean;
}

const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
];

const BluetoothPrinterModal = ({ open, onClose, onPrint }: BluetoothPrinterModalProps) => {
  const [step, setStep] = useState<ConnectionStep>('idle');
  const [selectedDevice, setSelectedDevice] = useState<FoundDevice | null>(null);
  const [devices, setDevices] = useState<FoundDevice[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanning, setScanning] = useState(false);
  const scanRef = useRef<any>(null);
  const devicesRef = useRef<FoundDevice[]>([]);
  const isNative = isNativeApp();

  useEffect(() => {
    if (open) {
      setStep('idle');
      setSelectedDevice(null);
      setErrorMsg('');
      setDevices([]);
      devicesRef.current = [];
    } else {
      handleStopScan();
    }
  }, [open]);

  const handleStopScan = useCallback(() => {
    if (isNative) {
      nativeStopScan();
    } else if (scanRef.current) {
      try { scanRef.current.stop(); } catch {}
      scanRef.current = null;
    }
    setScanning(false);
  }, [isNative]);

  const handleAdvertisement = useCallback((event: any) => {
    const dev = event.device;
    const id = dev.id || dev.name || `unknown-${Math.random()}`;
    const name = dev.name || `Dispositivo ${id.slice(0, 8)}`;
    
    const exists = devicesRef.current.find(d => d.id === id);
    if (!exists) {
      const newDev: FoundDevice = { id, name, device: dev, rssi: event.rssi };
      devicesRef.current = [...devicesRef.current, newDev];
      setDevices([...devicesRef.current]);
    }
  }, []);

  const startNativeScan = async () => {
    setStep('scanning');
    setScanning(true);
    setDevices([]);
    devicesRef.current = [];
    setErrorMsg('');

    try {
      await initBle();
      await scanDevices((device: NativeBleDevice) => {
        const exists = devicesRef.current.find(d => d.id === device.deviceId);
        if (!exists) {
          const newDev: FoundDevice = {
            id: device.deviceId,
            name: device.name,
            device: { deviceId: device.deviceId },
            rssi: device.rssi,
            isNative: true,
          };
          devicesRef.current = [...devicesRef.current, newDev];
          setDevices([...devicesRef.current]);
        }
      }, 20000);

      setTimeout(() => setScanning(false), 20000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao buscar dispositivos Bluetooth');
      setStep('error');
      setScanning(false);
    }
  };

  const startWebScan = async () => {
    setStep('scanning');
    setScanning(true);
    setDevices([]);
    devicesRef.current = [];
    setErrorMsg('');

    const nav = navigator as any;
    if (!nav.bluetooth) {
      setErrorMsg('Bluetooth não suportado neste navegador. Use Chrome no Android ou instale o app nativo.');
      setStep('error');
      return;
    }

    // Try experimental requestLEScan first
    if (nav.bluetooth.requestLEScan) {
      try {
        const scan = await nav.bluetooth.requestLEScan({ acceptAllAdvertisements: true });
        scanRef.current = scan;
        nav.bluetooth.addEventListener('advertisementreceived', handleAdvertisement);
        setTimeout(() => {
          handleStopScan();
          nav.bluetooth.removeEventListener('advertisementreceived', handleAdvertisement);
        }, 30000);
        return;
      } catch (err: any) {
        console.warn('requestLEScan not available:', err);
      }
    }

    // Fallback: requestDevice (browser dialog)
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      const found: FoundDevice = {
        id: device.id || device.name,
        name: device.name || `Dispositivo ${device.id?.slice(0, 8)}`,
        device,
      };
      devicesRef.current = [found];
      setDevices([found]);
      setSelectedDevice(found);
      setScanning(false);
      setStep('scanning');
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        setStep('idle');
      } else {
        setErrorMsg(err.message || 'Erro ao buscar dispositivos');
        setStep('error');
      }
      setScanning(false);
    }
  };

  const startScan = () => {
    if (isNative) {
      startNativeScan();
    } else {
      startWebScan();
    }
  };

  const selectDevice = (dev: FoundDevice) => {
    setSelectedDevice(dev);
    handleStopScan();
    if (!isNative) {
      const nav = navigator as any;
      if (nav.bluetooth) {
        try { nav.bluetooth.removeEventListener('advertisementreceived', handleAdvertisement); } catch {}
      }
    }
    setStep('selected');
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-background rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bluetooth className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Impressora Bluetooth</h3>
            <p className="text-xs text-muted-foreground">
              {isNative ? 'Conexão nativa • Bluetooth LE' : 'Conecte à sua impressora térmica'}
            </p>
          </div>
        </div>

        {/* IDLE */}
        {step === 'idle' && (
          <div className="space-y-4">
            <Button onClick={startScan} className="w-full rounded-full h-12 gap-2 text-base">
              <BluetoothSearching className="w-5 h-5" />
              Buscar Dispositivos
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Certifique-se que a impressora está ligada e com Bluetooth ativado
            </p>
          </div>
        )}

        {/* SCANNING */}
        {step === 'scanning' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="relative">
                <Radio className="w-6 h-6 text-primary animate-pulse" />
                <div className="absolute inset-0 w-6 h-6 rounded-full border border-primary/40 animate-ping" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Buscando dispositivos...</p>
                <p className="text-xs text-muted-foreground">{devices.length} encontrado{devices.length !== 1 ? 's' : ''}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { handleStopScan(); setStep(devices.length > 0 ? 'scanning' : 'idle'); }} className="text-xs">
                Parar
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 max-h-[45vh]">
              {devices.map((dev, i) => (
                <button
                  key={dev.id}
                  onClick={() => selectDevice(dev)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all text-left animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{dev.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{dev.id}</p>
                  </div>
                  {dev.rssi && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{dev.rssi} dBm</span>
                  )}
                </button>
              ))}

              {scanning && devices.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                      <BluetoothSearching className="w-8 h-8 text-primary/50 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-primary/20 animate-ping" />
                  </div>
                  <p className="text-xs text-muted-foreground">Procurando dispositivos próximos...</p>
                </div>
              )}

              {scanning && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando mais dispositivos...
                </div>
              )}
            </div>
          </div>
        )}

        {/* SELECTED */}
        {step === 'selected' && selectedDevice && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Bluetooth className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{selectedDevice.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{selectedDevice.id}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={startScan} className="flex-1 rounded-full h-11">
                Trocar
              </Button>
              <Button onClick={connectAndPrint} className="flex-1 rounded-full h-11 gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          </div>
        )}

        {/* CONNECTING */}
        {step === 'connecting' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm font-medium">Conectando...</p>
            {selectedDevice && <p className="text-xs text-muted-foreground">{selectedDevice.name}</p>}
          </div>
        )}

        {/* SENDING */}
        {step === 'sending' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <Printer className="w-12 h-12 text-primary" />
              <Loader2 className="w-6 h-6 text-primary animate-spin absolute -top-1 -right-1" />
            </div>
            <p className="text-sm font-medium">Enviando dados...</p>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-[hsl(var(--success))]" />
            </div>
            <p className="text-sm font-semibold">Nota impressa com sucesso!</p>
            <Button onClick={onClose} className="rounded-full h-11 px-8">Fechar</Button>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <p className="text-sm font-semibold">Erro na impressão</p>
            <p className="text-xs text-muted-foreground text-center">{errorMsg}</p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={onClose} className="flex-1 rounded-full h-11">Cancelar</Button>
              <Button onClick={startScan} className="flex-1 rounded-full h-11">Tentar novamente</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BluetoothPrinterModal;
