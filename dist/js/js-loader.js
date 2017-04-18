"use strict";
var acorn = require("acorn");
var escodegen = require("escodegen");
var sourceMap = require("source-map");
var translate_visitor_1 = require("./translate-visitor");
var loaderUtils = require("loader-utils");
/**
 * Webpack loader that extracts translations from calls to the angular-translate $translate service.
 * Additionally it provides the `i18n.registerTranslation(translationId, defaultText)` and `i18n.registerTranslations({})`
 * functions that can be used to register new translations directly in code.
 *
 * The loader uses acorn to parse the input file and creates the output javascript using escodegen.
 * @param source
 * @param sourceMaps
 */
function jsLoader(source, sourceMaps) {
    var loader = this;
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
function extractTranslations(loader, source, sourceMaps) {
    var options = loaderUtils.getOptions(loader) || {};
    var parserOptions = options.parserOptions || {};
    loader.pruneTranslations(loader.resource);
    var visitor = new translate_visitor_1.default(loader, parserOptions);
    var ast = acorn.parse(source, visitor.options);
    ast = visitor.visit(ast);
    var code = source;
    if (visitor.changedAst) {
        var generateSourceMaps = !!(loader.sourceMap || sourceMaps);
        var result = escodegen.generate(ast, {
            comment: true,
            sourceMap: generateSourceMaps ? loader.resourcePath : undefined,
            sourceMapWithCode: generateSourceMaps,
            sourceContent: generateSourceMaps ? source : undefined
        });
        if (generateSourceMaps) {
            var codeWithSourceMap = result;
            code = codeWithSourceMap.code;
            if (sourceMaps) {
                // Create a new source maps that is a mapping from original Source -> result from previous loader -> result from this loader
                var originalSourceMap = new sourceMap.SourceMapConsumer(sourceMaps);
                codeWithSourceMap.map.applySourceMap(originalSourceMap, loader.resourcePath);
            }
            sourceMaps = codeWithSourceMap.map.toJSON();
        }
    }
    loader.callback(null, code, sourceMaps);
}
function isExcludedResource(resource) {
    return /angular-translate[\/\\]dist[\/\\]angular-translate\.js$/.test(resource);
}
module.exports = jsLoader;
//# sourceMappingURL=js-loader.js.map