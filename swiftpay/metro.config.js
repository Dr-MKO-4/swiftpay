// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  transformer: {
    // Babel-transformer pour les SVG
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    // on conserve aussi les options par défaut (inlineRequires, …)
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    // on retire svg des assetExts pour qu’il passe par le transformer
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    // on ajoute svg aux sourceExts pour qu’il soit reconnu en import
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
});
