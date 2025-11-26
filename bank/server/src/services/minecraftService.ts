import axios from 'axios';

const minecraftService = {
  // 마인크래프트 닉네임으로 UUID 조회
  getMinecraftUUID: async (username: string): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://api.mojang.com/users/profiles/minecraft/${username}`
    );
    return response.data.id;
  } catch (error) {
    console.error(`Failed to get UUID for ${username}:`, error);
    return null;
  }
  },

  // UUID로 마인크래프트 닉네임 조회
  getMinecraftUsername: async (uuid: string): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
    );
    return response.data.name;
  } catch (error) {
    console.error(`Failed to get username for ${uuid}:`, error);
    return null;
  }
  },

  // 마인크래프트 스킨 URL 조회
  getMinecraftSkin: (uuid: string): string => {
    return `https://crafatar.com/avatars/${uuid}?size=64&overlay`;
  },

  // 마인크래프트 닉네임 유효성 검사
  isValidMinecraftUsername: (username: string): boolean => {
    // 3-16자, 영문자, 숫자, 언더스코어만 허용
    const regex = /^[a-zA-Z0-9_]{3,16}$/;
    return regex.test(username);
  }
};

export default minecraftService;
