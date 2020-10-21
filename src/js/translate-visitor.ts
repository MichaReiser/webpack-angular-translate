import * as path from "path";
import type {NodePath} from "ast-types/lib/node-path";
import {namedTypes as n, builders as b, PathVisitor} from "ast-types";
import { Context } from "ast-types/lib/path-visitor";
import type { namedTypes } from "ast-types";
import Translation from "../translation";
import TranslateLoaderContext from "../translate-loader-context";

const TRANSLATE_SERVICE_NAME = "$translate";

export default function createTranslateVisitor(
  loader: TranslateLoaderContext,
  parserOptions: acorn.Options = { ecmaVersion: "latest" }
) {
  let context: Context = null;
  const comments: acorn.Comment[] = [];
  const options: acorn.Options = {
    ...parserOptions,
    locations: true,
    onComment: comments,
    // onToken: tokens,
    ranges: true
  };

  /**
   * Handles a $translate(translateId, interpolateParams, interpolationId, defaultText) call.
   * @param path the path to the call expression
   */
  function visitTranslate(path: NodePath<namedTypes.CallExpression>): void {
    const call = path.node;
    const args = call.arguments;

    if (args.length < 1) {
      throwSuppressableError(
        `A call to ${TRANSLATE_SERVICE_NAME} requires at least one argument that is the translation id`,
        path
      );
    }

    const translationIds = getTranslationIdFromTranslateCall(path);
    const defaultText = getDefaultTextFromTranslateCall(path);

    for (const translationId of translationIds) {
      const translation = createTranslation(translationId, defaultText, call);
      loader.registerTranslation(translation);
    }
  }

  function getTranslationIdFromTranslateCall(
    path: NodePath<namedTypes.CallExpression>
  ): any[] {
    const args = path.node.arguments;

    if (n.Literal.check(args[0])) {
      return [args[0].value];
    }

    if (n.ArrayExpression.check(args[0])) {
      const arrayExpression = args[0];
      return arrayExpression.elements.map(element => {
        if (n.Literal.check(element)) {
          return element.value;
        }
        throwSuppressableError(
          "The array with the translation ids should only contain literals",
          path
        );
      });
    }

    throwSuppressableError(
      "The translation id should either be a string literal or an array containing string literals",
      path
    );
  }

  function getDefaultTextFromTranslateCall(
    path: NodePath<namedTypes.CallExpression>
  ): any {
    const args = path.node.arguments;

    if (args.length > 3) {
      if (n.Literal.check(args[3])) {
        return args[3].value;
      }

      throwSuppressableError(
        "The default text should be a string literal",
        path
      );
    }

    return undefined;
  }

  /**
   * Handles a call to i18n.registerTranslation(translationId, defaultText?).
   * Evaluates the expression and registers a translation. The call expression itself is replaced with the id of the
   * translation id.
   * @param path of the call expression.
   */
  function visitRegisterTranslation(path: NodePath<namedTypes.CallExpression>): void {
    const call = path.node,
      args = call.arguments;

    if (args.length === 0 || !n.Literal.check(args[0])) {
      throwError(
        "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal",
        call
      );
    }

    const translationId = args[0].value;
    let defaultText: any;

    if (args.length > 1) {
      if (n.Literal.check(args[1])) {
        defaultText = <string>args[1].value;
      } else {
        throwError(
          "Illegal argument for call to i18n.registerTranslation: the default text has to be a literal",
          call
        );
      }
    }

    const translation = createTranslation(translationId, defaultText, call);

    loader.registerTranslation(translation);
    path.replace(b.literal(translation.id));
    context.reportChanged();
  }

  /**
   * Handles a call to i18n.registerTranslations({ translationId: defaultText }).
   * @param path the path to the call expression
   */
  function visitRegisterTranslations(path: NodePath<any>): void {
    const call = path.node,
      args = call.arguments,
      translationsArgument = args.length === 0 ? null : args[0];

    if (
      translationsArgument === null ||
      !n.ObjectExpression.check(translationsArgument)
    ) {
      throwError(
        "Illegal argument for call to i18n.registerTranslations: requires a single argument that is an object where the key is the translationId and the value is the default text",
        call
      );
    }

    const translations: Translation[] = (translationsArgument).properties.map(property => {
      let translationId: any;
      let defaultText: any;

      if (
        property.type === "SpreadElement" ||
        property.type === "SpreadProperty" ||
        property.type === "ObjectMethod"
      ) {
        throwError(
          "Illegal argument for call to i18n.registerTranslations: The passed object contains a spread property, spread element, or method. This is not supported.",
          property
        );
        return;
      }

      if (n.Identifier.check(property.key)) {
        translationId = property.key.name;
      } else if (n.Literal.check(property.key)) {
        translationId = property.key.value;
      } else {
        throwError(
          "Illegal argument for call to i18n.registerTranslations: The key needs to be a literal or an identifier.",
          call
        );
      }

      if (n.Literal.check(property.value)) {
        defaultText = property.value.value;
      } else {
        throwError(
          `Illegal argument for call to i18n.registerTranslations: The value for the key '${translationId}' needs to be a literal`,
          call
        );
      }

      return createTranslation(translationId, defaultText, call);
    });

    for (const translation of translations) {
      loader.registerTranslation(translation);
    }
    const ids = b.arrayExpression(
      translations.map(translation => b.literal(translation.id))
    );
    path.replace(ids);
    context.reportChanged();
  }

  function createTranslation(
    translationId: any,
    defaultText: any,
    node: namedTypes.Node
  ): Translation {
    const idAsString = valueToString(translationId, "");
    const defaultTextAsString = valueToString(defaultText, undefined);
    return new Translation(idAsString, defaultTextAsString, {
      resource: path.relative(loader.context, loader.resourcePath),
      loc: node.loc!.start
    });
  }

  /**
   * Gets the function name from a call expression
   * @param call the call expression
   * @returns {string} the name of the function
   */
  function getFunctionName(call: namedTypes.CallExpression): string | undefined {
    var callee = call.callee;
    if (n.Identifier.check(callee)) {
      return callee.name;
    } else if (n.MemberExpression.check(callee)) {
      const property = callee.property;
      if (n.Identifier.check(property)) {
        return property.name;
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
  function getCalleeName(call: namedTypes.CallExpression): string | null {
    // this.method() or object.method()
    if (call.callee.type === "MemberExpression") {
      const member = call.callee;
      if (member.object.type === "Identifier") {
        return member.object.name;
      } else if (member.object.type === "ThisExpression") {
        return "this";
      } else if (member.object.type == "MemberExpression") {
        const parent = member.object;
        if (parent.property.type === "Identifier") {
          return parent.property.name;
        }
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
  function throwError(message: string, node: namedTypes.Node): never {
    const relativePath = path.relative(loader.context, loader.resourcePath);
    const start = node.loc!.start,
      completeMessage = `${message} (${relativePath}:${start.line}:${
        start.column
      })`;
    loader.emitError(new Error(completeMessage));
    throw context.abort();
  }

  /**
   * Emits an error to webpack if no comment with suppress-dynamic-translation-error: true is found
   * in the scope of the passed in path
   *
   * @param message the message to emit
   * @param path the path of the node to which the error belongs
   */
  function throwSuppressableError(message: string, path: NodePath<any>): void {
    const call = path.node,
      calleeName = getCalleeName(call),
      functionName = getFunctionName(call),
      completeFunctionName =
        (calleeName ? calleeName + "." : "") + functionName,
      completeMessage = `Illegal argument for call to ${completeFunctionName}: ${message}. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error.`;

    if (!isCommentedWithSuppressErrors(path)) {
      throwError(completeMessage, call);
    }
    context.abort();
  }

  /**
   * Tests if a {@code suppress-dynamic-translation-error: true } comment exists in the scope of the passed in path.
   * @param path the path to check
   * @returns {boolean} {@code true} if the current block contains such a comment, otherwise false
   */
  function isCommentedWithSuppressErrors(path: NodePath<any>): boolean {
    return isCommentedWithSuppressError(path, comments);
  }

  function valueToString<TDefault>(
    value: any,
    fallback: TDefault
  ): string | TDefault {
    if (value === null || typeof value === "undefined") {
      return fallback;
    }

    return "" + value;
  }

  const visitor = PathVisitor.fromMethodsObject({
    visitCallExpression(path: NodePath<namedTypes.CallExpression>): boolean {
      context = this;
      const call = path.node,
        functionName = getFunctionName(call),
        calleeName = getCalleeName(call);

      try {
        if (functionName === TRANSLATE_SERVICE_NAME) {
          visitTranslate(path);
        } else if (
          functionName === "registerTranslation" &&
          calleeName === "i18n"
        ) {
          visitRegisterTranslation(path);
        } else if (
          functionName === "registerTranslations" &&
          calleeName === "i18n"
        ) {
          visitRegisterTranslations(path);
        } else if (
          functionName === "instant" &&
          calleeName === TRANSLATE_SERVICE_NAME
        ) {
          visitTranslate(path);
        } else {
          context.traverse(path);
        }
      } catch (e) {
        if (e instanceof context.AbortRequest) {
          (e as any).cancel();
        } else {
          throw e;
        }
      }

      return false;
    }
  });

  return {
    get changedAst() {
      return visitor.wasChangeReported();
    },

    comments,
    options,

    visit(ast: any) {
      return visitor.visit(ast);
    }
  };
}

export function isCommentedWithSuppressError(
  path: NodePath<any>,
  comments: acorn.Comment[]
): boolean {
  let blockStartPath = path;

  while (
    blockStartPath.parentPath &&
    !(
      n.BlockStatement.check(blockStartPath.node) ||
      n.Program.check(blockStartPath.node)
    )
  ) {
    blockStartPath = blockStartPath.parentPath;
  }

  const blockStart = blockStartPath.node;
  const suppressCommentExpression = /suppress-dynamic-translation-error:\s*true/;

  for (let comment of comments) {
    if (comment.loc!.end.line > path.node.loc.start.line) {
      return false;
    }

    if (
      comment.loc!.start.line >= blockStart.loc!.start.line &&
      suppressCommentExpression.test(comment.value)
    ) {
      return true;
    }
  }

  return false;
}
