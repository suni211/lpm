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

  // BANK 계좌 조회 (마인크래프트 닉네임) - 주식 계좌(02) 우선
  async getAccountByUsername(username: string) {
    try {
      // 먼저 모든 계좌 조회
      const response = await bankApi.get(`/accounts/minecraft/${username}`);
      
      // 주식 계좌(02)가 있으면 우선 반환
      if (response.data.accounts && Array.isArray(response.data.accounts)) {
        const stockAccount = response.data.accounts.find((acc: any) => 
          acc.account_type === 'STOCK' || acc.account_number?.startsWith('02-')
        );
        if (stockAccount) {
          return { account: stockAccount };
        }
      }
      
      // 주식 계좌가 없으면 첫 번째 계좌 반환
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '계좌 조회 실패');
    }
  },

  // BANK 계좌 잔액 조회 (마인크래프트 닉네임) - 주식 계좌(02) 우선
  async getAccountBalance(username: string) {
    try {
      // 먼저 계좌를 조회 (주식 계좌 우선 - BANK 서버가 이미 우선 반환)
      const accountResponse = await bankApi.get(`/accounts/minecraft/${username}`);
      
      // BANK 서버가 주식 계좌를 우선 반환하므로 account를 사용
      let account = accountResponse.data.account;
      
      // 만약 account가 없고 accounts 배열이 있으면 주식 계좌 찾기
      if (!account && accountResponse.data.accounts && Array.isArray(accountResponse.data.accounts)) {
        account = accountResponse.data.accounts.find((acc: any) => 
          acc.account_type === 'STOCK' || acc.account_number?.startsWith('02-')
        ) || accountResponse.data.accounts[0];
      }
      
      if (!account || !account.account_number) {
        throw new Error('계좌를 찾을 수 없습니다');
      }
      
      // 주식 계좌(02) 우선 확인 및 조회
      const isStockAccount = account.account_type === 'STOCK' || account.account_number?.startsWith('02-');
      
      // 주식 계좌가 아니고 모든 계좌 목록이 있으면 주식 계좌 찾기
      if (!isStockAccount && accountResponse.data.accounts && Array.isArray(accountResponse.data.accounts)) {
        const stockAccount = accountResponse.data.accounts.find((acc: any) => 
          acc.account_type === 'STOCK' || acc.account_number?.startsWith('02-')
        );
        if (stockAccount && stockAccount.account_number) {
          // 주식 계좌의 잔액 조회
          const response = await bankApi.get(`/accounts/${stockAccount.account_number}/balance`);
          return response.data;
        }
      }
      
      // 주식 계좌가 없거나 이미 주식 계좌인 경우 현재 계좌의 잔액 조회
      const response = await bankApi.get(`/accounts/${account.account_number}/balance`);
      return response.data;
    } catch (error: any) {
      console.error('BANK 잔액 조회 오류:', error);
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

  // BANK 주식 계좌 생성 (LICO 서버용)
  async createStockAccount(userId: string, minecraftUsername: string) {
    try {
      const response = await bankApi.post('/accounts/create-stock-account', {
        user_id: userId,
        minecraft_username: minecraftUsername,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '주식 계좌 생성 실패');
    }
  },
};

export default bankService;

