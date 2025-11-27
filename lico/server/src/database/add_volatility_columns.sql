-- Migration: Add min_volatility and max_volatility columns to coins table
-- Date: 2025-11-27
-- Purpose: Enable AI trading bot to control price volatility per coin

USE lico_db;

-- Add min_volatility column
ALTER TABLE coins
ADD COLUMN min_volatility DECIMAL(10, 5) DEFAULT 0.00001 COMMENT 'AI 최소 변동성 (0.001%)'
AFTER market_cap;

-- Add max_volatility column
ALTER TABLE coins
ADD COLUMN max_volatility DECIMAL(10, 5) DEFAULT 0.00999 COMMENT 'AI 최대 변동성 (0.999%)'
AFTER min_volatility;

-- Update existing coins to have default values
UPDATE coins
SET
  min_volatility = 0.00001,
  max_volatility = 0.00999
WHERE min_volatility IS NULL OR max_volatility IS NULL;
