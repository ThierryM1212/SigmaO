const path = require('path');
const webpack = require('webpack');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
process.env.GENERATE_SOURCEMAP = 'false';

module.exports = function override(config, env) {
  const wasmExtensionRegExp = /\.wasm$/;

  // Resolve WASM and CommonJS
  config.resolve.extensions.push(".wasm");
  config.experiments = {
    asyncWebAssembly: true,
  };
  config.module.rules.forEach((rule) => {
    (rule.oneOf ?? []).forEach((oneOf) => {
      if (oneOf.type === "asset/resource") {
        // Including .cjs here solves `nanoid is not a function`
        oneOf.exclude.push(/\.wasm$/, /\.cjs$/);
      } else if (new RegExp(oneOf.test).test(".d.ts")) {
        // Exclude declaration files from being loaded by babel
        oneOf.exclude = [/\.d\.ts$/];
      }
    });
  });

  // add a dedicated loader for WASM
  config.module.rules.push({
    test: wasmExtensionRegExp,
    include: path.resolve(__dirname, 'src'),
    use: [{ loader: require.resolve('wasm-loader'), options: {} }]
  });

  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify"),
    "url": require.resolve("url")
  })
  config.resolve.fallback = fallback;
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ])

  config.resolve.plugins = config.resolve.plugins.filter(plugin => !(plugin instanceof ModuleScopePlugin));

  return config;
};
