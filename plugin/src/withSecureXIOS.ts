import { withInfoPlist } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';
import type { SecureXPluginProps } from './index';

const FACEID_USAGE =
  'Allow $(PRODUCT_NAME) to use Face ID for secure authentication';

export const withSecureXIOS: ConfigPlugin<SecureXPluginProps> = (
  config,
  { faceIDPermission } = {}
) => {
  return withInfoPlist(config, (infoPlistConfig) => {
    if (faceIDPermission !== false) {
      infoPlistConfig.modResults.NSFaceIDUsageDescription =
        faceIDPermission ||
        infoPlistConfig.modResults.NSFaceIDUsageDescription ||
        FACEID_USAGE;
    }
    return infoPlistConfig;
  });
};

export const withAuthVaultIOS = withSecureXIOS;
