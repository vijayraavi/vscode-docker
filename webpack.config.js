/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

// Full webpack documentation: [https://webpack.js.org/configuration/]().
// In short, the config-files defines the entry point of the extension, to use TypeScript, to produce a commonjs-module, and what modules not to bundle.

'use strict';

const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackEntriesPlugin = require('webpack-entries-plugin');
const WebpackWatchedGlobEntries = require('webpack-watched-glob-entries-plugin');
const resolve = require('path').resolve;
const glob = require('glob');

const ENV = process.env.NODE_ENV = process.env.ENV = 'production';

const testRoot = path.resolve(__dirname, 'out', 'test');
let testFiles = glob.sync("*.js", { absolute: false, cwd: testRoot });
let testEntries = {};
for (let file of testFiles) {
    testEntries[`${path.join('test', path.dirname(file), path.basename(file))}`] = `./out/test/${file}`;
}
console.log(testEntries);

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    node: {
        // Use normal Node.js behavior for __dirname and __filename (set to folder/file of the bundle .js file)
        __dirname: false,
        __filename: false
    },
    entry: {
        // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
        extension: './entry.ts',
        './node_modules/dockerfile-language-server-nodejs/lib/server': './node_modules/dockerfile-language-server-nodejs/lib/server.js',
        'ms-rest/lib/msRest': './node_modules/ms-rest/lib/msRest.js',
        'test/index': './out/test/index.js',
        ...testEntries
    },
    // {
    // // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    // extension: './entry.ts',
    // './node_modules/dockerfile-language-server-nodejs/lib/server': './node_modules/dockerfile-language-server-nodejs/lib/server.js',
    // 'ms-rest/lib/msRest': './node_modules/ms-rest/lib/msRest.js',
    // 'test/index': './out/test/index.js'
    // },
    // entries: [
    //     resolve('out/test/:name') // `: name` will automatically be mapped as entry name
    // ],
    output: { // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: "commonjs",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: [
        {
            vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/

            // util/getCoreNodeModule.js uses a dynamic require, which webpack can't handle
            './getCoreNodeModule': 'commonjs getCoreNodeModule',

            // ms-rest's serviceClient makes assumptions about its folder structure on disk
            './serviceClient': 'commonjs ms-rest/lib/serviceClient',

            'mocha': 'commonjs mocha',
            'adm-zip': 'commonjs adm-zip'
        },
    ],
    plugins: [
        //new WebpackEntriesPlugin(),
        // Ignore dynamic require in vscode-nls (in vscode-azureextensionui) for now, since we're not localized
        //new webpack.IgnorePlugin(/vscode-nls/),
        new CopyWebpackPlugin([
            { from: './out/utils/getCoreNodeModule.js', to: './node_modules' }
        ])
        // new webpack.ContextReplacementPlugin(
        //     // The criterion to search: './node_modules/ms-rest/lib sync recursive'
        //     ///.\/node_modules\/ms-rest\/lib/,
        //     /node_modules\/ms-rest/,

        //     // The new directory to look for the files
        //     path.resolve(__dirname, 'node_modules/ms-rest'),

        //     // The new recursive flag. True by default.
        //     // Pass false to disable recursive lookup
        //     //false,

        //     // The new regular expression to match
        //     // and import the files.
        //     // Specify the mapping in form of
        //     // { runtime request : compile-time request }
        //     // IMPORTANT: runtime request should exactly match
        //     // the text that is passed into `require()`
        //     // IMPORTANT: compile-time request should be relative
        //     // to the directory from the previous parameter
        //     {
        //         'package.json': 'package.json'
        //     }
        //)
    ],
    resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    // CONSIDER: awesome-typescript-loader (faster?)
                    loader: 'ts-loader',
                }]
            },
            // { // asdf
            //     // vscode-nls-dev loader:
            //     // * rewrite nls-calls
            //     loader: 'vscode-nls-dev/lib/webpack-loader',
            //     options: {
            //         base: path.join(__dirname, 'src')
            //     }
            // },
            {
                // Unpack UMD module headers used in some modules since webpack doesn't
                // handle them well
                test: /dockerfile-language-service|vscode-languageserver/,
                use: { loader: 'umd-compat-loader' }
            }
        ]
    }
}

module.exports = config;
