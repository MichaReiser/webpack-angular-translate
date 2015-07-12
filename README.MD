# webpack-angular-translate

[![Build Status](https://travis-ci.org/DatenMetzgerX/webpack-angular-translate.svg?branch=master)](https://travis-ci.org/DatenMetzgerX/webpack-angular-translate)

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
If a dynamic translation is used, then the translation needs to be registered. To do so, the `i18n.registerTranslations({ translationId: defaultText })` function
can be used. This might be helpful if the translation id is dynamically composed from a value of a domain object but the set of all possible combinations is known. 
The registered translations are merged into the outputted json file. The function calls will be replaced by `(0);`. If 
UglifyJS is used for minification, then those calls will be removed entirely. 

An alternative is `i18n.registerTranslation(translationId, defaultText?)`. This function is intended to be used when the 
translation id's are known in the javascript code but not known in the html file. Following an example where the title 
is dynamiclly set depending if it is a new item or an existing one:

```html
<h2 translate suppress-dynamic-translation-error>{{editCtrl.title}}</h2>
```

The controller defines the id of the translation to use:

 ```js
 function EditController(user) {
 	if (user.isNew()) {
    	this.title = i18n.registerTranslation("NEW_USER", "New user");
    } else {
    	this.title = i18n.registerTranslation("EDIT_USER", "Edit user");
	}
}
      
var editState = {
	name: "edit",
    url: "/{id:int}/edit",
    template: require("./registerTranslation.html"),
    controller: EditController,
    controllerAs: "editCtrl"
};
 ```
 
 The call to `i18n.registerTranslation` registers the translation id with the default text (optional). The result of the 
 function is the id of the translation to use. This makes it possible to register translations in place. Calls to `i18n.registerTranslation` 
 compile to the passed in translation id (the function is not evaluated at runtime).

## Open issues
* Extend documentation
* Emit errors when $translate service is used with non literal-arguments
* Make output file name configurable
* support require calls in i18n.registerTranslations
* Emit warnings if $translate.instant or the filter are used
* Reenable support for registerTranslations