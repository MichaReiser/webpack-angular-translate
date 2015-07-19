var Translation = require("./Translation"),
    acorn = require('acorn'),
    types = require("ast-types"),
    n = types.namedTypes,
    b = types.builders,
    escodegen = require('escodegen'),
    sourceMap = require('source-map');

var extend = require('util')._extend;

/**
 * Webpack loader that extracts translations from calls to the angular-translate $translate service.
 * Additionally it provides the `i18n.registerTranslation(translationId, defaultText)` and `i18n.registerTranslations({})`
 * functions that can be used to register new translations directly in code.
 *
 * The loader uses acorn to parse the input file and creates the output javascript using escodegen.
 * @param source
 * @param sourceMaps
 */
function loader(source, sourceMaps) {
    "use strict";

    var loader = this,
        comments = [],
        tokens = [],
        changedAst = false;

    this.cacheable();

    var ast = acorn.parse(source, {
        locations: true,
        onComment: comments,
        onToken: tokens,
        ranges: true
    });

    types.visit(ast, {
        visitCallExpression: function (path) {
            var call = path.node,
                functionName = this.getFunctionName(call),
                calleeName = this.getCalleeName(call);

            try {
                if (functionName === '$translate') {
                    this.visitTranslate(path);
                } else if (functionName === 'registerTranslation' && calleeName === 'i18n') {
                    this.registerTranslationCallExpression(path);
                } else if (functionName === 'registerTranslations' && calleeName === 'i18n') {
                    this.registerTranslationsCallExpression(path);
                } else {
                    this.traverse(path);
                }
            } catch (e) {
                if (e.cancel) {
                    e.cancel();
                } else {
                    throw e;
                }
            }

            return false;
        },

        /**
         * Handles a $translate(translateId, interpolateParams, interpolationId, defaultText) call.
         * @param path the path to the call expression
         */
        visitTranslate: function (path) {
            var call = path.node,
                args = call.arguments;

            if (args.length < 1) {
                this.throwIllegalArgumentError("A call to $translate requires at least one argument that is the translation id", path);
            }

            var translationIds;

            // Extract translation id as string or as array of strings
            if (n.Literal.check(args[0])) {
                translationIds = [ args[0].value ];
            } else if (n.ArrayExpression.check(args[0])) {
                translationIds = args[0].elements.map(function (element) {
                   if (n.Literal.check(element)) {
                       return element.value;
                   }
                   this.throwIllegalArgumentError("The array with the translation id should only contain string literals", path);
                }, this);
            } else {
                this.throwIllegalArgumentError("The translation id should either be a string literal or an array containing string literals", path);
            }

            // Extract default text
            var defaultText;
            if (args.length > 3) {
                if (n.Literal.check(args[3])) {
                    defaultText = args[3].value;
                } else {
                    this.throwIllegalArgumentError("The default text should be a string literal", path);
                }
            }

            var translations = translationIds.map(function (translationId) {
                return new Translation(translationId, defaultText, loader.resourcePath);
            }, this);

            translations.forEach(loader.registerTranslation);
        },

        /**
         * Handles a call to i18n.registerTranslation(translationId, defaultText?).
         * Evaluates the expression and registers a translation. The call expression itself is replaced with the id of the
         * translation id.
         * @param path of the call expression.
         */
        registerTranslationCallExpression: function (path) {
            var call = path.node,
                args = call.arguments;

            if (args.length === 0 || !n.Literal.check(args[0])) {
                this.throwError("Illegal argument for call to i18n.registerTranslation: requires at least the argument translationId that needs to be a string literal", call);
            }

            var translationId = args[0].value,
                defaultText;

            if (args.length > 1) {
                if (n.Literal.check(args[1])) {
                    defaultText = args[1].value;
                } else {
                    this.throwIllegalArgumentError("Illegal argument for call to i18n.registerTranslation: the default text has to be a string literal", call);
                }
            }

            var translation = new Translation(translationId, defaultText, loader.resourcePath);

            loader.registerTranslation(translation);
            path.replace(b.literal(translation.id));
            changedAst = true;
        },

        /**
         * Handles a call to i18n.registerTranslations({ translationId: defaultText }).
         * @param path the path to the call expression
         */
        registerTranslationsCallExpression: function (path) {
            var call = path.node,
                args = call.arguments,
                translationsArgument = args.length === 0 ? null : args[0];

            if (translationsArgument === null || !n.ObjectExpression.check(translationsArgument)) {
                this.throwError("Illegal argument for call to i18n.registerTranslations: requires single argument that is an object where the key is the translationId and the value is the default text", call);
            }

            var translations = translationsArgument.properties.map(function (property) {
                var translationId,
                    defaultText;

                if (n.Identifier.check(property.key)) {
                    translationId = property.key.name;
                } else if (n.Literal.check(property.key)) {
                    translationId = property.key.value;
                } else {
                    this.throwError("Illegal argument for call to i18n.registerTranslations: The key needs to be a literal (string) or an identifier.", call);
                }

                if (n.Literal.check(property.value)) {
                    defaultText = property.value.value;
                } else {
                    this.throwError("Illegal argument for call to i18n.registerTranslations: The value for the key '" + translationId + "' needs to be a literal (string)", call);
                }

                return new Translation(translationId, defaultText, loader.resourcePath);
            }, this);

            translations.forEach(loader.registerTranslation);
            path.prune();
            changedAst = true;
        },

        /**
         * Gets the function name from a call expression
         * @param call the call expression
         * @returns {string} the name of the function
         */
        getFunctionName: function (call) {
            var callee = call.callee;
            if (n.Identifier.check(callee)) {
                return callee.name;
            } else if (n.MemberExpression.check(callee)) {
                return callee.property.name;
            } else if (n.FunctionExpression.check(callee)) {
                return "(function () { ... })";
            }

            this.throwError("Unknown type of call expression, no idea how to extract the function name", call);
        },

        /**
         * Gets the name of the callee of a function.
         * Returns the name of the object before the dot (.) in a function call,
         * e.g this for this.$translate or i18n for i18n.registerTranslation
         * @param call the call expression
         * @returns {string} the name of the callee or null if the name could not be determined
         */
        getCalleeName: function (call) {
            // this.method() or object.method()
            if (call.callee.type === 'MemberExpression') {
                if (call.callee.object.type === 'Identifier') {
                    return call.callee.object.name;
                } else if (call.callee.object.type === 'ThisExpression') {
                    return 'this';
                }
            }

            return null;
        },

        /**
         * Emits an error to webpack and throws an error to abort the processing of the node.
         *
         * @param message the message to emit
         * @param node the node for which a message is emitted
         */
        throwError: function (message, node) {
            var start = node.loc.start,
                completeMessage = message + " (" + loader.resourcePath + ":" + start.line + ":" + start.column + ").";
            loader.emitError(completeMessage);
            this.abort();
        },

        /**
         * Emits an error to webpack if no comment with suppress-dynamic-translation-error: true is found
         * in the scope of the passed in path
         *
         * @param message the message to emit
         * @param path the path of the node to which the error belongs
         */
        throwIllegalArgumentError: function (message, path) {
            var call = path.node,
                calleeName = this.getCalleeName(call),
                functionName = this.getFunctionName(call),
                completeMessage = "Illegal argument for call to " + (calleeName ? calleeName  + "." : "") + functionName + ": " + message + "." +
                        " If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error.";

            if (!this.isCommentedWithSuppressErrors(path)) {
                this.throwError(completeMessage, call);
            }
            this.abort();
        },

        /**
         * Tests if a {@code suppress-dynamic-translation-error: true } comment exists in the scope of the passed in path.
         * @param path the path to check
         * @returns {boolean} {@code true} if the current block contains such a comment, otherwise false
         */
        isCommentedWithSuppressErrors: function (path) {
            var blockStartPath = path;

            while (blockStartPath.parentPath && !(n.BlockStatement.check(blockStartPath.node) || n.Program.check(blockStartPath.node))) {
                blockStartPath = blockStartPath.parentPath;
            }

            var blockStart = blockStartPath.node;

            var suppressCommentExpression = /suppress-dynamic-translation-error:\s*true/;

            for (var comment of comments) {
                if (comment.loc.end.line > blockStart.loc.end.line) {
                    return false;
                }

                if (comment.loc.start.line >= blockStart.loc.start.line && suppressCommentExpression.test(comment.value)) {
                    return true;
                }
            }

            return false;
        }
    });

    var code = source;

    if (changedAst) {
        var generateSourceMaps = !!(loader.sourceMap || sourceMaps);
        var result = escodegen.generate(ast, {
            comment: true,
            sourceMap: generateSourceMaps ? loader.resourcePath : undefined,
            sourceMapWithCode: generateSourceMaps,
            sourceContent: generateSourceMaps ? source : undefined
        });

        code = generateSourceMaps ? result.code : result;

        if (generateSourceMaps) {
            if (sourceMaps) {
                // Create a new source maps that is a mapping from original Source -> result from previous loader -> result from this loader
                var originalSourceMap = new sourceMap.SourceMapConsumer(sourceMaps);
                var intermediateSourceMap = new sourceMap.SourceMapConsumer(result.map.toJSON());
                result.map.applySourceMap(originalSourceMap, loader.resourcePath);
            }

            sourceMaps = result.map.toJSON();
        }
    }

    this.callback(null, code, sourceMaps);
}

module.exports = loader;