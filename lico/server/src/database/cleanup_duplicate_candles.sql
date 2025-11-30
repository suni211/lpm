-- 중복 캔들 데이터 정리 스크립트
-- 문제: 1일봉이 10초마다 생성되어 동일한 날짜에 여러 개의 캔들이 존재
-- 해결: 각 날짜별로 가장 최신 캔들만 남기고 나머지 삭제

-- 1. 백업 테이블 생성 (안전을 위해)
CREATE TABLE IF NOT EXISTS candles_1d_backup AS SELECT * FROM candles_1d;
CREATE TABLE IF NOT EXISTS candles_1h_backup AS SELECT * FROM candles_1h;
CREATE TABLE IF NOT EXISTS candles_1m_backup AS SELECT * FROM candles_1m;

-- 2. 1일봉 중복 데이터 정리
-- 각 coin_id와 날짜(open_time의 날짜 부분)별로 하나의 캔들만 남김
DELETE c1 FROM candles_1d c1
INNER JOIN (
    SELECT
        coin_id,
        DATE(open_time) as date_only,
        MIN(open_time) as first_open_time,
        MAX(id) as keep_id
    FROM candles_1d
    GROUP BY coin_id, DATE(open_time)
    HAVING COUNT(*) > 1
) c2 ON c1.coin_id = c2.coin_id
    AND DATE(c1.open_time) = c2.date_only
    AND c1.id != c2.keep_id;

-- 3. 남은 캔들의 open_time을 정확히 00:00:00으로 조정
UPDATE candles_1d
SET open_time = DATE_FORMAT(open_time, '%Y-%m-%d 00:00:00'),
    close_time = DATE_FORMAT(DATE_ADD(open_time, INTERVAL 1 DAY), '%Y-%m-%d 00:00:00');

-- 4. 1시간봉 중복 데이터 정리
DELETE c1 FROM candles_1h c1
INNER JOIN (
    SELECT
        coin_id,
        DATE_FORMAT(open_time, '%Y-%m-%d %H:00:00') as hour_key,
        MAX(id) as keep_id
    FROM candles_1h
    GROUP BY coin_id, DATE_FORMAT(open_time, '%Y-%m-%d %H:00:00')
    HAVING COUNT(*) > 1
) c2 ON c1.coin_id = c2.coin_id
    AND DATE_FORMAT(c1.open_time, '%Y-%m-%d %H:00:00') = c2.hour_key
    AND c1.id != c2.keep_id;

-- 5. 남은 1시간봉의 open_time을 정확히 HH:00:00으로 조정
UPDATE candles_1h
SET open_time = DATE_FORMAT(open_time, '%Y-%m-%d %H:00:00'),
    close_time = DATE_FORMAT(DATE_ADD(open_time, INTERVAL 1 HOUR), '%Y-%m-%d %H:00:00');

-- 6. 1분봉 중복 데이터 정리
DELETE c1 FROM candles_1m c1
INNER JOIN (
    SELECT
        coin_id,
        DATE_FORMAT(open_time, '%Y-%m-%d %H:%i:00') as minute_key,
        MAX(id) as keep_id
    FROM candles_1m
    GROUP BY coin_id, DATE_FORMAT(open_time, '%Y-%m-%d %H:%i:00')
    HAVING COUNT(*) > 1
) c2 ON c1.coin_id = c2.coin_id
    AND DATE_FORMAT(c1.open_time, '%Y-%m-%d %H:%i:00') = c2.minute_key
    AND c1.id != c2.keep_id;

-- 7. 남은 1분봉의 open_time을 정확히 HH:MM:00으로 조정
UPDATE candles_1m
SET open_time = DATE_FORMAT(open_time, '%Y-%m-%d %H:%i:00'),
    close_time = DATE_FORMAT(DATE_ADD(open_time, INTERVAL 1 MINUTE), '%Y-%m-%d %H:%i:00');

-- 8. 정리 결과 확인
SELECT '1분봉 총 개수' as description, COUNT(*) as count FROM candles_1m
UNION ALL
SELECT '1시간봉 총 개수', COUNT(*) FROM candles_1h
UNION ALL
SELECT '1일봉 총 개수', COUNT(*) FROM candles_1d;

-- 백업 테이블 삭제 (확인 후 실행)
-- DROP TABLE IF EXISTS candles_1d_backup;
-- DROP TABLE IF EXISTS candles_1h_backup;
-- DROP TABLE IF EXISTS candles_1m_backup;
