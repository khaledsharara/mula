/**
 * Keeps the iOS build signable with a free Apple ID (SideStore): removes the push notification
 * entitlement that expo-notifications adds. Mula only schedules local notifications, which need
 * no entitlement. Runs as a finalized mod so it sees every other plugin's output.
 */
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;
const { withFinalizedMod } = require('expo/config-plugins');

const UNSUPPORTED_ON_FREE_TEAMS = ['aps-environment'];

function withFreeSigning(config) {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const { platformProjectRoot, projectName } = cfg.modRequest;
      const file = path.join(platformProjectRoot, projectName, `${projectName}.entitlements`);
      if (!fs.existsSync(file)) return cfg;
      const entitlements = plist.parse(fs.readFileSync(file, 'utf8'));
      let changed = false;
      for (const key of UNSUPPORTED_ON_FREE_TEAMS) {
        if (key in entitlements) {
          delete entitlements[key];
          changed = true;
        }
      }
      if (changed) {
        const xml = plist.build(entitlements);
        fs.writeFileSync(file, xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`);
      }
      return cfg;
    },
  ]);
}

module.exports = withFreeSigning;
