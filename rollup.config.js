import terser from '@rollup/plugin-terser';

export default [
    // Core — ESM
    {
        input: 'src/js/index.js',
        output: {
            file: 'dist/swc.js',
            format: 'es',
            sourcemap: true
        }
    },
    // Core — ESM minified
    {
        input: 'src/js/index.js',
        output: {
            file: 'dist/swc.min.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [terser()]
    },
    // Core — UMD (script tag / CDN use)
    {
        input: 'src/js/index.js',
        output: {
            file: 'dist/swc.umd.js',
            format: 'umd',
            name: 'SWC',
            sourcemap: true
        },
        plugins: [terser()]
    },
    // Router — ESM
    {
        input: 'src/js/router/index.js',
        output: {
            file: 'dist/swc-router.js',
            format: 'es',
            sourcemap: true
        }
    },
    // Router — ESM minified
    {
        input: 'src/js/router/index.js',
        output: {
            file: 'dist/swc-router.min.js',
            format: 'es',
            sourcemap: true
        },
        plugins: [terser()]
    },
    // Router — UMD (script tag / CDN use)
    {
        input: 'src/js/router/index.js',
        output: {
            file: 'dist/swc-router.umd.js',
            format: 'umd',
            name: 'SWCRouter',
            sourcemap: true
        },
        plugins: [terser()]
    }
];
