const RawSource = require('webpack/lib/RawSource'),
    extend = require('util')._extend;
import { Plugin, Compiler, Compilation } from "webpack";

import LoaderContext = webpack.LoaderContext;
import Translation from "./translation";
import TranslationsRegistry, { TranslationRegistrationError, EmptyTranslationIdError } from "./translations-registry";
import TranslateLoaderContext from "./translate-loader-context";

interface TranslateOptions {
    /**
     * The name of the output file
     */
    fileName?: string;
}

/**
 * Stateful plugin that keeps the found translations stored in this.translations.
 * @property translations object hash where the translation id is used to retrieve the Translation object.
 * @constructor
 */
export class AngularTranslatePlugin implements Plugin {
    private options: TranslateOptions;
    private compiler: Compiler;
    private compilation: Compilation;
    private translationsRegistry = new TranslationsRegistry();

    constructor (options: TranslateOptions) {
        this.options = extend({fileName: 'translations.json'}, options);
    }

    /**
     * Entry function from webpack that registers the plugin in the required-build-phases
     * @param compiler
     */
    apply(compiler: Compiler) {
        this.compiler = compiler;

        compiler.plugin('compilation', (compilation: Compilation) => {
            this.compilation = compilation;
            /**
             * Register the plugin to the normal-module-loader and expose the registerTranslation function in the loaderContext.
             * This way the loader can communicate with the plugin and pass the translations to the plugin.
             */
            compilation.plugin("normal-module-loader", (loaderContext: TranslateLoaderContext) => {
                loaderContext.registerTranslation = this.registerTranslation.bind(this);
                loaderContext.pruneTranslations = this.translationsRegistry.pruneTranslations.bind(this.translationsRegistry);
            });
        });

        compiler.plugin('emit', this.emitResult.bind(this));
    }

    /**
     * Registers a new translation that should be included in the output
     * @param translation {Translation} the translation to register
     */
    registerTranslation(translation: Translation) {
        try {
            this.translationsRegistry.registerTranslation(translation);
        } catch (e) {
            if (e instanceof EmptyTranslationIdError) {
                this.compilation.warnings.push(e);
            } else if (e instanceof TranslationRegistrationError) {
                this.compilation.errors.push(e);
            } else {
                throw e;
            }
        }
    }

    emitResult (compilation: Compilation, callback: () => void) {
        // Only create the file if it is not empty.
        // Fixes an issue with karma-webpack where the build fails when the asset is emitted.
        if (!this.translationsRegistry.empty) {
            const translations = this.translationsRegistry.toJSON();
            var content = JSON.stringify(translations, null, '\t');
            compilation.assets[this.options.fileName] = new RawSource(content, this.options.fileName);
        }

        callback();
    };
}

export default AngularTranslatePlugin;