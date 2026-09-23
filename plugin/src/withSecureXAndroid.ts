import { AndroidConfig } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';
import type { SecureXPluginProps } from './index';

export const withSecureXAndroid: ConfigPlugin<SecureXPluginProps> = (
  config
) => {
  return AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.USE_BIOMETRIC',
    'android.permission.USE_FINGERPRINT',
  ]);
};

export const withAuthVaultAndroid = withSecureXAndroid;
