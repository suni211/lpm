export interface Coin {
  id: string;
  symbol: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  initial_supply: number;
  circulating_supply: number;
  initial_price: number;
  current_price: number;
  price_change_24h: number;
  volume_24h: number;
  market_cap: number;
  status: 'ACTIVE' | 'PAUSED' | 'DELISTED';
  min_volatility?: number;
  max_volatility?: number;
  coin_type?: 'MAJOR' | 'MEME';
  base_currency_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candle {
  id: string;
  coin_id: string;
  open_time: string;
  close_time: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  trade_count: number;
}

export interface Order {
  id: string;
  wallet_id: string;
  coin_id: string;
  order_type: 'BUY' | 'SELL';
  order_method: 'MARKET' | 'LIMIT';
  price: number | null;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  total_amount: number;
  fee: number;
  status: 'PENDING' | 'PARTIAL' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
  symbol?: string;
  name?: string;
  logo_url?: string;
}

export interface Trade {
  id: string;
  coin_id: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_wallet_id: string;
  seller_wallet_id: string;
  price: number;
  quantity: number;
  total_amount: number;
  buy_fee: number;
  sell_fee: number;
  created_at: string;
  buyer_username?: string;
  seller_username?: string;
  trade_type?: 'BUY' | 'SELL';
  my_fee?: number;
  symbol?: string;
  name?: string;
}

export interface OrderbookEntry {
  price: number;
  total_quantity: number;
  order_count: number;
}

export interface Orderbook {
  buy_orders: OrderbookEntry[];
  sell_orders: OrderbookEntry[];
}

export interface Wallet {
  id: string;
  wallet_address: string;
  minecraft_username: string;
  minecraft_uuid: string | null;
  bank_account_number: string | null;
  gold_balance: number;
  total_deposit: number;
  total_withdrawal: number;
  questionnaire_completed: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface CoinBalance {
  id: string;
  wallet_id: string;
  coin_id: string;
  available_amount: number;
  locked_amount: number;
  total_amount: number;
  average_buy_price: number;
  total_profit_loss: number;
  updated_at: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  logo_url?: string;
}
