const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs on wa-sqlite (WebAssembly) and needs SharedArrayBuffer,
// which browsers only expose on cross-origin isolated pages.
config.resolver.assetExts.push('wasm');

// The Claude relay (relay/) is a separate Worker project; keep its node_modules out of the app.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const relayDir = new RegExp(`^${escapeRegExp(path.join(__dirname, 'relay'))}[/\\\\]`);
config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), relayDir];
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
