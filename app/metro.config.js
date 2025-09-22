// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (async () => {
  const projectRoot = __dirname;
  const workspaceRoot = path.resolve(projectRoot, '..');
  // 1. Get the default Expo configuration.
  const defaultConfig = getDefaultConfig(projectRoot);

  // 2. Destructure the default resolver configuration.
  const {
    resolver: { sourceExts, assetExts },
  } = defaultConfig;

  // 3. Add 'svg' to sourceExts and remove it from assetExts.
  //    This tells Metro to treat '.svg' files as source code, not static assets.
  //    Also add 'fbx' and 'glb' to assetExts for 3D model support.
  const updatedAssetExts = assetExts
    .filter(ext => ext !== 'svg')
    .concat(['fbx', 'glb', 'gltf']);
  const updatedSourceExts = [...sourceExts, 'svg'];

  // 4. Return the merged configuration.
  return {
    ...defaultConfig,
    transformer: {
      ...defaultConfig.transformer,
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
    resolver: {
      ...defaultConfig.resolver,
      assetExts: updatedAssetExts,
      sourceExts: updatedSourceExts,
      nodeModulesPaths: [
        path.join(projectRoot, 'node_modules'),
        path.join(workspaceRoot, 'node_modules'),
      ],
      // Force all Three.js imports to use the same instance
      alias: {
        three: require.resolve('three'),
        'three/src/Three': require.resolve('three'),
        'three/src/Three.js': require.resolve('three'),
      },
      // Ensure packages resolve to the same instance
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'three' || moduleName.startsWith('three/')) {
          return {
            filePath: require.resolve('three'),
            type: 'sourceFile',
          };
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
    watchFolders: [workspaceRoot],
  };
})();
