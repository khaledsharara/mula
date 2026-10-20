/**
 * Signs Android release builds with the key from these environment variables (or Gradle
 * properties), set by the release workflow from repository secrets:
 *   MULA_UPLOAD_STORE_FILE, MULA_UPLOAD_STORE_PASSWORD, MULA_UPLOAD_KEY_ALIAS, MULA_UPLOAD_KEY_PASSWORD
 * Without them (forks, local builds) release builds keep Expo's default debug signing.
 * Every update of an installed APK must be signed with the same key, so keep that key safe.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// Mula: release signing';

const SNIPPET = `
${MARKER} (plugins/with-android-release-signing.js)
def mulaSigning = { String key -> findProperty(key) ?: System.getenv(key) }
if (mulaSigning('MULA_UPLOAD_STORE_FILE')) {
  android {
    signingConfigs {
      mulaRelease {
        storeFile file(mulaSigning('MULA_UPLOAD_STORE_FILE'))
        storePassword mulaSigning('MULA_UPLOAD_STORE_PASSWORD')
        keyAlias mulaSigning('MULA_UPLOAD_KEY_ALIAS')
        keyPassword mulaSigning('MULA_UPLOAD_KEY_PASSWORD')
      }
    }
    buildTypes {
      release {
        signingConfig signingConfigs.mulaRelease
      }
    }
  }
}
`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') throw new Error('with-android-release-signing expects a Groovy build.gradle');
    if (!cfg.modResults.contents.includes(MARKER)) cfg.modResults.contents += SNIPPET;
    return cfg;
  });
}

module.exports = withAndroidReleaseSigning;
