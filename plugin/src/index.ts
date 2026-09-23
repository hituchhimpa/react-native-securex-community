import { createRunOncePlugin } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';
import { withSecureXIOS } from './withSecureXIOS';
import { withSecureXAndroid } from './withSecureXAndroid';

const pkg = require('../../package.json');

export type SecureXPluginProps = {
  /**
   * The FaceID usage description for iOS.
   * @default "Allow $(PRODUCT_NAME) to use Face ID for secure authentication"
   */
  faceIDPermission?: string | false;
};

export type AuthVaultPluginProps = SecureXPluginProps;

const withSecureX: ConfigPlugin<SecureXPluginProps | void> = (
  config,
  props
) => {
  config = withSecureXIOS(config, props || {});
  config = withSecureXAndroid(config, props || {});
  return config;
};

export const withAuthVault = withSecureX;

export default createRunOncePlugin(withSecureX, pkg.name, pkg.version);
