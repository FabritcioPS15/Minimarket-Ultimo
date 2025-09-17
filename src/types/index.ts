// src/types/index.ts
export interface Product {
  id?: string;
  code: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  costPrice: number;
  salePrice: number;
  profitPercentage: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  expirationDate?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KardexEntry {
  id: string;
  productId: string;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  reference?: string;
  createdAt: string;
  createdBy: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  operationNumber?: string;
  customerName?: string;
  customerDocument?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'yape' | 'plin' | 'other';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  password: string;
  // Campos de tu base de datos (snake_case)
  is_active?: boolean; // Para compatibilidad con la BD
  created_at?: string; // Para compatibilidad con la BD
}

export type UserRole = 'admin' | 'supervisor' | 'cashier';

export interface CashSession {
  id: string;
  userId: string;
  startAmount: number;
  currentAmount: number;
  totalSales: number;
  startTime: string;
  endTime?: string;
  status: 'active' | 'closed';
}

export interface Alert {
  id: string;
  type: 'expiration' | 'low_stock' | 'over_stock';
  productId: string;
  productName: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
}

// Tipo para mapear usuarios desde la base de datos
export interface UserFromDB {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  password: string;
  updated_at?: string;
}

// Función para convertir usuario de la BD al tipo frontend
export const mapUserFromDB = (userFromDB: UserFromDB): User => ({
  id: userFromDB.id,
  username: userFromDB.username,
  email: userFromDB.email,
  role: userFromDB.role,
  isActive: userFromDB.is_active, // ← Aquí está el error! Debe ser is_active
  createdAt: userFromDB.created_at,
  password: userFromDB.password,
});

// Función para convertir usuario del frontend al tipo BD
export const mapUserToDB = (user: User): UserFromDB => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  is_active: user.isActive,
  created_at: user.createdAt,
  password: user.password,
  updated_at: new Date().toISOString(),
});

// Tipo para login response
export interface LoginResponse {
  user: User;
  session?: any;
}

// Tipo para crear usuario
export interface CreateUserRequest {
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password: string;
}

// Tipo para actualizar usuario
export interface UpdateUserRequest {
  id: string;
  username?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
}

// Filtros para usuarios
export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

// Paginación
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OPEN_CASH' | 'CLOSE_CASH' | 'SALE';
  entity: 'product' | 'sale' | 'user' | 'cash' | 'system';
  entityId: string;
  entityName: string;
  details: string;
  oldValue?: any;
  newValue?: any;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    [key: string]: any;
  };
}