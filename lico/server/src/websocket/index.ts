import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { query } from '../database/db';

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://lico.berrple.com',
        'https://lico.berrple.com',
      ],
      credentials: true,
    },
  });

  // 연결된 클라이언트 관리
  const connectedClients = new Map<string, Set<string>>();

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // 코인 채널 구독
    socket.on('subscribe:coin', (coinId: string) => {
      socket.join(`coin:${coinId}`);
      console.log(`📊 Client ${socket.id} subscribed to coin:${coinId}`);

      if (!connectedClients.has(coinId)) {
        connectedClients.set(coinId, new Set());
      }
      connectedClients.get(coinId)?.add(socket.id);
    });

    // 코인 채널 구독 해제
    socket.on('unsubscribe:coin', (coinId: string) => {
      socket.leave(`coin:${coinId}`);
      console.log(`📊 Client ${socket.id} unsubscribed from coin:${coinId}`);

      connectedClients.get(coinId)?.delete(socket.id);
    });

    // 호가창 구독
    socket.on('subscribe:orderbook', (coinId: string) => {
      socket.join(`orderbook:${coinId}`);
      console.log(`📖 Client ${socket.id} subscribed to orderbook:${coinId}`);
    });

    // 호가창 구독 해제
    socket.on('unsubscribe:orderbook', (coinId: string) => {
      socket.leave(`orderbook:${coinId}`);
      console.log(`📖 Client ${socket.id} unsubscribed from orderbook:${coinId}`);
    });

    // 전체 시장 구독
    socket.on('subscribe:market', () => {
      socket.join('market');
      console.log(`🌐 Client ${socket.id} subscribed to market`);
    });

    // 전체 시장 구독 해제
    socket.on('unsubscribe:market', () => {
      socket.leave('market');
      console.log(`🌐 Client ${socket.id} unsubscribed from market`);
    });

    // 블록체인 구독
    socket.on('subscribe:blockchain', () => {
      socket.join('blockchain');
      console.log(`⛓️  Client ${socket.id} subscribed to blockchain`);
    });

    // 블록체인 구독 해제
    socket.on('unsubscribe:blockchain', () => {
      socket.leave('blockchain');
      console.log(`⛓️  Client ${socket.id} unsubscribed from blockchain`);
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);

      // 모든 구독에서 제거
      connectedClients.forEach((clients, coinId) => {
        clients.delete(socket.id);
      });
    });
  });

  // 가격 업데이트 브로드캐스트
  function broadcastPriceUpdate(coinId: string, priceData: any) {
    io.to(`coin:${coinId}`).emit('price:update', priceData);
    io.to('market').emit('market:price:update', { coinId, ...priceData });
  }

  // 거래 체결 브로드캐스트
  function broadcastTrade(coinId: string, tradeData: any) {
    io.to(`coin:${coinId}`).emit('trade:new', tradeData);
    io.to('market').emit('market:trade:new', { coinId, ...tradeData });
  }

  // 호가창 업데이트 브로드캐스트
  function broadcastOrderbookUpdate(coinId: string, orderbookData: any) {
    io.to(`orderbook:${coinId}`).emit('orderbook:update', orderbookData);
  }

  // 새 주문 브로드캐스트
  function broadcastNewOrder(coinId: string, orderData: any) {
    io.to(`orderbook:${coinId}`).emit('order:new', orderData);
  }

  // 주문 취소 브로드캐스트
  function broadcastOrderCancel(coinId: string, orderId: string) {
    io.to(`orderbook:${coinId}`).emit('order:cancel', { orderId });
  }

  // 새 블록 브로드캐스트
  function broadcastNewBlock(blockData: any) {
    io.to('blockchain').emit('block:new', blockData);
  }

  // 새 거래 (블록체인) 브로드캐스트
  function broadcastNewTransaction(txData: any) {
    io.to('blockchain').emit('transaction:new', txData);
  }

  // 캔들스틱 업데이트 브로드캐스트
  function broadcastCandleUpdate(coinId: string, interval: string, candleData: any) {
    io.to(`coin:${coinId}`).emit('candle:update', { interval, ...candleData });
  }

  console.log('🔌 WebSocket server initialized');

  return {
    io,
    broadcastPriceUpdate,
    broadcastTrade,
    broadcastOrderbookUpdate,
    broadcastNewOrder,
    broadcastOrderCancel,
    broadcastNewBlock,
    broadcastNewTransaction,
    broadcastCandleUpdate,
  };
}

export default initializeWebSocket;
