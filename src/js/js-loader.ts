import * as escodegen from "escodegen";
import * as acorn from "acorn";
import * as ESTree from "estree";
import { CodeWithSourceMap, SourceMapConsumer } from "source-map";
import TranslateLoaderContext from "../translate-loader-context";
import TranslateVisitor from "./translate-visitor";
import * as loaderUtils from "loader-utils";

/**
 * The optional options passed to the plugin
 */
interface LoaderOptions {
  /**
   * Optional acorn options that are passed to the parser
   */
  parserOptions?: acorn.Options;
}

/**
 * Webpack loader that extracts translations from calls to the angular-translate $translate service.
 * Additionally it provides the `i18n.registerTranslation(translationId, defaultText)` and `i18n.registerTranslations({})`
 * functions that can be used to register new translations directly in code.
 *
 * The loader uses acorn to parse the input file and creates the output javascript using escodegen.
 * @param source
 * @param inputSourceMaps
 */
async function jsLoader(source: string, inputSourceMaps: any) {
  const loader: TranslateLoaderContext = this;
  const callback = this.async();

  if (!loader.registerTranslation) {
    return callback(
      new Error(
        "The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section."
      ),
      source,
      inputSourceMaps
    );
  }

  if (loader.cacheable) {
    loader.cacheable();
  }

  if (isExcludedResource(loader.resourcePath)) {
    return callback(null, source, inputSourceMaps);
  }

  const { code, sourceMaps } = await extractTranslations(
    loader,
    source,
    inputSourceMaps
  );

  callback(null, code, sourceMaps);
}

async function extractTranslations(
  loader: TranslateLoaderContext,
  source: string,
  sourceMaps: any
) {
  const options = loaderUtils.getOptions(loader) || {};
  const parserOptions = options.parserOptions || {};

  loader.pruneTranslations(loader.resource);

  const visitor = new TranslateVisitor(loader, parserOptions);
  const sourceAst = acorn.parse(source, visitor.options);
  const transformedAst = visitor.visit(sourceAst as ESTree.Node);

  let code = source;

  if (visitor.changedAst) {
    const generateSourceMaps = !!(loader.sourceMap || sourceMaps);
    const result = escodegen.generate(transformedAst, {
      comment: true,
      sourceMap: generateSourceMaps ? loader.resourcePath : undefined,
      sourceMapWithCode: generateSourceMaps,
      sourceContent: generateSourceMaps ? source : undefined
    });

    if (generateSourceMaps) {
      const codeWithSourceMap = <CodeWithSourceMap>(result as any);
      code = codeWithSourceMap.code;
      if (sourceMaps) {
        // Create a new source maps that is a mapping from original Source -> result from previous loader -> result from this loader
        const originalSourceMap = await new SourceMapConsumer(sourceMaps);
        codeWithSourceMap.map.applySourceMap(
          originalSourceMap,
          loader.resourcePath
        );
      }

      sourceMaps = (<any>codeWithSourceMap.map).toJSON();
    }
  }

  return { code, sourceMaps };
}

function isExcludedResource(resource: string): boolean {
  return /angular-translate[\/\\]dist[\/\\]angular-translate\.js$/.test(
    resource
  );
}

export = jsLoader;
