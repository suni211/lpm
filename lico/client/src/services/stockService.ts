import api from './api';
import type { Stock, Candle, Trade, Orderbook } from '../types';

export const stockService = {
  // 모든 종목 목록
  getStocks: async (status: string = 'ACTIVE'): Promise<Stock[]> => {
    const response = await api.get('/stocks', { params: { status } });
    return response.data.stocks;
  },

  // 종목 상세 정보
  getStockBySymbol: async (symbol: string): Promise<Stock> => {
    const response = await api.get(`/stocks/symbol/${symbol}`);
    return response.data.stock;
  },

  // 종목 가격 정보
  getStockPrice: async (stockId: string) => {
    const response = await api.get(`/stocks/${stockId}/price`);
    return response.data;
  },

  // 최근 거래 내역
  getRecentTrades: async (stockId: string, limit: number = 50): Promise<Trade[]> => {
    const response = await api.get(`/stocks/${stockId}/trades/recent`, { params: { limit } });
    return response.data.trades;
  },

  // 캔들스틱 데이터
  getCandles: async (stockId: string, interval: '1m' | '1h' | '1d', limit: number = 100): Promise<Candle[]> => {
    const response = await api.get(`/stocks/${stockId}/candles/${interval}`, { params: { limit } });
    return response.data.candles;
  },
};

export const tradingService = {
  // 주문 생성
  createOrder: async (orderData: {
    wallet_address: string;
    stock_id: string;
    order_type: 'BUY' | 'SELL';
    order_method: 'MARKET' | 'LIMIT';
    price?: number;
    quantity: number;
  }) => {
    const response = await api.post('/trading/order', orderData);
    return response.data;
  },

  // 내 주문 목록
  getMyOrders: async (walletAddress: string, status?: string, stockId?: string) => {
    const response = await api.get(`/trading/orders/${walletAddress}`, {
      params: { status, stock_id: stockId },
    });
    return response.data.orders;
  },

  // 주문 취소
  cancelOrder: async (orderId: string, walletAddress: string) => {
    const response = await api.post(`/trading/orders/${orderId}/cancel`, { wallet_address: walletAddress });
    return response.data;
  },

  // 호가창
  getOrderbook: async (stockId: string, limit: number = 20): Promise<Orderbook> => {
    const response = await api.get(`/trading/orderbook/${stockId}`, { params: { limit } });
    return response.data;
  },

  // 내 거래 체결 내역
  getMyTrades: async (walletAddress: string, stockId?: string, limit: number = 50) => {
    const response = await api.get(`/trading/trades/${walletAddress}`, {
      params: { stock_id: stockId, limit },
    });
    return response.data.trades;
  },
};

export const walletService = {
  // 내 지갑 조회
  getMyWallet: async (username: string) => {
    const response = await api.get(`/wallets/username/${username}`);
    return response.data.wallet;
  },

  // 내 종목 보유 현황
  getMyBalances: async (walletAddress: string) => {
    const response = await api.get(`/wallets/${walletAddress}/balances`);
    return response.data;
  },

  // 입금
  deposit: async (walletAddress: string, amount: number) => {
    // 고유한 트랜잭션 ID 생성 (타임스탬프 + 랜덤)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const transaction_id = `TXN-${timestamp}-${random}`;

    const response = await api.post('/wallets/deposit', {
      wallet_address: walletAddress,
      amount: Math.floor(amount), // 정수만 전송
      transaction_id,
    });
    return response.data;
  },

  // 출금
  withdraw: async (walletAddress: string, amount: number) => {
    const response = await api.post('/wallets/withdraw', {
      wallet_address: walletAddress,
      amount: Math.floor(amount) // 정수만 전송
    });
    return response.data;
  },
};
