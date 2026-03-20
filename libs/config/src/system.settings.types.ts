export interface SystemSettings {
  cache: boolean;
  audit: boolean;
  piiMasking: boolean;
  globalDailyTokenCap: number;
  baseUserDailyTokenLimit: number;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  cache: true,
  audit: true,
  piiMasking: false,
  globalDailyTokenCap: 5000000,
  baseUserDailyTokenLimit: 50000,
};
