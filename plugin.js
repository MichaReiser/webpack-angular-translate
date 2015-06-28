var OriginalSource = require('webpack/lib/OriginalSource');

function TranslationMergeError (existing, newTranslation) {
    this.message = "Webpack-Angular-Translate: Two translations with the same id but different default text found (" + existing + ", "
        + newTranslation + "). Please define the same default text twice or specify the default text only once.";
}

/**
 * This functions merges the translations with the same translation-id into a single translation.
 * If the default text of the two translations are different, an error is emitted (but processing continues).
 * If only one translation defines a default text, then this default text is used
 *
 * @param translations {Translation[]} the translations to merge
 * @returns [Translation] an array only containing a single Translation for a translation id
 */
function mergeTranslations(translations) {
    var merged = {};

    for (var translation of translations) {
        var existingEntry = merged[translation.id];

        // If both entries define a default text that doesn't match, emit an error
        if (existingEntry && existingEntry.defaultText !== translation.defaultText && existingEntry.defaultText && translation.defaultText) {
            throw new TranslationMergeError(existingEntry, translation);
        } else {
            merged[translation.id] = existingEntry ? translation.merge(existingEntry) : translation;
        }
    };

    return Object.keys(merged).map(function (key) {
        return merged[key];
    });
}

/**
 * Transforms an array of translations into an object hash where the id of the translation is used as key and the default
 * value is assigned to the value.
 * @param translations [Translation] the translations to convert
 * @returns {String:String} the object hash containing the translation id and the default text
 */
function toContent(translations) {
    var result = {};

    for (var translation of translations) {
        result[translation.id] = translation.defaultText || translation.id;
    };

    return JSON.stringify(result);
}

function AngularTranslatePlugin () {
    this.translations = [];
}

/**
 * Entry function from webpack that registers the plugin in the required-build-phases
 * @param compiler
 */
AngularTranslatePlugin.prototype.apply = function (compiler) {
    var self = this;

    compiler.plugin('compilation', function (compilation) {

        /**
         * Register the plugin to the normal-module-loader and expose the registerTranslations function in the loaderContext.
         * This way the loader can communicate with the plugin and pass the translations to the plugin.
         */
        compilation.plugin("normal-module-loader", function(loaderContext, module) {
            loaderContext.registerTranslations = self.registerTranslations.bind(self);
        });
    });

    /**
     * When the compilation is complete, merge all the translations and emit the translations into the translations.js
     */
    compiler.plugin('emit', function (compilation, callback) {
        var ex = null;
        try {
            var merged = mergeTranslations(self.translations, compilation);
            var content = toContent(merged);
            var source = new OriginalSource(content, "translations");
            compilation.assets["translations.js"] = source;
        } catch (error) {
            ex = error;
        }
        callback(ex, null);
    });
};

AngularTranslatePlugin.prototype.registerTranslations = function (translations) {
    this.translations = this.translations.concat(translations);
};

module.exports = AngularTranslatePlugin;