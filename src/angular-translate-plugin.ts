import { RawSource } from "webpack-sources";
import { Plugin, Compiler, compilation } from "webpack";

import Translation from "./translation";
import TranslationsRegistry, {
  TranslationRegistrationError,
  EmptyTranslationIdError
} from "./translations-registry";

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
  private compilation: compilation.Compilation;
  private translationsRegistry = new TranslationsRegistry();

  constructor(options: TranslateOptions) {
    this.options = { fileName: "translations.json", ...options };
  }

  /**
   * Entry function from webpack that registers the plugin in the required-build-phases
   * @param compiler
   */
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap("webpack-angular-translate", compilation => {
      this.compilation = compilation;
      /**
       * Register the plugin to the normal-module-loader and expose the registerTranslation function in the loaderContext.
       * This way the loader can communicate with the plugin and pass the translations to the plugin.
       */
      compilation.hooks.normalModuleLoader.tap(
        "webpack-angular-translate",
        loaderContext => {
          loaderContext.registerTranslation = this.registerTranslation.bind(
            this
          );
          loaderContext.pruneTranslations = this.translationsRegistry.pruneTranslations.bind(
            this.translationsRegistry
          );
        }
      );
    });

    compiler.hooks.emit.tap(
      "webpack-angular-translate",
      this.emitResult.bind(this)
    );
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

  emitResult(compilation: compilation.Compilation) {
    // Only create the file if it is not empty.
    // Fixes an issue with karma-webpack where the build fails when the asset is emitted.
    if (!this.translationsRegistry.empty) {
      const translations = this.translationsRegistry.toJSON();
      var content = JSON.stringify(translations, null, "\t");
      compilation.assets[this.options.fileName] = new RawSource(content);
    }
  }
}

export default AngularTranslatePlugin;
