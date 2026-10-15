export interface User {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'admin' | 'user';
  balance: number;
  balanceEgp: number;
  avatar: string;
  status: 'active' | 'deactive' | 'banned';
  ordersCount?: number;
  totalSpent?: number;
  totalSpentEgp?: number;
  isGoogleAuth?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  status: 'active' | 'deactive';
}

export interface Service {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  type: string;
  rate: number;
  rateEgp: number;
  min: number;
  max: number;
  description: string;
  status: 'active' | 'deactive';
  provider?: string;
  providerServiceId?: number;
  originalRate?: number;
}

export interface Order {
  id: number;
  userId: number;
  serviceId: number;
  serviceName: string;
  categoryName: string;
  link: string;
  quantity: number;
  charge: number;
  chargeEgp: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'partial';
  createdAt: string;
  notes?: string;
  provider?: string;
  providerOrderId?: number;
}

export interface Transaction {
  id: number;
  userId: number;
  userName: string;
  reference: string;
  methodId: number;
  methodName: string;
  amountEgp: number;
  amountUsd: number;
  senderPhone: string;
  proofData?: string;
  status: 'pending' | 'completed' | 'rejected';
  notes: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  min: number;
  max: number;
  fee: number;
  status: 'active' | 'deactive';
  accountNumber: string;
  instruction: string;
  image: string;
  exchangeRate: number;
}

export interface PlatformStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  processingOrders: number;
  activeServices: number;
  activeUsers: number;
  totalEarningsUsd: number;
  totalEarningsEgp: number;
  exchangeRate: number;
}

export interface TicketMessage {
  id: number;
  sender: 'user' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  userId: number;
  userName: string;
  subject: string;
  category: 'order' | 'deposit' | 'refill' | 'other';
  orderId?: number;
  status: 'open' | 'answered' | 'closed';
  priority: 'normal' | 'high';
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderInfo {
  provider: string;
  apiUrl: string;
  status: 'active' | 'inactive';
  marginPercent: number;
  apiKeyMasked: string;
  syncEnabled: boolean;
  syncInterval: number;
  lastSyncTime: string;
  lastSyncCount: number;
  balance?: {
    balance: string;
    currency: string;
  } | null;
  servicesCount?: number;
}
