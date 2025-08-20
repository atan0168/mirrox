const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add SVG support
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;
