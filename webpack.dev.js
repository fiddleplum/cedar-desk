const merge = require('webpack-merge');
const base = require('./webpack.base.js');

module.exports = merge.merge(base, {
	mode: 'development',
	devtool: 'source-map'
});
