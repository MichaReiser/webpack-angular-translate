import types = require("ast-types");
import CallExpression = ESTree.CallExpression;
import Translation from "../translation";
import TranslateLoaderContext from "../translate-loader-context";

const n = types.namedTypes;
const b = types.builders;
const TRANSLATE_SERVICE_NAME = "$translate";

export default class TranslateVisitor extends types.PathVisitor implements  types.Visitor {
    changedAst: boolean = false;
    comments: acorn.Comment[]= [];
    tokens: acorn.Token[] = [];
    options: acorn.Options = {
        locations: true,
        onComment: this.comments,
        onToken: this.tokens,
        ranges: true
    };
    currentContext: types.Context;

    constructor(private loader: TranslateLoaderContext) {
        super();

        // the function is called with this = Context and not the object itself
        // rebind to this and save the context in current context
        const visitor = this;
        const func = this.visitCallExpression;
        this.visitCallExpression = function(...args: any[]): boolean {
            visitor.currentContext = this;
            return func.apply(visitor, args);
        };
    }

    visitCallExpression(path: AstTypes.NodePath<ESTree.CallExpression>): boolean {
        const call = path.node,
            functionName = this.getFunctionName(call),
            calleeName = this.getCalleeName(call);

        try {
            if (functionName === TRANSLATE_SERVICE_NAME) {
                this.visitTranslate(path);
            } else if (functionName === "registerTranslation" && calleeName === "i18n") {
                this.visitRegisterTranslation(path);
            } else if (functionName === "registerTranslations" && calleeName === "i18n") {
                this.visitRegisterTranslations(path);
            } else {
                this.currentContext.traverse(path);
            }
        } catch (e) {
            if (e instanceof this.AbortRequest) {
                e.cancel();
            } else {
                throw e;
            }
        }

        return false;
    }

    /**
     * Handles a $translate(translateId, interpolateParams, interpolationId, defaultText) call.
     * @param path the path to the call expression
     */
    private visitTranslate(path: AstTypes.NodePath<ESTree.CallExpression>): void {
        const call = path.node,
            args = call.arguments;

        if (args.length < 1) {
            this.throwSuppressableError(`A call to ${TRANSLATE_SERVICE_NAME} requires at least one argument that is the translation id`, path);
        }

        let translationIds: any[];

        // Extract translation id as string or as array of strings
        if (n.Literal.check(args[0])) {
            translationIds = [ (<ESTree.Literal> args[0]).value ];
        } else if (n.ArrayExpression.check(args[0])) {
            const arrayExpression = <ESTree.ArrayExpression> args[0];
            translationIds = arrayExpression.elements.map(element => {
                if (n.Literal.check(element)) {
                    return (<ESTree.Literal> element).value;
                }
                this.throwSuppressableError("The array with the translation id should only contain string literals", path);
            });
        } else {
            this.throwSuppressableError("The translation id should either be a string literal or an array containing string literals", path);
        }

        // Extract default text
        let defaultText: string;
        if (args.length > 3) {
            if (n.Literal.check(args[3])) {
                defaultText = "" + (<ESTree.Literal>args[3]).value;
            } else {
                this.throwSuppressableError("The default text should be a string literal", path);
            }
        }

        const translations = translationIds.map(translationId => this.createTranslation(translationId, defaultText, call));
        translations.forEach(this.loader.registerTranslation);
    }

    /**
     * Handles a call to i18n.registerTranslation(translationId, defaultText?).
     * Evaluates the expression and registers a translation. The call expression itself is replaced with the id of the
     * translation id.
     * @param path of the call expression.
     */
    private visitRegisterTranslation (path: AstTypes.NodePath<CallExpression>): void {
        const call = path.node,
            args = call.arguments;

        if (args.length === 0 || !n.Literal.check(args[0])) {
            this.throwError("Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal", call);
        }

        const translationId = (<ESTree.Literal>args[0]).value;
        let defaultText: any;

        if (args.length > 1) {
            if (n.Literal.check(args[1])) {
                defaultText = <string>(<ESTree.Literal>args[1]).value;
            } else {
                this.throwError("Illegal argument for call to i18n.registerTranslation: the default text has to be a literal", call);
            }
        }

        const translation = this.createTranslation(translationId, defaultText, call);

        this.loader.registerTranslation(translation);
        path.replace(b.literal(translation.id));
        this.changedAst = true;
    }

    /**
     * Handles a call to i18n.registerTranslations({ translationId: defaultText }).
     * @param path the path to the call expression
     */
    private visitRegisterTranslations (path: AstTypes.NodePath<any>): void {
        const call = path.node,
            args = call.arguments,
            translationsArgument = args.length === 0 ? null : args[0];

        if (translationsArgument === null || !n.ObjectExpression.check(translationsArgument)) {
            this.throwError("Illegal argument for call to i18n.registerTranslations: requires a single argument that is an object where the key is the translationId and the value is the default text", call);
        }

        const translations: Translation[] = (<ESTree.ObjectExpression>translationsArgument).properties.map(property => {
            let translationId: any;
            let defaultText: any;

            if (n.Identifier.check(property.key)) {
                translationId = (<ESTree.Identifier>property.key).name;
            } else if (n.Literal.check(property.key)) {
                translationId = (<ESTree.Literal>property.key).value;
            } else {
                this.throwError("Illegal argument for call to i18n.registerTranslations: The key needs to be a literal or an identifier.", call);
            }

            if (n.Literal.check(property.value)) {
                defaultText = (<ESTree.Literal>property.value).value;
            } else {
                this.throwError(`Illegal argument for call to i18n.registerTranslations: The value for the key '${translationId}' needs to be a literal`, call);
            }

            return this.createTranslation(translationId, defaultText, call);
        }, this);

        translations.forEach(this.loader.registerTranslation);
        const ids = b.arrayExpression(translations.map(translation => b.literal(translation.id)));
        path.replace(ids);
        this.changedAst = true;
    }

    private createTranslation(translationId: any, defaultText: any, node: ESTree.Node): Translation {
        return new Translation(this.valueToString(translationId), this.valueToString(defaultText), {
            resource: this.loader.resource,
            loc: node.loc.start
        });
    }

    /**
     * Gets the function name from a call expression
     * @param call the call expression
     * @returns {string} the name of the function
     */
    private getFunctionName (call: ESTree.CallExpression): string {
        var callee = call.callee;
        if (n.Identifier.check(callee)) {
            return (<ESTree.Identifier>callee).name;
        } else if (n.MemberExpression.check(callee)) {
            const property = (<ESTree.MemberExpression>callee).property;
            if (n.Identifier.check(property)) {
                return (<ESTree.Identifier>property).name;
            }
            return "[expression]";
        } else if (n.FunctionExpression.check(callee)) {
            return "(function () { ... })";
        }
    }

    /**
     * Gets the name of the callee of a function.
     * Returns the name of the object before the dot (.) in a function call,
     * e.g this for this.$translate or i18n for i18n.registerTranslation
     * @param call the call expression
     * @returns {string} the name of the callee or null if the name could not be determined
     */
    private getCalleeName(call: ESTree.CallExpression): string {
        // this.method() or object.method()
        if (call.callee.type === "MemberExpression") {
            const member = <ESTree.MemberExpression> call.callee;
            if (member.object.type === "Identifier") {
                return (<ESTree.Identifier>member.object).name;
            } else if (member.object.type === "ThisExpression") {
                return "this";
            }
        }

        return null;
    }

    /**
     * Emits an error to webpack and throws an error to abort the processing of the node.
     *
     * @param message the message to emit
     * @param node the node for which a message is emitted
     */
    private throwError(message: string, node: ESTree.Node): void {
        const start = node.loc.start,
            completeMessage = message + " (" + this.loader.resource + ":" + start.line + ":" + start.column + ").";
        this.loader.emitError(completeMessage);
        this.abort();
    }

    /**
     * Emits an error to webpack if no comment with suppress-dynamic-translation-error: true is found
     * in the scope of the passed in path
     *
     * @param message the message to emit
     * @param path the path of the node to which the error belongs
     */
    private throwSuppressableError(message: string, path: AstTypes.NodePath<any>): void {
        const call = path.node,
            calleeName = this.getCalleeName(call),
            functionName = this.getFunctionName(call),
            completeFunctionName = (calleeName ? calleeName  + "." : "") + functionName,
            completeMessage = `Illegal argument for call to ${completeFunctionName}: ${message}. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error.`;

        if (!(this.isCommentedWithSuppressErrors(path))) {
            this.throwError(completeMessage, call);
        }
        this.abort();
    }

    /**
     * Tests if a {@code suppress-dynamic-translation-error: true } comment exists in the scope of the passed in path.
     * @param path the path to check
     * @returns {boolean} {@code true} if the current block contains such a comment, otherwise false
     */
    private isCommentedWithSuppressErrors(path: AstTypes.NodePath<any>): boolean {
        return isCommentedWithSuppressError(path, this.comments);
    }

    private valueToString(value: any): string {
        if (value === null || typeof(value) === "undefined") {
            return null;
        }

        return "" + value;
    }
}

export function isCommentedWithSuppressError(path: AstTypes.NodePath<any>, comments: acorn.Comment[]): boolean {
    let blockStartPath = path;

    while (blockStartPath.parentPath && !(n.BlockStatement.check(blockStartPath.node) || n.Program.check(blockStartPath.node))) {
        blockStartPath = blockStartPath.parentPath;
    }

    const blockStart = blockStartPath.node;
    const suppressCommentExpression = /suppress-dynamic-translation-error:\s*true/;

    for (let comment of comments) {
        if (comment.loc.end.line > path.node.loc.start.line) {
            return false;
        }

        if (comment.loc.start.line >= blockStart.loc.start.line && suppressCommentExpression.test(comment.value)) {
            return true;
        }
    }

    return false;
}