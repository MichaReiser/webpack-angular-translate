var webpack = require("webpack"),
    WebPackAngularTranslate = require("webpack-angular-translate");


module.exports = {
    entry: './app.js',
    output: {
        path: "dist",
        filename: "[name].js"
    },
    debug: true,

    module: {
        preLoaders: [
            {
                test: /\.js$/,
                loader: WebPackAngularTranslate.jsLoader()
            },
			      {
                test: /\.html$/,
                loader: WebPackAngularTranslate.htmlLoader()
            }
        ],

        loaders: [
            {
                test: /\.html$/,
                loader: 'html?removeEmptyAttributes=false&collapseWhitespace=false'
            }
        ]
    },

    plugins: [
        new WebPackAngularTranslate.Plugin()
    ]
};
