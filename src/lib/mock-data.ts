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

export const mockUsers: User[] = [
  { id: '1', name: 'Admin', email: 'admin123', role: 'admin', approved: true, createdAt: '2024-01-01' },
  { id: '2', name: 'Carlos Silva', email: 'carlos@email.com', role: 'employee', approved: true, createdAt: '2024-03-10' },
  { id: '3', name: 'Maria Souza', email: 'maria@email.com', role: 'employee', approved: true, createdAt: '2024-03-12' },
  { id: '4', name: 'João Santos', email: 'joao@email.com', role: 'employee', approved: false, createdAt: '2024-03-15' },
];

export const mockDeliveries: Delivery[] = [
  {
    id: 'del-1',
    employeeId: '2',
    employeeName: 'Carlos Silva',
    client: 'Restaurante Sabor & Cia',
    address: 'Rua das Flores, 123 - Centro',
    items: [
      { id: 'i1', name: 'Copos Descartáveis 200ml', quantity: 50 },
      { id: 'i2', name: 'Pratos Descartáveis', quantity: 100 },
      { id: 'i3', name: 'Talheres Descartáveis', quantity: 200 },
    ],
    status: 'delivered',
    notes: 'Entregue na portaria',
    createdAt: '2024-03-18T08:00:00',
    completedAt: '2024-03-18T09:30:00',
  },
  {
    id: 'del-2',
    employeeId: '2',
    employeeName: 'Carlos Silva',
    client: 'Lanchonete do Zé',
    address: 'Av. Brasil, 456 - Jardim América',
    items: [
      { id: 'i4', name: 'Marmitex Isopor', quantity: 200 },
      { id: 'i5', name: 'Sacolas Plásticas G', quantity: 500 },
    ],
    status: 'in_transit',
    notes: '',
    createdAt: '2024-03-18T10:00:00',
  },
  {
    id: 'del-3',
    employeeId: '3',
    employeeName: 'Maria Souza',
    client: 'Padaria Pão Quente',
    address: 'Rua XV de Novembro, 789',
    items: [
      { id: 'i6', name: 'Embalagem para Bolo', quantity: 30 },
      { id: 'i7', name: 'Guardanapos', quantity: 1000 },
      { id: 'i8', name: 'Canudos Biodegradáveis', quantity: 500 },
    ],
    status: 'pending',
    notes: 'Ligar antes de entregar',
    createdAt: '2024-03-18T11:00:00',
  },
  {
    id: 'del-4',
    employeeId: '3',
    employeeName: 'Maria Souza',
    client: 'Buffet Festa Boa',
    address: 'Rua das Palmeiras, 321 - Vila Nova',
    items: [
      { id: 'i9', name: 'Copos Descartáveis 300ml', quantity: 1000 },
      { id: 'i10', name: 'Pratos Descartáveis Grande', quantity: 500 },
    ],
    status: 'pending',
    notes: '',
    createdAt: '2024-03-18T11:30:00',
  },
];
