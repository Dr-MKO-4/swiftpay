module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      ['module:react-native-dotenv', { moduleName: '@env', path: '.env' }],
      'react-native-worklets-core/plugin',
      'react-native-reanimated/plugin',
    ],
  };
};
