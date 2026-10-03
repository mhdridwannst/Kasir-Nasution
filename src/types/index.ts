export type UserRole = 'SuperAdmin' | 'Owner' | 'Cashier' | 'Staff';

export type PaymentMethod = 'cash' | 'qris' | 'debit' | 'transfer';
export type PaymentStatus = 'pending' | 'completed' | 'cancelled';

export interface InventoryStock {
  id: string;
  tenantId?: string;
  productId: string;
  outletName: string;
  quantity: number | string;
  minThreshold: number | string;
}

export interface Product {
  id: string;
  tenantId?: string;
  name: string;
  sku: string;
  barcode?: string | null;
  category?: string | null;
  basePrice: number | string;
  sellingPrice: number | string;
  createdAt?: string;
  updatedAt?: string;
  inventoryStocks?: InventoryStock[];
}

export interface CreateProductInput {
  name: string;
  sku: string;
  barcode?: string | null;
  category?: string | null;
  basePrice: number;
  sellingPrice: number;
  initialStock?: number;
  minThreshold?: number;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  category?: string | null;
  basePrice?: number;
  sellingPrice?: number;
  minThreshold?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface TransactionDetail {
  id?: string;
  tenantId?: string;
  productId: string;
  quantity: number | string;
  unitPrice: number | string;
  subtotal: number | string;
  product?: {
    id?: string;
    name: string;
    sku: string;
    category?: string | null;
  };
}

export interface Transaction {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  cashierId: string;
  totalAmount: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionDate: string;
  createdAt?: string;
  details?: TransactionDetail[];
  cashier?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateTransactionInput {
  items: {
    productId: string;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
  taxAmount?: number;
  discountAmount?: number;
  outletName?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data: T;
  meta?: PaginationMeta;
}
