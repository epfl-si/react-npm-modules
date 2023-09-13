import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
	input: 'dist/index.js',
	output: {
		dir: 'dist/cjs',
		format: 'cjs'
	},
        plugins: [commonjs(), nodeResolve(), terser()]
};
