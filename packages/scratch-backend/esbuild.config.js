const esbuild = require('esbuild');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const watch = process.argv.includes('--watch');

const buildOptions = {
    entryPoints: [path.join(__dirname, 'src/server.js')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: path.join(__dirname, 'dist/server.js'),
    external: [
        // Native Node.js modules that should not be bundled
        'fs',
        'path',
        'http',
        'https',
        'net',
        'tls',
        'crypto',
        'stream',
        'util',
        'events',
        'buffer',
        'process',
        'os',
        'url',
        'zlib',
        'querystring',
        'child_process',
        'cluster',
        'dgram',
        'dns',
        'readline',
        'repl',
        'string_decoder',
        'tty',
        'vm',
        'worker_threads',
        // Native npm modules that should not be bundled (require native compilation)
        'canvas',
        'canvas-toBlob',
        // jsdom has issues with require.resolve for relative paths - mark as external
        'jsdom'
        // @scratch/scratch-vm will be bundled (it's a local workspace package)
    ],
    minify: isProduction,
    sourcemap: !isProduction,
    keepNames: true,
    banner: {
        js: '#!/usr/bin/env node'
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
    },
    logLevel: 'info'
};

if (watch) {
    esbuild.context(buildOptions).then(ctx => {
        ctx.watch();
        console.log('👀 Watching for changes...');
    }).catch(() => process.exit(1));
} else {
    esbuild.build(buildOptions).catch(() => process.exit(1));
}
