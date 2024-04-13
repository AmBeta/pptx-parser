const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',

  entry: './demo/main.js',

  output: {
    path: path.join(__dirname, '../dist'),
  },

  devServer: {
    contentBase: './dist',
  },

  resolve: {
    alias: {
      'pptx-parser': path.join(__dirname, '../src'),
    },
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ],
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: 'demo/index.html',
    }),
  ]
};
