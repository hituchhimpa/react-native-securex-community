import { withInfoPlist } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';
import type { AuthVaultPluginProps } from './index';

const FACEID_USAGE =
  'Allow $(PRODUCT_NAME) to use Face ID for secure authentication';

export const withAuthVaultIOS: ConfigPlugin<AuthVaultPluginProps> = (
  config,
  { faceIDPermission }
) => {
  return withInfoPlist(config, (config) => {
    if (faceIDPermission !== false) {
      config.modResults.NSFaceIDUsageDescription =
        faceIDPermission ||
        config.modResults.NSFaceIDUsageDescription ||
        FACEID_USAGE;
    }
    return config;
  });
};
