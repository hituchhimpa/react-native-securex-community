import { AndroidConfig } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';
import type { AuthVaultPluginProps } from './index';

export const withAuthVaultAndroid: ConfigPlugin<AuthVaultPluginProps> = (
  config
) => {
  return AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.USE_BIOMETRIC',
    'android.permission.USE_FINGERPRINT',
  ]);
};
