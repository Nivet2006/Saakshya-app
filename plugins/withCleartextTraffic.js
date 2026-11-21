const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Ensures android:usesCleartextTraffic="true" is present on <application>
 * so local HTTP/WS FastAPI backends work on Android 9+ release builds.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (modConfig) => {
    const app = modConfig.modResults.manifest.application?.[0];
    if (app && app.$) {
      app.$['android:usesCleartextTraffic'] = 'true';
    }
    return modConfig;
  });
};
