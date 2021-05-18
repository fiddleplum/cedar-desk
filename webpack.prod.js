const { merge } = require('webpack-merge');
const base = require('./webpack.base.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(base, {
	mode: 'none',
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					keep_classnames: true
				}
			})
		]
	}
});
