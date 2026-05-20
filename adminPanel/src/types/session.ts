export interface Session {
  id: number;
  name: string;
  state: string;
  config_id?: [number, string];
  user_id?: [number, string];
  start_at?: string;
  cash_register_balance_start?: number;
}

export interface ShiftStateHistory {
  toState: "active" | "paused" | "closed";
  at: string;
  reason?: string;
}

export interface Shift {
  _id: string;
  odooSessionId: number;

  cashierId:
    | string
    | {
        _id: string;
        name: string;
        email?: string;
        role?: string;
      };

  odooPartnerId: number;

  state: "active" | "paused" | "closed";

  startTime: string;
  endTime?: string;

  totalOrders?: number;
  totalSales?: number;

  stateHistory: ShiftStateHistory[];
}

export interface CartItem {
  productId: number;
  qty: number;
  price: number;
  discount?: number;
}

export interface PaymentLine {
  method: "cash" | "card" | "bank";
  amount: number;
}

export interface Product {
  id: number;
  name: string;
  list_price: number;
  barcode?: string;
  categ_id?: [number, string];
  uom_id?: [number, string];
  image_128?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  street?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  is_cash_count: boolean;
}

export interface POSConfig {
  id: number;
  name: string;
  currency_id?: [number, string];
}

export interface POSOrder {
  id?: string;
  sessionId?: number;
  shiftId?: string;
  cashierId?: string;
  customerId?: number;

  cart: CartItem[];

  paymentLines: PaymentLine[];

  subtotal: number;
  total: number;
  amountPaid: number;
  change: number;

  note?: string;

  status?: string;
  receiptNumber?: string;
}

export interface OpenSessionBody {
  configId: number;
  cashierId: string;
}

export interface ConfirmOpeningBalanceBody {
  sessionId: number;
  cashierId: string;
  configId: number;
  openingBalance: number;
}

export interface CloseSessionBody {
  sessionId: number;
}

export interface CashierShiftBody {
  cashierId: string;
  configId: number;
  reason?: string;
}

export interface CreateOrderBody {
  cart: CartItem[];
  paymentLines: PaymentLine[];

  cashierId: string;
  configId: number;

  customerId?: number;
  note?: string;
}

export interface CreateCustomerBody {
  name: string;
  phone?: string;
  email?: string;
}

// ─────────────────────────────────────────────────────────────
// RESPONSES
// ─────────────────────────────────────────────────────────────

export interface APIResponse {
  status?: string;
  success?: boolean;
  message?: string;
}

export interface ActiveSessionResponse extends APIResponse {
  session: Session | null;

  stats: {
    orderCount: number;
    totalRevenue: number;
  } | null;

  activeShifts: Shift[];
}

export interface OpenSessionResponse extends APIResponse {
  requiresOpeningBalance: boolean;

  session?: Session;
  sessionId?: number;

  activeShift?: Shift;

  state?: string;
}

export interface ConfirmOpeningBalanceResponse extends APIResponse {
  session: Session;
  activeShift: Shift;
  openingBalance: number;
}

export interface ActiveShiftsResponse extends APIResponse {
  count: number;
  shifts: Shift[];
}

export interface ProductsResponse extends APIResponse {
  count: number;
  products: Product[];
}

export interface CustomersResponse extends APIResponse {
  count: number;
  customers: Customer[];
}

export interface PaymentMethodsResponse extends APIResponse {
  methods: PaymentMethod[];
}

export interface POSConfigsResponse extends APIResponse {
  configs: POSConfig[];
}

export interface CreateOrderResponse extends APIResponse {
  orderId: number;
  mongoOrderId?: string | null;
  cashierShiftId: string;
}

export interface SessionOrdersResponse extends APIResponse {
  count: number;
  orders: any[];
}

export interface SessionReportResponse extends APIResponse {
  odooSessionId: number;

  summary: {
    totalOrders: number;
    totalSales: number;
    cashierCount: number;
  };

  cashierBreakdown: any[];
}