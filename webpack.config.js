/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

// Full webpack documentation: [https://webpack.js.org/configuration/]().
// In short, the config-files defines the entry point of the extension, to use TypeScript, to produce a commonjs-module, and what modules not to bundle.
// Using webpack helps reduce the install- and startup-time of large extensions because instead of hundreds of files, a single file is produced.

'use strict';

const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin')

/**@type {import('webpack').Configuration}*/
const config = {
    // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    target: 'node',
    context: __dirname,
    node: {
        // For __dirname and __filename, use the path to the packed .js file (true would mean the relative path to the source file)
        __dirname: false,
        __filename: false
    },
    entry: {
        // the entrypoint of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
        extension: './entry.ts', // asdf

        // Entrypoint for the language server
        './dockerfile-language-server-nodejs/lib/server': './node_modules/dockerfile-language-server-nodejs/lib/server.js',
    },
    output: {
        // The bundles are stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]"
    },
    devtool: 'source-map',
    externals: [
        {
            // Modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/

            // the vscode-module is created on-the-fly and must be excluded.
            vscode: 'commonjs vscode',

            // util/getCoreNodeModule.js uses a dynamic require, so we'll just use it directly as a .js file.
            // Note that the source is in .js and not .ts because we don't want webpack to depend on npm run build
            './getCoreNodeModule': 'commonjs getCoreNodeModule',
        }
    ],
    plugins: [
        // Clean the dist folder before webpacking
        new CleanWebpackPlugin(
            ['dist'],
            {
                root: __dirname,
                verbose: true,
            }),

        // Copy getCoreNodeModule.js to where it can be found by Node.js as an external
        new CopyWebpackPlugin([
            { from: './utils/getCoreNodeModule.js', to: 'node_modules' }
        ]),

        // Copy images folder
        new CopyWebpackPlugin([
            { from: './images', to: 'images' }
        ]),

        // vscode-languageserver/lib/files.js has one function which uses a dynamic require, but is not currently used by any dependencies
        // Replace with a version that has only what is actually used.
        new webpack.NormalModuleReplacementPlugin(
            /[/\\]vscode-languageserver[/\\]lib[/\\]files\.js/,
            require.resolve('./build/vscode-languageserver-files-stub.js')
        ),

        // Solve critical dependency issue in ./node_modules/ms-rest/lib/serviceClient.js (request of a dependency is an expression)
        // for this line:
        //
        //   let data = require(packageJsonPath);
        //
        new webpack.ContextReplacementPlugin(
            // Whenever there is a dynamic require that webpack can't analyze at all (i.e. resourceRegExp=/^\./), ...
            /^\./,
            (context) => {
                // ... and the call was from within node_modules/ms-rest/lib...
                if (/node_modules[/\\]ms-rest[/\\]lib/.test(context.context)) {
                    // CONSIDER: Figure out how to make this work properly. The consequences of ignoring this error are that
                    // the Azure SDKs (e.g. azure-arm-resource) don't get their info stamped into the user agent info for their calls.

                    // // ... tell webpack that the call may be loading any of the package.json files from the 'node_modules/azure-arm*' folders
                    // // so it will include those in the package to be available for lookup at runtime
                    // context.request = path.resolve(__dirname, 'node_modules');
                    // context.regExp = /azure-arm.*package\.json/;

                    // Tell webpack we've solved the critical dependency issue
                    for (const d of context.dependencies) {
                        if (d.critical) d.critical = false;
                        console.log('changed');
                    }
                }
            })
    ],
    resolve: {
        // Support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    // Note: the TS loader will transpile the .ts file directly during webpack, it doesn't use the out folder.
                    // CONSIDER: awesome-typescript-loader (faster?)
                    loader: 'ts-loader'
                }]
            },

            {
                // Unpack UMD module headers used in some modules since webpack doesn't
                // handle them.
                test: /dockerfile-language-service|vscode-languageserver-types/,
                use: { loader: 'umd-compat-loader' }
            },

            // Note: If you use`vscode-nls` to localize your extension than you likely also use`vscode-nls-dev` to create language bundles at build time.
            // To support webpack, a loader has been added to vscode-nls-dev .Add the section below to the`modules/rules` configuration.
            // {
            //     // vscode-nls-dev loader:
            //     // * rewrite nls-calls
            //     loader: 'vscode-nls-dev/lib/webpack-loader',
            //     options: {
            //         base: path.join(__dirname, 'src')
            //     }
            // }
        ]
    }
};

module.exports = config;
