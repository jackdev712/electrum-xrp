// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    https: require.resolve('https-browserify'),
    http: require.resolve('stream-http'),
    url: require.resolve('url/'),
    vm: require.resolve('vm-browserify'),
    stream: require.resolve('stream-browserify'),
    crypto: require.resolve('crypto-browserify'),
    path: require.resolve('path-browserify'),
    fs: false,
    net: false,
    tls: false
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ];

  return config;
};
