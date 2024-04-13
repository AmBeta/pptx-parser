const path = require('path');
const BundleAnalyserPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  mode: 'production',
  performance: {
    hints: false,
  },
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'pptx-parser.js',
    library: 'pptxParser',
    libraryTarget: 'umd'
  },
  externals: {
    lodash: {
      commonjs: 'lodash',
      commonjs2: 'lodash',
      amd: 'lodash',
      root: '_'
    },
  },
  module: {
    rules: [{
      test: /\.m?js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader'
      }
    }]
  },
  plugins: [
    process.env.npm_config_report && new BundleAnalyserPlugin()
  ].filter(Boolean)
};
