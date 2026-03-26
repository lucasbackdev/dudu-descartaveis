// ESC/POS commands for 80mm thermal printer via Web Bluetooth
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const COMMANDS = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  CUT: [GS, 0x56, 0x00],
  FEED_3: [ESC, 0x64, 0x03],
  FEED_5: [ESC, 0x64, 0x05],
  LINE: [LF],
};

function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

function line(text: string): number[] {
  return [...textToBytes(text), LF];
}

function separator(): number[] {
  return line('------------------------------------------------');
}

interface ReceiptItem {
  name: string;
  quantity: number;
  sale_price: number;
}

interface MissingItem {
  name: string;
  quantity: number;
}

interface ReceiptData {
  client: string;
  address: string;
  employeeName: string;
  items: ReceiptItem[];
  missingItems: MissingItem[];
  notes?: string;
  date: string;
}

async function loadLogoAsRaster(): Promise<number[] | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = '/logo-print.png';
    });

    const canvas = document.createElement('canvas');
    const maxWidth = 384; // 48 bytes * 8 bits = 384 dots for 80mm
    const scale = Math.min(maxWidth / img.width, 1);
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Convert to monochrome raster
    const widthBytes = Math.ceil(canvas.width / 8);
    const rasterData: number[] = [];

    // GS v 0 command for raster bit image
    rasterData.push(GS, 0x76, 0x30, 0x00);
    rasterData.push(widthBytes & 0xFF, (widthBytes >> 8) & 0xFF);
    rasterData.push(canvas.height & 0xFF, (canvas.height >> 8) & 0xFF);

    for (let y = 0; y < canvas.height; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < canvas.width) {
            const idx = (y * canvas.width + x) * 4;
            const gray = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114);
            if (gray < 128) {
              byte |= (0x80 >> bit);
            }
          }
        }
        rasterData.push(byte);
      }
    }

    return rasterData;
  } catch (e) {
    console.warn('Could not load logo for print:', e);
    return null;
  }
}

export function buildReceipt(data: ReceiptData): { getBytes: () => Promise<number[]> } {
  return {
    getBytes: async () => {
      const bytes: number[] = [];

      // Init printer
      bytes.push(...COMMANDS.INIT);

      // Logo
      const logoBytes = await loadLogoAsRaster();
      if (logoBytes) {
        bytes.push(...COMMANDS.ALIGN_CENTER);
        bytes.push(...logoBytes);
        bytes.push(LF);
      }

      // Header
      bytes.push(...COMMANDS.ALIGN_CENTER);
      bytes.push(...COMMANDS.BOLD_ON);
      bytes.push(...COMMANDS.DOUBLE_SIZE_ON);
      bytes.push(...line('DUDU DESCARTAVEIS'));
      bytes.push(...COMMANDS.NORMAL_SIZE);
      bytes.push(...COMMANDS.BOLD_OFF);
      bytes.push(LF);

      // Date
      bytes.push(...line(data.date));
      bytes.push(...separator());

      // Client info
      bytes.push(...COMMANDS.ALIGN_LEFT);
      bytes.push(...COMMANDS.BOLD_ON);
      bytes.push(...line(`Cliente: ${data.client}`));
      bytes.push(...COMMANDS.BOLD_OFF);
      bytes.push(...line(`Endereco: ${data.address}`));
      bytes.push(...line(`Entregador: ${data.employeeName}`));
      if (data.notes) {
        bytes.push(...line(`Obs: ${data.notes}`));
      }
      bytes.push(...separator());

      // Items header
      bytes.push(...COMMANDS.BOLD_ON);
      bytes.push(...line('ITENS ENTREGUES'));
      bytes.push(...COMMANDS.BOLD_OFF);
      bytes.push(...separator());

      let total = 0;
      for (const item of data.items) {
        const itemTotal = item.quantity * item.sale_price;
        total += itemTotal;
        bytes.push(...line(`${item.name}`));
        bytes.push(...line(`  ${item.quantity}x  R$ ${item.sale_price.toFixed(2)}  = R$ ${itemTotal.toFixed(2)}`));
      }

      bytes.push(...separator());

      // Total
      bytes.push(...COMMANDS.BOLD_ON);
      bytes.push(...COMMANDS.DOUBLE_HEIGHT_ON);
      bytes.push(...COMMANDS.ALIGN_RIGHT);
      bytes.push(...line(`TOTAL: R$ ${total.toFixed(2)}`));
      bytes.push(...COMMANDS.NORMAL_SIZE);
      bytes.push(...COMMANDS.BOLD_OFF);
      bytes.push(...COMMANDS.ALIGN_LEFT);

      // Missing items
      if (data.missingItems.length > 0) {
        bytes.push(...separator());
        bytes.push(...COMMANDS.BOLD_ON);
        bytes.push(...line('ITENS EM FALTA'));
        bytes.push(...COMMANDS.BOLD_OFF);
        bytes.push(...separator());
        for (const item of data.missingItems) {
          bytes.push(...line(`${item.name} - Qtd: ${item.quantity}`));
        }
      }

      bytes.push(...separator());
      bytes.push(...COMMANDS.ALIGN_CENTER);
      bytes.push(...line('Obrigado pela preferencia!'));
      bytes.push(...line('Dudu Descartaveis'));
      bytes.push(...COMMANDS.FEED_5);
      bytes.push(...COMMANDS.CUT);

      return bytes;
    },
  };
}

// Known Bluetooth service UUIDs for thermal printers
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

export async function printViaBluetooth(receiptBytes: number[]): Promise<void> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Bluetooth não suportado neste navegador. Use Chrome no Android.');
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  if (!device.gatt) throw new Error('GATT não disponível');

  const server = await device.gatt.connect();

  let writeChar: any = null;

  for (const svcUuid of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(svcUuid);
      for (const charUuid of PRINTER_CHAR_UUIDS) {
        try {
          const char = await service.getCharacteristic(charUuid);
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        } catch {}
      }
      if (writeChar) break;
    } catch {}
  }

  if (!writeChar) {
    // Fallback: try all characteristics
    for (const svcUuid of PRINTER_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(svcUuid);
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      } catch {}
    }
  }

  if (!writeChar) {
    server.disconnect();
    throw new Error('Não foi possível encontrar a característica de escrita da impressora');
  }

  // Send in chunks (BLE max ~512 bytes per write, safe at 100)
  const chunkSize = 100;
  const data = new Uint8Array(receiptBytes);

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (writeChar.properties.writeWithoutResponse) {
      await writeChar.writeValueWithoutResponse(chunk);
    } else {
      await writeChar.writeValue(chunk);
    }
    // Small delay between chunks
    await new Promise(r => setTimeout(r, 20));
  }

  server.disconnect();
}
