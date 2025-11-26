import api from './api';
import { Coin, Candle, Trade, Orderbook } from '../types';

export const coinService = {
  // 모든 코인 목록
  getCoins: async (status: string = 'ACTIVE'): Promise<Coin[]> => {
    const response = await api.get('/coins', { params: { status } });
    return response.data.coins;
  },

  // 코인 상세 정보
  getCoinBySymbol: async (symbol: string): Promise<Coin> => {
    const response = await api.get(`/coins/symbol/${symbol}`);
    return response.data.coin;
  },

  // 코인 가격 정보
  getCoinPrice: async (coinId: string) => {
    const response = await api.get(`/coins/${coinId}/price`);
    return response.data;
  },

  // 최근 거래 내역
  getRecentTrades: async (coinId: string, limit: number = 50): Promise<Trade[]> => {
    const response = await api.get(`/coins/${coinId}/trades/recent`, { params: { limit } });
    return response.data.trades;
  },

  // 캔들스틱 데이터
  getCandles: async (coinId: string, interval: '1m' | '1h' | '1d', limit: number = 100): Promise<Candle[]> => {
    const response = await api.get(`/coins/${coinId}/candles/${interval}`, { params: { limit } });
    return response.data.candles;
  },
};

export const tradingService = {
  // 주문 생성
  createOrder: async (orderData: {
    wallet_address: string;
    coin_id: string;
    order_type: 'BUY' | 'SELL';
    order_method: 'MARKET' | 'LIMIT';
    price?: number;
    quantity: number;
  }) => {
    const response = await api.post('/trading/order', orderData);
    return response.data;
  },

  // 내 주문 목록
  getMyOrders: async (walletAddress: string, status?: string, coinId?: string) => {
    const response = await api.get(`/trading/orders/${walletAddress}`, {
      params: { status, coin_id: coinId },
    });
    return response.data.orders;
  },

  // 주문 취소
  cancelOrder: async (orderId: string, walletAddress: string) => {
    const response = await api.post(`/trading/orders/${orderId}/cancel`, { wallet_address: walletAddress });
    return response.data;
  },

  // 호가창
  getOrderbook: async (coinId: string, limit: number = 20): Promise<Orderbook> => {
    const response = await api.get(`/trading/orderbook/${coinId}`, { params: { limit } });
    return response.data;
  },

  // 내 거래 체결 내역
  getMyTrades: async (walletAddress: string, coinId?: string, limit: number = 50) => {
    const response = await api.get(`/trading/trades/${walletAddress}`, {
      params: { coin_id: coinId, limit },
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

  // 내 코인 보유 현황
  getMyBalances: async (walletAddress: string) => {
    const response = await api.get(`/wallets/${walletAddress}/balances`);
    return response.data;
  },

  // 입금
  deposit: async (walletAddress: string, amount: number) => {
    const response = await api.post('/wallets/deposit', { wallet_address: walletAddress, amount });
    return response.data;
  },

  // 출금
  withdraw: async (walletAddress: string, amount: number) => {
    const response = await api.post('/wallets/withdraw', { wallet_address: walletAddress, amount });
    return response.data;
  },
};
