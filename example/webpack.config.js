const WebPackAngularTranslate = require("../");
const path = require("path");

module.exports = {
  entry: "./app.js",
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js"
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
            options: {
              removeEmptyAttributes: false,
              attrs: []
            }
          },
          {
            loader: WebPackAngularTranslate.htmlLoader()
          }
        ]
      },
      {
        test: /\.js/,
        loader: WebPackAngularTranslate.jsLoader(),
        options: {
          parserOptions: {
            sourceType: "module"
          }
        }
      }
    ]
  },

  plugins: [new WebPackAngularTranslate.Plugin()]
};
