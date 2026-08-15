import { createRunOncePlugin } from '@expo/config-plugins';
import type { ConfigPlugin } from '@expo/config-plugins';
import { withAuthVaultIOS } from './withAuthVaultIOS';
import { withAuthVaultAndroid } from './withAuthVaultAndroid';

const pkg = require('../../package.json');

export type AuthVaultPluginProps = {
  /**
   * The FaceID usage description for iOS.
   * @default "Allow $(PRODUCT_NAME) to use Face ID for secure authentication"
   */
  faceIDPermission?: string | false;
};

const withAuthVault: ConfigPlugin<AuthVaultPluginProps | void> = (
  config,
  props
) => {
  config = withAuthVaultIOS(config, props || {});
  config = withAuthVaultAndroid(config, props || {});
  return config;
};

export default createRunOncePlugin(withAuthVault, pkg.name, pkg.version);
