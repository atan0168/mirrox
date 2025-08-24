// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

module.exports = (async () => {
  // 1. Get the default Expo configuration.
  const defaultConfig = getDefaultConfig(__dirname);

  // 2. Destructure the default resolver configuration.
  const {
    resolver: { sourceExts, assetExts },
  } = defaultConfig;

  // 3. Add 'svg' to sourceExts and remove it from assetExts.
  //    This tells Metro to treat '.svg' files as source code, not static assets.
  const updatedAssetExts = assetExts.filter((ext) => ext !== "svg");
  const updatedSourceExts = [...sourceExts, "svg"];

  // 4. Return the merged configuration.
  return {
    ...defaultConfig,
    transformer: {
      ...defaultConfig.transformer,
      babelTransformerPath: require.resolve("react-native-svg-transformer"),
    },
    resolver: {
      ...defaultConfig.resolver,
      assetExts: updatedAssetExts,
      sourceExts: updatedSourceExts,
    },
  };
})();
