// pour linker tes fonts et assets d’icônes
module.exports = {
  assets: [
    './src/assets/fonts',
    './node_modules/react-native-vector-icons/Fonts',
    './src/assets/animations',
    './src/assets/images',
  ],
  dependencies: {
    'react-native-vector-icons': {
      platforms: { ios: null },
    },
  },
};
