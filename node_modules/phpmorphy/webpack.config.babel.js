import fs from 'fs';
import path from 'path';
import glob from 'glob';
import BannerPlugin from 'webpack/lib/BannerPlugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import CircularDependencyPlugin from 'circular-dependency-plugin';

const cwd = process.cwd();
const isProduction = process.env.NODE_ENV == 'production';
const SCRIPTS_SOURCES = 'src';
const SCRIPTS_TARGET = 'build';

/** список npm-зависимостей */
const nodeModules = fs.readdirSync('node_modules').filter(x => !['.bin'].includes(x));
/**
 * Основной webpack-конфиг.
 * Настраивать можно любые опции - никаких побочных эффектов
 * на остальных этапах настройки сборки быть не должно
 */
const config = {
  context: cwd,
  target: 'node',
  recordsPath: path.join(cwd, SCRIPTS_TARGET, '_records'),
  /**
   * Ищем в директории-контексте вот такие файлы: `/\/[^_]{1}[^\\\\\/]*\.jsx?/`
   * (т.е. js/jsx и имена у которых не начинаются с нижнего подчёркивания)
   * и из полученного массива собираем формат для вебпака:
   * { 'entry1': './entry1.js', 'entry2': './entry2.jsx' }
   */
  entry: glob.sync(`${SCRIPTS_SOURCES}/!(_)*.js`).reduce((entries, file) => {
    const entryName    = path.basename(file, path.extname(file));
    entries[entryName] = [
      // 'babel-polyfill',
      './'+ file
    ];
    
    return entries;
  }, {}),
  output: {
    filename: `[name].js`,
    chunkFilename: `[name].js`,
    /** папка назначения */
    path: path.join(cwd, SCRIPTS_TARGET),
    libraryTarget: "commonjs-module"
  },
  node: {
    __dirname: false,
    __filename: false
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.json', '.json5', '.node'],
    modules: ['node_modules'],
    alias: {}
  },
  resolveLoader: {
    moduleExtensions: ['-loader']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      }
    ],
  },
  externals: [
    function (context, request, cb) {
      const pathStart = request.split('/')[0];
      if (nodeModules.indexOf(pathStart) >= 0) {
        return cb(null, "commonjs " + request);
      }
      cb();
    }
  ],
  watchOptions: {
    aggregateTimeout: 200,
  },
  plugins: [
    new CopyWebpackPlugin([{
      context: SCRIPTS_SOURCES,
      from: '**/*.!(js)',
      to: ''
    }]),
    new CircularDependencyPlugin({ failOnError: false })
  ].concat(isProduction ? [] : [
    new BannerPlugin({
      banner: `require('source-map-support').install({ environment: 'node' });`,
      raw: true,
      entryOnly: false
    })
  ]),
  stats: {
    colors: true,
    chunks: false,
    modules: false,
    origins: false,
    entrypoints: true,
  }
};

export default config;
