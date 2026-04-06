export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  approved: boolean;
  created_at: string;
  avatar_url?: string | null;
  color?: string;
}

// 100 unique visually distinct colors for employee charts
export const EMPLOYEE_COLORS = [
  '#E63946','#457B9D','#2A9D8F','#E9C46A','#F4A261',
  '#264653','#6A4C93','#1982C4','#8AC926','#FF595E',
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9',
  '#F1948A','#82E0AA','#F8C471','#AED6F1','#D7BDE2',
  '#A3E4D7','#F9E79F','#FADBD8','#D5F5E3','#EBDEF0',
  '#E74C3C','#3498DB','#2ECC71','#F39C12','#9B59B6',
  '#1ABC9C','#E67E22','#2980B9','#27AE60','#8E44AD',
  '#D35400','#16A085','#C0392B','#2C3E50','#F1C40F',
  '#7F8C8D','#BDC3C7','#95A5A6','#34495E','#ECF0F1',
  '#FF4757','#2ED573','#1E90FF','#FFA502','#FF6348',
  '#7BED9F','#70A1FF','#ECCC68','#A4B0BE','#747D8C',
  '#FF6B81','#5352ED','#2F3542','#57606F','#DFE4EA',
  '#FC427B','#EAB543','#25CCF7','#FD7272','#58B19F',
  '#3B3B98','#182C61','#82589F','#F8EFBA','#E1B12C',
  '#EB2F06','#1B1464','#0652DD','#6F1E51','#833471',
  '#ED4C67','#B53471','#D980FA','#9980FA','#5758BB',
  '#0A3D62','#3C6382','#60A3BC','#C44569','#574B90',
  '#F78FB3','#3DC1D3','#E77F67','#786FA6','#F19066',
  '#303952','#596275','#574B90','#F5CD79','#546DE5',
];


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
  payment_method?: string | null;
  payment_due_date?: string | null;
  delivery_items?: DeliveryItem[];
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  name: string;
  quantity: number;
}
