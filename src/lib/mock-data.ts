export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  approved: boolean;
  createdAt: string;
}

export interface DeliveryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface Delivery {
  id: string;
  employeeId: string;
  employeeName: string;
  client: string;
  address: string;
  items: DeliveryItem[];
  status: 'pending' | 'in_transit' | 'delivered';
  notes: string;
  createdAt: string;
  completedAt?: string;
}

export const EMPLOYEE_COLORS: Record<string, string> = {
  '2': 'hsl(220, 90%, 56%)',   // Carlos - Azul
  '3': 'hsl(340, 82%, 52%)',   // Maria - Rosa
  '5': 'hsl(160, 84%, 39%)',   // Pedro - Verde
  '6': 'hsl(32, 95%, 50%)',    // Ana - Laranja
};

export const mockUsers: User[] = [
  { id: '1', name: 'Admin', email: 'admin123', role: 'admin', approved: true, createdAt: '2024-01-01' },
  { id: '2', name: 'Carlos Silva', email: 'carlos@email.com', role: 'employee', approved: true, createdAt: '2024-03-10' },
  { id: '3', name: 'Maria Souza', email: 'maria@email.com', role: 'employee', approved: true, createdAt: '2024-03-12' },
  { id: '4', name: 'João Santos', email: 'joao@email.com', role: 'employee', approved: false, createdAt: '2024-03-15' },
  { id: '5', name: 'Pedro Lima', email: 'pedro@email.com', role: 'employee', approved: true, createdAt: '2024-02-01' },
  { id: '6', name: 'Ana Costa', email: 'ana@email.com', role: 'employee', approved: true, createdAt: '2024-01-20' },
];

const clients = [
  'Restaurante Sabor & Cia', 'Lanchonete do Zé', 'Padaria Pão Quente',
  'Buffet Festa Boa', 'Bar do Marcos', 'Pizzaria Bella', 'Sorveteria Gelato',
  'Churrascaria Fogo', 'Cantina da Nona', 'Café Central',
];

const addresses = [
  'Rua das Flores, 123 - Centro', 'Av. Brasil, 456 - Jardim América',
  'Rua XV de Novembro, 789', 'Rua das Palmeiras, 321 - Vila Nova',
  'Av. Paulista, 1000', 'Rua Augusta, 234', 'Rua Oscar Freire, 567',
];

const productNames = [
  'Copos Descartáveis 200ml', 'Pratos Descartáveis', 'Talheres Descartáveis',
  'Marmitex Isopor', 'Sacolas Plásticas G', 'Embalagem para Bolo',
  'Guardanapos', 'Canudos Biodegradáveis', 'Copos 300ml', 'Pratos Grande',
];

function generateHistoricalDeliveries(): Delivery[] {
  const deliveries: Delivery[] = [];
  const employeeIds = ['2', '3', '5', '6'];
  const employeeNames: Record<string, string> = {
    '2': 'Carlos Silva', '3': 'Maria Souza', '5': 'Pedro Lima', '6': 'Ana Costa'
  };

  let idCounter = 1;
  const now = new Date(2026, 2, 19); // 2026-03-19

  // Generate deliveries over the past 2 years
  for (let daysAgo = 0; daysAgo < 730; daysAgo++) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    // Skip some days randomly, fewer deliveries on weekends
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseDeliveries = isWeekend ? 1 : 3;

    for (const empId of employeeIds) {
      // Each employee does 1-5 deliveries per day with some variation
      const empFactor = empId === '2' ? 1.3 : empId === '3' ? 1.1 : empId === '5' ? 0.9 : 0.8;
      const count = Math.floor((baseDeliveries + Math.random() * 3) * empFactor);

      for (let i = 0; i < count; i++) {
        const hour = 7 + Math.floor(Math.random() * 10);
        const createdAt = new Date(date);
        createdAt.setHours(hour, Math.floor(Math.random() * 60));

        const isToday = daysAgo === 0;
        const status: Delivery['status'] = isToday
          ? (['pending', 'in_transit', 'delivered'] as const)[Math.floor(Math.random() * 3)]
          : 'delivered';

        const completedAt = status === 'delivered'
          ? new Date(createdAt.getTime() + (30 + Math.random() * 120) * 60000).toISOString()
          : undefined;

        const numItems = 1 + Math.floor(Math.random() * 3);
        const items: DeliveryItem[] = [];
        for (let j = 0; j < numItems; j++) {
          items.push({
            id: `item-${idCounter}-${j}`,
            name: productNames[Math.floor(Math.random() * productNames.length)],
            quantity: (Math.floor(Math.random() * 20) + 1) * 10,
          });
        }

        deliveries.push({
          id: `del-${idCounter}`,
          employeeId: empId,
          employeeName: employeeNames[empId],
          client: clients[Math.floor(Math.random() * clients.length)],
          address: addresses[Math.floor(Math.random() * addresses.length)],
          items,
          status,
          notes: Math.random() > 0.7 ? 'Ligar antes de entregar' : '',
          createdAt: createdAt.toISOString(),
          completedAt,
        });

        idCounter++;
      }
    }
  }

  return deliveries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const mockDeliveries: Delivery[] = generateHistoricalDeliveries();
