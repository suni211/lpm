-- 포스팅 (경매장) 시스템 DB 스키마
-- 선수 카드 경매, 24시간 입찰 시스템

-- 경매 상태 정의
-- ACTIVE: 진행 중
-- SOLD: 낙찰됨
-- CANCELLED: 취소됨
-- EXPIRED: 유찰됨 (입찰자 없음)

-- 경매 목록 테이블
CREATE TABLE IF NOT EXISTS auctions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    seller_team_id CHAR(36) NOT NULL,
    player_card_id INT NOT NULL,
    starting_price BIGINT NOT NULL, -- 시작 가격
    current_price BIGINT NOT NULL, -- 현재 최고가
    buyout_price BIGINT, -- 즉시 구매 가격 (선택사항)
    highest_bidder_team_id CHAR(36), -- 최고 입찰자
    auction_start_time DATETIME NOT NULL,
    auction_end_time DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SOLD, CANCELLED, EXPIRED
    bid_count INT DEFAULT 0, -- 입찰 횟수
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (highest_bidder_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_active_auctions (status, auction_end_time),
    INDEX idx_player (player_card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 입찰 내역 테이블
CREATE TABLE IF NOT EXISTS auction_bids (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    auction_id CHAR(36) NOT NULL,
    bidder_team_id CHAR(36) NOT NULL,
    bid_amount BIGINT NOT NULL,
    bid_time DATETIME NOT NULL,
    is_highest BOOLEAN DEFAULT FALSE, -- 현재 최고가 입찰인지
    is_buyout BOOLEAN DEFAULT FALSE, -- 즉시 구매 입찰인지
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_auction_bids (auction_id, bid_time DESC),
    INDEX idx_team_bids (bidder_team_id, bid_time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 경매 거래 완료 내역
CREATE TABLE IF NOT EXISTS auction_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    auction_id CHAR(36) NOT NULL,
    seller_team_id CHAR(36) NOT NULL,
    buyer_team_id CHAR(36) NOT NULL,
    player_card_id INT NOT NULL,
    final_price BIGINT NOT NULL,
    seller_fee BIGINT NOT NULL, -- 판매 수수료 (10%)
    seller_revenue BIGINT NOT NULL, -- 판매자 수익
    transaction_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    INDEX idx_seller (seller_team_id, transaction_date DESC),
    INDEX idx_buyer (buyer_team_id, transaction_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 경매 알림 테이블 (입찰 당했을 때 알림)
CREATE TABLE IF NOT EXISTS auction_notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    auction_id CHAR(36) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- OUTBID, WON, EXPIRED, SOLD
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    INDEX idx_team_unread (team_id, is_read, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 경매 감시 목록 (관심 경매)
CREATE TABLE IF NOT EXISTS auction_watchlist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    auction_id CHAR(36) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    UNIQUE KEY (team_id, auction_id),
    INDEX idx_team_watchlist (team_id, added_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
