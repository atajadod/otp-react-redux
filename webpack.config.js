const path = require('path')

const fs = require('fs-extra')
const webpack = require('webpack')

const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = async env => {
  // resolve the custom js file. If it is present, copy the file to a
  // temporary folder within this project so that the file will be able to
  // use the node_modules from this project
  let customJsFile = './config.js'
  if (env && env.JS_CONFIG) {
    const splitPath = env.JS_CONFIG.split(path.sep)
    customJsFile = `../tmp/${splitPath[splitPath.length - 1]}`
    // copy location is relative to root, while js file for app is relative to lib
    await fs.copy(env.JS_CONFIG, `./tmp/${splitPath[splitPath.length - 1]}`)
  }
  return {
    entry: [
      'babel-polyfill',
      './example.js',
      './example.css',
      './index.css'
    ],
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ['babel-loader']
        },
        {
          test: /\.(yml|yaml)$/,
          loader: ['json-loader', 'yaml-loader']
        },
        {
          test: /\.(sc|c)ss$/,
          use: [
            'css-hot-loader',
            MiniCssExtractPlugin.loader,            
            'css-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          use: [
            {
              loader: 'file-loader',
            },
          ],
        },
        {
          test: /\.(ttf|eot|svg|png|woff(2)?)(\?[a-z0-9]+)?$/,
          use: [{
            loader: 'file-loader', options: {esModule: false}
          }]
        }        
        // { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=999000&mimetype=application/font-woff" },
        // { test: /\.eot?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=999000&mimetype=application/font-woff" },
        // { test: /\.ttf?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=999000&mimetype=application/font-woff" },
        // { test: /\.(svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" }
        // { test: /\.(ttf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" }
        // {
        //   test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        //   use: [
        //     {
        //       loader: 'file-loader',
        //       options: {
        //         name: '[name].[ext]',
        //         outputPath: 'fonts/'
        //       }
        //     }
        //   ]
        // }                
      ]
    },
    resolve: {
      extensions: ['*', '.js', '.jsx']
    },
    output: {
      path: path.join(__dirname, '/dist'),
      publicPath: '',
      filename: 'bundle.js'
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: 'public/index.html',
        inject: 'body',
        filename: 'index.html'
      }),
      new MiniCssExtractPlugin(),
      new webpack.DefinePlugin({
        // Optionally override the default config file location with some other
        // file.
        YAML_CONFIG: JSON.stringify(env && env.YAML_CONFIG || './config.yml'),
        JS_CONFIG: JSON.stringify(customJsFile)
      })
    ],
    optimization: {
      minimizer: [
        new UglifyJsPlugin({}),
        new OptimizeCSSAssetsPlugin({})
      ]
    },
    devServer: {
      contentBase: './',
      historyApiFallback: true
    }
  }
}
// Encore.disableFontsLoader()
//   .addLoader(  {
//     test: /\.(ttf|eot|svg|png|woff(2)?)(\?[a-z0-9]+)?$/,
//     use: [{
//       loader: 'file-loader', options: {esModule: false}
//     }]
//   })