export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  approved: boolean;
  created_at: string;
  avatar_url?: string | null;
}

export interface Delivery {
  id: string;
  employee_id: string;
  employee_name: string;
  client: string;
  address: string;
  status: 'pending' | 'in_transit' | 'delivered';
  notes: string;
  created_at: string;
  completed_at?: string;
  delivery_items?: DeliveryItem[];
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  name: string;
  quantity: number;
}
