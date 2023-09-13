import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
	input: 'dist/index.js',
	output: {
                name: "Appauth",
		file: 'dist/umd/bundle.min.js',
		format: 'umd'
	},
        plugins: [commonjs(), nodeResolve(), terser()]
};
