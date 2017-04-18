"use strict";
var RawSource = require('webpack/lib/RawSource'), extend = require('util')._extend;
var translations_registry_1 = require("./translations-registry");
/**
 * Stateful plugin that keeps the found translations stored in this.translations.
 * @property translations object hash where the translation id is used to retrieve the Translation object.
 * @constructor
 */
var AngularTranslatePlugin = (function () {
    function AngularTranslatePlugin(options) {
        this.translationsRegistry = new translations_registry_1.default();
        this.options = extend({ fileName: 'translations.json' }, options);
    }
    /**
     * Entry function from webpack that registers the plugin in the required-build-phases
     * @param compiler
     */
    AngularTranslatePlugin.prototype.apply = function (compiler) {
        var _this = this;
        this.compiler = compiler;
        compiler.plugin('compilation', function (compilation) {
            _this.compilation = compilation;
            /**
             * Register the plugin to the normal-module-loader and expose the registerTranslation function in the loaderContext.
             * This way the loader can communicate with the plugin and pass the translations to the plugin.
             */
            compilation.plugin("normal-module-loader", function (loaderContext) {
                loaderContext.registerTranslation = _this.registerTranslation.bind(_this);
                loaderContext.pruneTranslations = _this.translationsRegistry.pruneTranslations.bind(_this.translationsRegistry);
            });
        });
        compiler.plugin('emit', this.emitResult.bind(this));
    };
    /**
     * Registers a new translation that should be included in the output
     * @param translation {Translation} the translation to register
     */
    AngularTranslatePlugin.prototype.registerTranslation = function (translation) {
        try {
            this.translationsRegistry.registerTranslation(translation);
        }
        catch (e) {
            if (e instanceof translations_registry_1.EmptyTranslationIdError) {
                this.compilation.warnings.push(e);
            }
            else if (e instanceof translations_registry_1.TranslationRegistrationError) {
                this.compilation.errors.push(e);
            }
            else {
                throw e;
            }
        }
    };
    AngularTranslatePlugin.prototype.emitResult = function (compilation, callback) {
        // Only create the file if it is not empty.
        // Fixes an issue with karma-webpack where the build fails when the asset is emitted.
        if (!this.translationsRegistry.empty) {
            var translations = this.translationsRegistry.toJSON();
            var content = JSON.stringify(translations, null, '\t');
            compilation.assets[this.options.fileName] = new RawSource(content, this.options.fileName);
        }
        callback();
    };
    ;
    return AngularTranslatePlugin;
}());
exports.AngularTranslatePlugin = AngularTranslatePlugin;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AngularTranslatePlugin;
//# sourceMappingURL=angular-translate-plugin.js.map