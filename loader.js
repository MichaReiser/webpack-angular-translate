var cheerio = require('cheerio'),
    loaderUtils = require('loader-utils'),
    Translation = require('./Translation');

var angularExpressionRegex = /^{{.*}}$/;
function isAngularExpression(value) {
    return angularExpressionRegex.test(value);
}


/**
 * Loader that must be used together with the plugin. The loader parses the html content and extracts all
 * translate elements, elements with a translate attribute or translate filters.
 *
 * The loader communicates with the plugin by the registerTranslations functions provided by the plugin (loader.registerTranslations).
 * The plugin is then responsible for merging the translations and emitting them.
 *
 * The plugin is required because the loader doesn't know when all files have been processed.
 * @param source the content of the file (expected to be html or xml)
 * @param sourceMaps the source maps
 */
function loader(source, sourceMaps) {
    "use strict";

    var loader = this;
    this.cacheable();

    var $ = cheerio.load(source),
        elements = $('translate, [translate]');

    var translations = elements.map(function (index, element) {
        var $element = $(element),
            translationId,
            defaultText;

        if ($element.attr('translate')) {
            translationId = $element.attr('translate');
        } else {
            translationId = $element.text();
        }

        defaultText = $element.attr('translate-default');


        if (isAngularExpression(translationId) || isAngularExpression(defaultText)) {
            if ($element.is('[suppress-dynamic-translation]')) {
                $element.removeAttr('suppress-dynamic-translation');
            } else {
                loader.emitError("The resource " + loader.resourcePath + " uses an angular expression as translation id or as default text, " +
                    "this is not supported. To supress this error attribute the element with suppress-dynamic-translation.");
            }

            return {};
        }

        return new Translation(translationId, defaultText, loader.resourcePath);
    });

    this.registerTranslations(translations.get());

    this.callback(null, source, sourceMaps);
}

module.exports = loader;