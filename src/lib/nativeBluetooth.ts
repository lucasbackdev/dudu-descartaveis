// Native Bluetooth printing via @capacitor-community/bluetooth-le
// Used when running as a native app (Capacitor) on iOS/Android
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const PRINTER_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

export interface NativeBleDevice {
  deviceId: string;
  name: string;
  rssi?: number;
}

export async function initBle(): Promise<void> {
  await BleClient.initialize({ androidNeverForLocation: true });
}

export async function scanDevices(
  onDeviceFound: (device: NativeBleDevice) => void,
  durationMs = 15000
): Promise<void> {
  await BleClient.requestLEScan(
    { allowDuplicates: false },
    (result) => {
      onDeviceFound({
        deviceId: result.device.deviceId,
        name: result.device.name || result.localName || `Dispositivo ${result.device.deviceId.slice(0, 8)}`,
        rssi: result.rssi,
      });
    }
  );

  setTimeout(async () => {
    try {
      await BleClient.stopLEScan();
    } catch {}
  }, durationMs);
}

export async function stopScan(): Promise<void> {
  try {
    await BleClient.stopLEScan();
  } catch {}
}

export async function printViaNativeBle(deviceId: string, receiptBytes: number[]): Promise<void> {
  await BleClient.connect(deviceId, () => {
    console.log('Printer disconnected');
  });

  let writeServiceUuid = '';
  let writeCharUuid = '';

  // Discover services and find writable characteristic
  for (const svcUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const services = await BleClient.getServices(deviceId);
      for (const svc of services) {
        if (svc.uuid.toLowerCase() === svcUuid.toLowerCase()) {
          for (const char of svc.characteristics) {
            if (
              char.properties.write ||
              char.properties.writeWithoutResponse
            ) {
              writeServiceUuid = svc.uuid;
              writeCharUuid = char.uuid;
              break;
            }
          }
        }
        if (writeCharUuid) break;
      }
      if (writeCharUuid) break;
    } catch {}
  }

  // Fallback: try all services
  if (!writeCharUuid) {
    try {
      const services = await BleClient.getServices(deviceId);
      for (const svc of services) {
        for (const char of svc.characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeServiceUuid = svc.uuid;
            writeCharUuid = char.uuid;
            break;
          }
        }
        if (writeCharUuid) break;
      }
    } catch {}
  }

  if (!writeCharUuid) {
    await BleClient.disconnect(deviceId);
    throw new Error('Não foi possível encontrar a característica de escrita da impressora');
  }

  // Send in chunks
  const chunkSize = 100;
  const data = new Uint8Array(receiptBytes);

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await BleClient.write(deviceId, writeServiceUuid, writeCharUuid, chunk as any);
    await new Promise(r => setTimeout(r, 20));
  }

  await BleClient.disconnect(deviceId);
}

export function isNativeApp(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}
