import terser from '@rollup/plugin-terser';

export default [
    // Standard build
    {
        input: 'src/js/index.js',
        output: {
            file: 'dist/swc.js',
            format: 'umd',
            name: 'SWC',
            sourcemap: true
        }
    },
    // Minified build
    {
        input: 'src/js/index.js',
        output: {
            file: 'dist/swc.min.js',
            format: 'umd',
            name: 'SWC',
            sourcemap: true
        },
        plugins: [terser()]
    },
    // Router builds
    // Standard build
    {
        input: 'src/js/router/index.js',
        output: {
            file: 'dist/swc-router.js',
            format: 'umd',
            name: 'SWC Router',
            sourcemap: true
        }
    },
    // Minified build
    {
        input: 'src/js/router/index.js',
        output: {
            file: 'dist/swc-router.min.js',
            format: 'umd',
            name: 'SWC Router',
            sourcemap: true
        },
        plugins: [terser()]
    }
];
