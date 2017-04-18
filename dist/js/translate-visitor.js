"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var types = require("ast-types");
var translation_1 = require("../translation");
var n = types.namedTypes;
var b = types.builders;
var TRANSLATE_SERVICE_NAME = "$translate";
var TranslateVisitor = (function (_super) {
    __extends(TranslateVisitor, _super);
    function TranslateVisitor(loader, parserOptions) {
        if (parserOptions === void 0) { parserOptions = {}; }
        _super.call(this);
        this.loader = loader;
        this.changedAst = false;
        this.comments = [];
        this.tokens = [];
        this.options = Object.assign({}, parserOptions, {
            locations: true,
            onComment: this.comments,
            onToken: this.tokens,
            ranges: true
        });
        // the function is called with this = Context and not the object itself
        // rebind to this and save the context in current context
        var visitor = this;
        var func = this.visitCallExpression;
        this.visitCallExpression = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            visitor.currentContext = this;
            return func.apply(visitor, args);
        };
    }
    TranslateVisitor.prototype.visitCallExpression = function (path) {
        var call = path.node, functionName = this.getFunctionName(call), calleeName = this.getCalleeName(call);
        try {
            if (functionName === TRANSLATE_SERVICE_NAME) {
                this.visitTranslate(path);
            }
            else if (functionName === "registerTranslation" && calleeName === "i18n") {
                this.visitRegisterTranslation(path);
            }
            else if (functionName === "registerTranslations" && calleeName === "i18n") {
                this.visitRegisterTranslations(path);
            }
            else if (functionName === "instant" && calleeName === TRANSLATE_SERVICE_NAME) {
                this.visitTranslate(path);
            }
            else {
                this.currentContext.traverse(path);
            }
        }
        catch (e) {
            if (e instanceof this.AbortRequest) {
                e.cancel();
            }
            else {
                throw e;
            }
        }
        return false;
    };
    /**
     * Handles a $translate(translateId, interpolateParams, interpolationId, defaultText) call.
     * @param path the path to the call expression
     */
    TranslateVisitor.prototype.visitTranslate = function (path) {
        var _this = this;
        var call = path.node, args = call.arguments;
        if (args.length < 1) {
            this.throwSuppressableError("A call to " + TRANSLATE_SERVICE_NAME + " requires at least one argument that is the translation id", path);
        }
        var translationIds = this.getTranslationIdFromTranslateCall(path);
        var defaultText = this.getDefaultTextFromTranslateCall(path);
        var translations = translationIds.map(function (translationId) { return _this.createTranslation(translationId, defaultText, call); });
        translations.forEach(this.loader.registerTranslation);
    };
    TranslateVisitor.prototype.getTranslationIdFromTranslateCall = function (path) {
        var _this = this;
        var args = path.node.arguments;
        if (n.Literal.check(args[0])) {
            return [args[0].value];
        }
        if (n.ArrayExpression.check(args[0])) {
            var arrayExpression = args[0];
            return arrayExpression.elements.map(function (element) {
                if (n.Literal.check(element)) {
                    return element.value;
                }
                _this.throwSuppressableError("The array with the translation ids should only contain literals", path);
            });
        }
        this.throwSuppressableError("The translation id should either be a string literal or an array containing string literals", path);
    };
    ;
    TranslateVisitor.prototype.getDefaultTextFromTranslateCall = function (path) {
        var args = path.node.arguments;
        if (args.length > 3) {
            if (n.Literal.check(args[3])) {
                return args[3].value;
            }
            this.throwSuppressableError("The default text should be a string literal", path);
        }
        return undefined;
    };
    ;
    /**
     * Handles a call to i18n.registerTranslation(translationId, defaultText?).
     * Evaluates the expression and registers a translation. The call expression itself is replaced with the id of the
     * translation id.
     * @param path of the call expression.
     */
    TranslateVisitor.prototype.visitRegisterTranslation = function (path) {
        var call = path.node, args = call.arguments;
        if (args.length === 0 || !n.Literal.check(args[0])) {
            this.throwError("Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal", call);
        }
        var translationId = args[0].value;
        var defaultText;
        if (args.length > 1) {
            if (n.Literal.check(args[1])) {
                defaultText = args[1].value;
            }
            else {
                this.throwError("Illegal argument for call to i18n.registerTranslation: the default text has to be a literal", call);
            }
        }
        var translation = this.createTranslation(translationId, defaultText, call);
        this.loader.registerTranslation(translation);
        path.replace(b.literal(translation.id));
        this.changedAst = true;
    };
    /**
     * Handles a call to i18n.registerTranslations({ translationId: defaultText }).
     * @param path the path to the call expression
     */
    TranslateVisitor.prototype.visitRegisterTranslations = function (path) {
        var _this = this;
        var call = path.node, args = call.arguments, translationsArgument = args.length === 0 ? null : args[0];
        if (translationsArgument === null || !n.ObjectExpression.check(translationsArgument)) {
            this.throwError("Illegal argument for call to i18n.registerTranslations: requires a single argument that is an object where the key is the translationId and the value is the default text", call);
        }
        var translations = translationsArgument.properties.map(function (property) {
            var translationId;
            var defaultText;
            if (n.Identifier.check(property.key)) {
                translationId = property.key.name;
            }
            else if (n.Literal.check(property.key)) {
                translationId = property.key.value;
            }
            else {
                _this.throwError("Illegal argument for call to i18n.registerTranslations: The key needs to be a literal or an identifier.", call);
            }
            if (n.Literal.check(property.value)) {
                defaultText = property.value.value;
            }
            else {
                _this.throwError("Illegal argument for call to i18n.registerTranslations: The value for the key '" + translationId + "' needs to be a literal", call);
            }
            return _this.createTranslation(translationId, defaultText, call);
        }, this);
        translations.forEach(this.loader.registerTranslation);
        var ids = b.arrayExpression(translations.map(function (translation) { return b.literal(translation.id); }));
        path.replace(ids);
        this.changedAst = true;
    };
    TranslateVisitor.prototype.createTranslation = function (translationId, defaultText, node) {
        return new translation_1.default(this.valueToString(translationId), this.valueToString(defaultText), {
            resource: this.loader.resource,
            loc: node.loc.start
        });
    };
    /**
     * Gets the function name from a call expression
     * @param call the call expression
     * @returns {string} the name of the function
     */
    TranslateVisitor.prototype.getFunctionName = function (call) {
        var callee = call.callee;
        if (n.Identifier.check(callee)) {
            return callee.name;
        }
        else if (n.MemberExpression.check(callee)) {
            var property = callee.property;
            if (n.Identifier.check(property)) {
                return property.name;
            }
            return "[expression]";
        }
        else if (n.FunctionExpression.check(callee)) {
            return "(function () { ... })";
        }
    };
    /**
     * Gets the name of the callee of a function.
     * Returns the name of the object before the dot (.) in a function call,
     * e.g this for this.$translate or i18n for i18n.registerTranslation
     * @param call the call expression
     * @returns {string} the name of the callee or null if the name could not be determined
     */
    TranslateVisitor.prototype.getCalleeName = function (call) {
        // this.method() or object.method()
        if (call.callee.type === "MemberExpression") {
            var member = call.callee;
            if (member.object.type === "Identifier") {
                return member.object.name;
            }
            else if (member.object.type === "ThisExpression") {
                return "this";
            }
            else if (member.object.type == "MemberExpression") {
                var parent_1 = member.object;
                if (parent_1.property.type === "Identifier") {
                    return parent_1.property.name;
                }
            }
        }
        return null;
    };
    /**
     * Emits an error to webpack and throws an error to abort the processing of the node.
     *
     * @param message the message to emit
     * @param node the node for which a message is emitted
     */
    TranslateVisitor.prototype.throwError = function (message, node) {
        var start = node.loc.start, completeMessage = message + " (" + this.loader.resource + ":" + start.line + ":" + start.column + ").";
        this.loader.emitError(completeMessage);
        this.abort();
    };
    /**
     * Emits an error to webpack if no comment with suppress-dynamic-translation-error: true is found
     * in the scope of the passed in path
     *
     * @param message the message to emit
     * @param path the path of the node to which the error belongs
     */
    TranslateVisitor.prototype.throwSuppressableError = function (message, path) {
        var call = path.node, calleeName = this.getCalleeName(call), functionName = this.getFunctionName(call), completeFunctionName = (calleeName ? calleeName + "." : "") + functionName, completeMessage = "Illegal argument for call to " + completeFunctionName + ": " + message + ". If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error.";
        if (!(this.isCommentedWithSuppressErrors(path))) {
            this.throwError(completeMessage, call);
        }
        this.abort();
    };
    /**
     * Tests if a {@code suppress-dynamic-translation-error: true } comment exists in the scope of the passed in path.
     * @param path the path to check
     * @returns {boolean} {@code true} if the current block contains such a comment, otherwise false
     */
    TranslateVisitor.prototype.isCommentedWithSuppressErrors = function (path) {
        return isCommentedWithSuppressError(path, this.comments);
    };
    TranslateVisitor.prototype.valueToString = function (value) {
        if (value === null || typeof (value) === "undefined") {
            return null;
        }
        return "" + value;
    };
    return TranslateVisitor;
}(types.PathVisitor));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TranslateVisitor;
function isCommentedWithSuppressError(path, comments) {
    var blockStartPath = path;
    while (blockStartPath.parentPath && !(n.BlockStatement.check(blockStartPath.node) || n.Program.check(blockStartPath.node))) {
        blockStartPath = blockStartPath.parentPath;
    }
    var blockStart = blockStartPath.node;
    var suppressCommentExpression = /suppress-dynamic-translation-error:\s*true/;
    for (var _i = 0, comments_1 = comments; _i < comments_1.length; _i++) {
        var comment = comments_1[_i];
        if (comment.loc.end.line > path.node.loc.start.line) {
            return false;
        }
        if (comment.loc.start.line >= blockStart.loc.start.line && suppressCommentExpression.test(comment.value)) {
            return true;
        }
    }
    return false;
}
exports.isCommentedWithSuppressError = isCommentedWithSuppressError;
//# sourceMappingURL=translate-visitor.js.map