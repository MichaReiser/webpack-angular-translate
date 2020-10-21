import * as path from "path";
import * as cheerio from "cheerio";
import * as loaderUtils from "loader-utils";

import TranslateLoaderContext from "../translate-loader-context";
import translateDirectiveTranslationExtractor from "./translate-directive-translation-extractor";
import StatefulHtmlParser, {
  SUPPRESS_ATTRIBUTE_NAME,
} from "./translate-html-parser";
import { HtmlTranslationExtractor } from "./html-translation-extractor";

/**
 * Loader that must be used together with the plugin. The loader parses the html content and extracts all
 * translate elements, elements with a translate attribute or translate filter.
 *
 * The loader communicates with the plugin by the registerTranslation functions provided by the plugin (loader.registerTranslation).
 * The plugin is responsible for merging the translations and emitting them.
 *
 * The plugin is required because the loader doesn't know when all files have been processed. The plugin removes
 * all suppress-dynamic-translation-error attributes for non dev builds.
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
 * <h1 title="{{ 'My title' | translate }}"></h1>
 * <h2>{{ 'My long translation' | translate | limitTo:20 }}</h2>
 *
 * <span>{{ "4" | translate }} {{ "x" | translate }}</span>
 *
 * @param source the content of the file (expected to be html or xml)
 * @param sourceMaps the source maps
 */
function loader(source: string, sourceMaps: any): void | string {
  "use strict";

  const loader: TranslateLoaderContext = this;
  if (!loader.registerTranslation) {
    return this.callback(
      new Error(
        "The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section."
      ),
      source,
      sourceMaps
    );
  }

  if (this.cacheable) {
    this.cacheable();
  }

  loader.pruneTranslations(path.relative(loader.context, loader.resourcePath));

  const options = loaderUtils.getOptions(loader) || {};
  const translationExtractors: HtmlTranslationExtractor[] = [
    ...(options.translationExtractors || []),
    translateDirectiveTranslationExtractor,
  ];

  // Don't parse the HTML if none of the extractors detect any possible translations.
  if (
    translationExtractors.every(
      (extractor) =>
        extractor.mayContainTranslations != null &&
        !extractor.mayContainTranslations(source)
    )
  ) {
    return this.callback(null, source, sourceMaps);
  }

  new StatefulHtmlParser(loader, translationExtractors).parse(source);

  let result = source;
  if (!this.debug) {
    result = removeSuppressTranslationErrorAttributes(source);
  }

  this.callback(null, result, sourceMaps);
}

function removeSuppressTranslationErrorAttributes(source: string): string {
  const $ = cheerio.load(source);
  const elementsWithSuppressAttribute = $(`[${SUPPRESS_ATTRIBUTE_NAME}]`);
  if (elementsWithSuppressAttribute.length === 0) {
    return source;
  }

  elementsWithSuppressAttribute.removeAttr(SUPPRESS_ATTRIBUTE_NAME);
  return $.html();
}

export = loader;
