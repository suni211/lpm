import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BANK_API_URL = process.env.BANK_URL || 'http://localhost:5001';

const bankApi = axios.create({
  baseURL: `${BANK_API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const bankService = {
  // BANK 사용자 로그인 (인증 코드 기반)
  async loginWithAuthCode(authCode: string) {
    try {
      const response = await bankApi.post('/auth/login', { auth_code: authCode });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'BANK 로그인 실패');
    }
  },

  // BANK 계좌 조회 (마인크래프트 닉네임)
  async getAccountByUsername(username: string) {
    try {
      const response = await bankApi.get(`/accounts/minecraft/${username}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '계좌 조회 실패');
    }
  },

  // BANK 계좌 잔액 조회 (마인크래프트 닉네임)
  async getAccountBalance(username: string) {
    try {
      // 먼저 계좌를 조회해서 계좌번호를 가져옴
      const accountResponse = await bankApi.get(`/accounts/minecraft/${username}`);
      const accountNumber = accountResponse.data.account?.account_number;
      
      if (!accountNumber) {
        throw new Error('계좌를 찾을 수 없습니다');
      }
      
      const response = await bankApi.get(`/accounts/${accountNumber}/balance`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '잔액 조회 실패');
    }
  },

  // BANK 계좌 번호로 조회
  async getAccountByAccountNumber(accountNumber: string) {
    try {
      const response = await bankApi.get(`/accounts/account-number/${accountNumber}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '계좌 조회 실패');
    }
  },
};

export default bankService;

