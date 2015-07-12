# webpack-angular-translate
This plugin extracts the translation id's and default texts from angular-translate and writes them into a separate json file. 
The json file can be used by a backend component to initialize all the used translations. The benefit of this approach is, 
that the fronten developer can define all translations directly in the frontend code and do not need to modify any backend-code.

## Getting started

Install the plugin using npm:

```bash
npm install webpack-angular-translate
```

Add the plugin to your wepback.config.js:


```js
var WebPackAngularTranslate = require("webpack-angular-translate");


module: {
	preLoaders: [
		{
			test: /\.html$/,
			loader: WebPackAngularTranslate.loader()
		}
	]
},

plugins: [
	new WebPackAngularTranslate.Plugin()
]
```

## Supported Expressions

### Directive
The directive is supported for static translations. Dynamic translations are not supported.

```html
<div translate>TRANSLATE-ID</div>
<translate>TRANSLATE-ID</div>

<div translate="TRANSLATE-ID"></div>
<translate="TRANSLATE-ID"></translate>

<div translate translate-default="Default text">Translate-ID</div>
<translate translate-default="Default text">Translate-ID</div>

<!-- extension to angular-translate, define default for attributes -->
<div translate translate-attr-title="TITLE-ID" translate-default-attr-title="Default for title attr" />
```

The plugin emits an error if a dynamic expression is used in the directive. To suppress the error, use the `suppress-dynamic-translate-error` attribute
on the element with the dynamic translation. This attribute is removed from the resulting html code.
 
### Filter
The filter is not supported. No errors are emitted if the filter is used.

### Service
The `$translate` service is supported for literals only. No dynamic translations are supported. It's required
that the `$translate` service is always called `$translate`. `$translate.instant` is not supported.
 
 
## Register dynamic translations
If a dynamic translation is used, then the translation needs to be registered. To do so, the `i18n.registerTranslations({ translationId: defaultText } | translationId, defaultText)` function
can be used. The registered translations are merged into the outputted json file. The function calls will be repalced by `(0);`. If 
UglifyJS is used for minification, then those calls will be removed entirely. 

## Open issues
* Extend documentation
* Emit errors when $translate service is used with non literal-arguments
* Make output file name configurable
* support require calls in i18n.registerTranslations
* Emit warnings if $translate.instant or the filter are used