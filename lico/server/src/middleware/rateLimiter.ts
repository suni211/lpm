import { Request, Response, NextFunction } from 'express';

// 간단한 인메모리 레이트 리미터 (IP + 엔드포인트 기반)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// 레이트 리미트 설정
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const endpoint = req.path;
    const key = `${ip}:${endpoint}`;
    const now = Date.now();

    // 기존 기록 조회
    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      // 새로운 윈도우 시작
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (record.count >= maxRequests) {
      // 레이트 리미트 초과
      return res.status(429).json({
        error: '요청 횟수 제한 초과',
        message: `${windowMs / 1000}초 내 최대 ${maxRequests}회 요청 가능합니다`,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    // 카운트 증가
    record.count++;
    requestCounts.set(key, record);
    next();
  };
};

// 입출금 엔드포인트용 엄격한 레이트 리미터 (1분에 5회)
export const strictRateLimiter = createRateLimiter(5, 60000);

// 거래 엔드포인트용 일반 레이트 리미터 (1분에 30회)
export const tradingRateLimiter = createRateLimiter(30, 60000);

// 일반 API용 레이트 리미터 (1분에 60회)
export const generalRateLimiter = createRateLimiter(60, 60000);

// 1분마다 오래된 기록 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime + 60000) {
      requestCounts.delete(key);
    }
  }
}, 60000);
