Example:


```js
var WebPackAngularTranslate = require("webpack-angular-translate");
...

module: {
	postLoaders: [
		{
			test: /\.html$/,
			loader: WebPackAngularTranslate.loader()
		}
	]
},

plugins: [
	new WebPackAngularTranslate.Plugin()
]
``