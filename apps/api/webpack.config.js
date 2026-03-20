const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`

    // Set context explicitly to the API app directory so it stops looking at the root
    config.context = __dirname;

    // explicitly map aliases to avoid ts-node / plugin bugs resolving ./src
    config.resolve = config.resolve || {};
    config.resolve.alias = {
        ...config.resolve.alias,
        '@must-iq/shared-types': require('path').resolve(__dirname, '../../libs/shared-types/src/index.ts'),
        '@must-iq/db': require('path').resolve(__dirname, '../../libs/db/src/index.ts'),
        '@must-iq/config': require('path').resolve(__dirname, '../../libs/config/src/index.ts'),
    };

    // Disable ForkTsCheckerWebpackPlugin to prevent OOM crashes and speed up dev builds.
    // TypeScript errors are still visible as red squiggles in VS Code.
    const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
    config.plugins = config.plugins.filter(p => !(p instanceof ForkTsCheckerWebpackPlugin));

    return config;
});
