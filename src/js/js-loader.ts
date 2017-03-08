import acorn = require("acorn");
import escodegen = require("escodegen");
import sourceMap = require("source-map");
import TranslateLoaderContext from "../translate-loader-context";
import TranslateVisitor from "./translate-visitor";
import CodeWithSourceMap = SourceMap.CodeWithSourceMap;
import *  as loaderUtils from "loader-utils";

/**
 * Webpack loader that extracts translations from calls to the angular-translate $translate service.
 * Additionally it provides the `i18n.registerTranslation(translationId, defaultText)` and `i18n.registerTranslations({})`
 * functions that can be used to register new translations directly in code.
 *
 * The loader uses acorn to parse the input file and creates the output javascript using escodegen.
 * @param source
 * @param sourceMaps
 */
function jsLoader(source: string, sourceMaps: any): void {
    const loader: TranslateLoaderContext = this;
    if (!loader.registerTranslation) {
        return this.callback(new Error("The WebpackAngularTranslate plugin is missing. Add the plugin to your webpack configurations 'plugins' section."), source, sourceMaps);
    }

    if (loader.cacheable) {
        loader.cacheable();
    }

    if (isExcludedResource(loader.resourcePath)) {
        return this.callback(null, source, sourceMaps);
    }

    extractTranslations(loader, source, sourceMaps);
}

function extractTranslations(loader: TranslateLoaderContext, source: string, sourceMaps: any): void {
    const options = (loaderUtils as any).getOptions(loader) || {};
    const parserOptions = options["parserOptions"] || {};

    loader.pruneTranslations(loader.resource);

    const visitor = new TranslateVisitor(loader, parserOptions);
    let ast: ESTree.Node = acorn.parse(source, visitor.options);
    ast = visitor.visit(ast);

    let code = source;

    if (visitor.changedAst) {
        const generateSourceMaps = !!(loader.sourceMap || sourceMaps);
        const result = escodegen.generate(ast, {
            comment: true,
            sourceMap: generateSourceMaps ? loader.resourcePath : undefined,
            sourceMapWithCode: generateSourceMaps,
            sourceContent: generateSourceMaps ? source : undefined
        });

        if (generateSourceMaps) {
            const codeWithSourceMap = <CodeWithSourceMap> result;
            code = codeWithSourceMap.code;
            if (sourceMaps) {
                // Create a new source maps that is a mapping from original Source -> result from previous loader -> result from this loader
                var originalSourceMap = new sourceMap.SourceMapConsumer(sourceMaps);
                codeWithSourceMap.map.applySourceMap(originalSourceMap, loader.resourcePath);
            }

            sourceMaps = (<any>codeWithSourceMap.map).toJSON();
        }
    }

    loader.callback(null, code, sourceMaps);
}

function isExcludedResource(resource: string): boolean {
    return /angular-translate[\/\\]dist[\/\\]angular-translate\.js$/.test(resource);
}

export = jsLoader;
