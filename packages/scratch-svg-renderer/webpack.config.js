const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const common = {
    libraryName: 'scratch-svg-renderer',
    rootPath: path.resolve(__dirname)
};

const baseConfig = new ScratchWebpackConfigBuilder(common)
    .merge({
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/'),
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'),
                util: require.resolve('util/'),
                process: require.resolve('process/browser')
            }
        }
    });

/**
 * @type {import('webpack').Configuration}
 */
const nodeConfig = baseConfig.clone()
    .setTarget('node')
    .merge({
        output: {
            path: path.resolve(__dirname, 'dist/node'),
            library: {
                name: 'ScratchSVGRenderer',
                type: 'umd'
            }
        }
    })
    .get();

/**
 * @type {import('webpack').Configuration}
 */
const webConfig = baseConfig.clone()
    .setTarget('browserslist')
    .merge({
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/'),
                buffer: require.resolve('buffer/'),
                stream: require.resolve('stream-browserify'),
                util: require.resolve('util/'),
                process: require.resolve('process/browser'),
                jsdom: false
            }
        },
        output: {
            path: path.resolve(__dirname, 'dist/web'),
            library: {
                name: 'ScratchSVGRenderer',
                type: 'umd'
            }
        }
    })
    .get();

/**
 * @type {import('webpack').Configuration}
 */
const playgroundConfig = baseConfig.clone()
    .setTarget('browserslist')
    .merge({
        devServer: {
            contentBase: false,
            port: process.env.PORT || 8576
        },
        output: {
            path: path.resolve(__dirname, 'playground'),
            library: {
                name: 'ScratchSVGRenderer',
                type: 'umd'
            },
            publicPath: '/'
        }
    })
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/playground'
                }
            ]
        })
    )
    .get();

module.exports = [
    nodeConfig,
    webConfig,
    playgroundConfig
];
