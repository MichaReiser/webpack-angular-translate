var OriginalSource = require('webpack/lib/OriginalSource'),
    extend = require('util')._extend;
var Translation = require("./Translation");

function TranslationMergeError (existing, newTranslation) {
    this.message = "Webpack-Angular-Translate: Two translations with the same id but different default text found (" + existing + ", "
        + newTranslation + "). Please define the same default text twice or specify the default text only once.";
}

/**
 * Stateful plugin that keeps the found translations stored in this.translations.
 * @property translations object hash where the translation id is used to retrieve the Translation object.
 * @constructor
 */
function AngularTranslatePlugin (options) {
    this.options = extend({ fileName: 'translations.json' }, options);
    this.translations = {};
}

/**
 * Entry function from webpack that registers the plugin in the required-build-phases
 * @param compiler
 */
AngularTranslatePlugin.prototype.apply = function (compiler) {
    var self = this;
    this.compiler = compiler;

    compiler.plugin('compilation', function (compilation) {
        self.compilation = compilation;
        /**
         * Register the plugin to the normal-module-loader and expose the registerTranslation function in the loaderContext.
         * This way the loader can communicate with the plugin and pass the translations to the plugin.
         */
        compilation.plugin("normal-module-loader", function(loaderContext) {
            loaderContext.registerTranslation = self.registerTranslation.bind(self);
        });
    });

    compiler.plugin('emit', this.emitResult.bind(this));
};

/**
 * Registers a new translation that should be included in the output
 * @param translation {Translation} the translation to register
 */
AngularTranslatePlugin.prototype.registerTranslation = function (translation) {
    var existingEntry = this.translations[translation.id];

    // If both entries define a default text that doesn't match, emit an error
    if (existingEntry && existingEntry.defaultText !== translation.defaultText && existingEntry.defaultText && translation.defaultText) {
        this.compilation.errors.push(new TranslationMergeError(existingEntry, translation));
    } else {
        this.translations[translation.id] = existingEntry ? translation.merge(existingEntry) : translation;
    }
};

/**
 * When the compilation is complete, merge all the translations and emits the translations into the translations.json
 */
AngularTranslatePlugin.prototype.emitResult = function (compilation, callback) {
    var result = {};

    Object.keys(this.translations).forEach(function (translationId) {
        var translation = this.translations[translationId];
        result[translationId] = translation.text();
    }, this);

    var content = JSON.stringify(result, null, '\t');
    compilation.assets[this.options.fileName] = new OriginalSource(content, this.options.fileName);
    callback();
};
module.exports = AngularTranslatePlugin;