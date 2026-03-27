export interface SystemSettings {
  audit: boolean;
  piiMasking: boolean;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  audit: true,
  piiMasking: false,
};
