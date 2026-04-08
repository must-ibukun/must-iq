export interface SystemSettings {
  audit: boolean;
  piiMasking: boolean;
  emailProvider?: 'smtp' | 'api';
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  audit: true,
  piiMasking: false,
  emailProvider: 'smtp',
};
