var cheerio = require('cheerio'),
    Translation = require('./Translation');

var angularExpressionRegex = /^{{.*}}$/;
var translateAttributeRegex = /^translate-attr-.*$/;

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
 *
 * The following cases are supported:
 * @example
 * <span translate>TRANSLATE-ID</span>
 * <translate>TRANSLATE-ID</translate>
 *
 * <span translate translate-default="Default Text">TRANSLATE-ID</span>
 * <translate translate-default="Default Text">TRANSLATE-ID</translate>
 *
 * <span translate translate-attr-title="TRANSLATE-ID">Content</span>
 * <translate translate-attr-title="TRANSLATE-ID">Content</translate>
 *
 * <span translate translate-attr-title="TRANSLATE-ID" translate-default-attr-title="Default Text">Content</span>
 *
 * @param source the content of the file (expected to be html or xml)
 * @param sourceMaps the source maps
 */
function loader(source, sourceMaps) {
    "use strict";

    var loader = this;
    this.cacheable();

    var $ = cheerio.load(source),
        elements = $('translate, [translate]');

    elements.get().map(function (element) {
        var $element = $(element),
            translations;

        translations = extractAttributeTranslations.call(loader, element);

        // If we have no attribute translations, then the content should be translated
        if (translations.length === 0) {
            translations = [ extractContentTranslation.call(loader, $element) ];
        }

        translations = filterOutAngularExpressions.call(loader, translations, $element);
        translations.forEach(loader.registerTranslation.bind(loader));
    });

    $('[suppress-dynamic-translation-error]').removeAttr('suppress-dynamic-translation-error');
    var result = $.html();

    this.callback(null, result, sourceMaps);
}

/**
 * Extracts the content translation (e.g. <span translate>ID</span>
 * @param $element the element to process
 * @returns {Translation} the translation
 * @this loader
 */
function extractContentTranslation ($element) {
    var translationId,
        defaultText;

    if ($element.attr('translate')) {
        translationId = $element.attr('translate');
    } else {
        translationId = $element.text();
    }

    defaultText = $element.attr('translate-default');

    return new Translation(translationId, defaultText, this.resourcePath);
}

/**
 * Extracts all the translate-attr-ATTR translations
 * @example
 * <span translate translate-attr-title="Login">Login</span>
 * <span translate translate-attr-title="Login" translate-default-attr-title="Anmelden">Login</span>
 *
 * @param element the element to process
 * @returns {Translation[]} array containing all attribute translations
 * @this loader
 */
function extractAttributeTranslations (element) {
    var translationAttributes = Object.keys(element.attribs).filter(function (attributeName) {
        return translateAttributeRegex.test(attributeName);
    });

    return translationAttributes.map(function (attributeName) {
        var translateId = element.attribs[attributeName],
            translatedAttributeName = attributeName.replace('translate-attr-', ''),
            defaultText = element.attribs["translate-default-attr-" + translatedAttributeName];

        return new Translation(translateId, defaultText, this.resourcePath);
    });
}

/**
 * Validates that neither the translation id nor the default text are an angular expression.
 * The function filters out the translation containing an angular expression and emits an error
 * if the suppress-dynamic-translation is missing
 * @param translations [Translation] the translations to filter
 * @param $element the element from which the translations have been extracted
 * @returns [Translations] all translations which do not contain an angular expression
 * @this loader
 */
function filterOutAngularExpressions(translations, $element) {
    var loader = this;
    return translations.filter(function (translation) {
        if (isAngularExpression(translation.id) || isAngularExpression(translation.defaultText)) {
            if (!$element.is('[suppress-dynamic-translation-error]')) {
                loader.emitError("The translation " + translation + " uses an angular expression as translation id or as default text, " +
                    "this is not supported. To suppress this error attribute the element with suppress-dynamic-translation-error.");
            }
            return false;
        }

        return true;
    });
}

module.exports = loader;