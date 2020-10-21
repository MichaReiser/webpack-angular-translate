import "../translate-jest-matchers";
import { builders as b, namedTypes as n, NodePath } from "ast-types";
import createTranslateVisitor, {
  isCommentedWithSuppressError,
} from "../../src/js/translate-visitor";

describe("TranslateVisitor", function () {
  let loaderContext;
  let visitor;

  beforeEach(() => {
    loaderContext = {
      registerTranslation: jest.fn().mockName("registerTranslation"),
      pruneTranslations: jest.fn(),
      emitError: jest.fn(),
      context: "path",
      resourcePath: "path/test.js",
      resource: "test.js",
    };

    visitor = createTranslateVisitor(loaderContext);
  });

  describe("$translate", () => {
    let $translate;

    beforeEach(() => {
      $translate = b.identifier("$translate");
    });

    it("extracts the translation with it's id from a $translate call with a single argument", () => {
      let translateCall = b.callExpression($translate, [b.literal("test")]);
      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });
    });

    it("extracts the translation with it's id and default text from a $translate call with a four argument", () => {
      let translateCall = b.callExpression($translate, [
        b.literal("test"),
        b.identifier("undefined"),
        b.identifier("undefined"),
        b.literal("Test"),
      ]);
      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: "Test",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });
    });

    it("extracts all translation with their ids for a $translate call with an array of translation ids", function () {
      let translateCall = b.callExpression($translate, [
        b.arrayExpression([b.literal("test"), b.literal("test2")]),
      ]);
      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test2",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });
    });

    it("extracts the translation when $translate is a member of this", function () {
      let translateCall = b.callExpression(
        b.memberExpression(b.thisExpression(), $translate),
        [b.literal("test")]
      );

      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });
    });

    it("extracts the translation when $translate is a member", function () {
      let translateCall = b.callExpression(
        b.memberExpression(b.identifier("_this"), $translate),
        [b.literal("test")]
      );

      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });
    });

    it("emits an error if the function is called without any arguments", function () {
      let translateCall = b.callExpression($translate, []);
      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the translation id is not an array expression and neither a literal", function () {
      let translateCall = b.callExpression($translate, [b.identifier("test")]);
      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if any translation id in the passed in array is not a literal", function () {
      let translateCall = b.callExpression($translate, [
        b.arrayExpression([b.literal("test"), b.identifier("notValid")]),
      ]);
      translateCall.loc = { start: { line: 1, column: 0 } };

      visitor.visit(translateCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the default text is not a literal", function () {
      let translateCall = b.callExpression($translate, [
        b.literal("test"),
        b.literal(null),
        b.literal(null),
        b.identifier("test"),
      ]);
      translateCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(translateCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("suppress the call needs at least one argument error if block contains 'suppress-dynamic-translation-error: true' comment", function () {
      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 },
      };
      visitor.comments.push(lineComment);

      let translateCall = b.callExpression($translate, []);
      translateCall.loc = { start: { line: 2, column: 1 } };

      let root = b.program([b.expressionStatement(translateCall)]);
      root.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 },
      };

      visitor.visit(root);

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppress the id needs to be a literal error if block contains 'suppress-dynamic-translation-error: true' comment", function () {
      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 },
      };
      visitor.comments.push(lineComment);

      let translateCall = b.callExpression($translate, [b.identifier("test")]);
      translateCall.loc = { start: { line: 2, column: 1 } };

      let root = b.program([b.expressionStatement(translateCall)]);
      root.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 },
      };

      visitor.visit(root);

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppress the default value needs to be a literal error if block contains 'suppress-dynamic-translation-error: true' comment", function () {
      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 },
      };
      visitor.comments.push(lineComment);

      let translateCall = b.callExpression($translate, [
        b.literal("test"),
        b.literal(null),
        b.literal(null),
        b.identifier("defaultText"),
      ]);
      translateCall.loc = { start: { line: 2, column: 1 } };

      let root = b.program([b.expressionStatement(translateCall)]);
      root.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 },
      };

      visitor.visit(root);

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  describe("i18n.registerTranslation", function () {
    "use strict";

    let i18n;
    let registerTranslation;

    beforeEach(function () {
      i18n = b.identifier("i18n");
      registerTranslation = b.memberExpression(
        i18n,
        b.identifier("registerTranslation")
      );
    });

    it("extracts the translation with it's id from a i18n.registerTranslation call with a single argument", function () {
      let registerTranslationCall = b.callExpression(registerTranslation, [
        b.literal("test"),
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };

      let ast = visitor.visit(registerTranslationCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });

      expect(visitor.changedAst).toBe(true);
      expect(n.Literal.check(ast)).toBe(true);
      expect(ast.value).toBe("test");
    });

    it("extracts the translation with it's id and default text from a i18n.registerTranslation call with a two arguments", function () {
      let registerTranslationCall = b.callExpression(registerTranslation, [
        b.literal("test"),
        b.literal("default Text"),
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };

      let ast = visitor.visit(registerTranslationCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: "default Text",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });

      expect(visitor.changedAst).toBe(true);
      expect(n.Literal.check(ast)).toBe(true);
      expect(ast.value).toBe("test");
    });

    it("emits an error if called without arguments", function () {
      let registerTranslationCall = b.callExpression(registerTranslation, []);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(registerTranslationCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the translation is not a literal", function () {
      let registerTranslationCall = b.callExpression(registerTranslation, [
        b.identifier("test"),
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(registerTranslationCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the default text is not a literal", function () {
      let registerTranslationCall = b.callExpression(registerTranslation, [
        b.literal("test"),
        b.identifier("defaultText"),
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };

      visitor.visit(registerTranslationCall);

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });
  });

  describe("i18n.registerTranslations", function () {
    "use strict";

    let i18n;
    let registerTranslations;

    beforeEach(function () {
      i18n = b.identifier("i18n");
      registerTranslations = b.memberExpression(
        i18n,
        b.identifier("registerTranslations")
      );
    });

    it("can process empty registerTranslations calls", function () {
      let registerTranslationCall = b.callExpression(registerTranslations, [
        b.objectExpression([]),
      ]);

      let ast = visitor.visit(registerTranslationCall);

      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
      expect(visitor.changedAst).toBe(true);
      expect(n.ArrayExpression.check(ast)).toBe(true);
    });

    it("extracts the translation with it's id and default text from a i18n.registerTranslations call", function () {
      let registerTranslationsCall = b.callExpression(registerTranslations, [
        b.objectExpression([
          b.property("init", b.identifier("test"), b.literal("Test")),
          b.property("init", b.identifier("x"), b.literal("X")),
        ]),
      ]);
      registerTranslationsCall.loc = { start: { line: 1, column: 1 } };

      let ast = visitor.visit(registerTranslationsCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: "Test",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "x",
        defaultText: "X",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 },
          },
        ],
      });

      expect(visitor.changedAst).toBe(true);
      expect(n.ArrayExpression.check(ast)).toBe(true);
      expect(ast.elements).toHaveLength(2);
      expect(n.Literal.check(ast.elements[0])).toBe(true);
      expect(n.Literal.check(ast.elements[1])).toBe(true);
      expect(ast.elements[0].value).toBe("test");
      expect(ast.elements[1].value).toBe("x");
    });

    // TODO bad cases
  });

  describe("isCommentedWithSuppressError", function () {
    "use strict";
    let comments;

    beforeEach(function () {
      comments = [];
    });

    /**
     * $translate();
     */
    it("returns false for a program without a comment", function () {
      let program = b.program([
        b.expressionStatement(b.callExpression(b.identifier("$translate"), [])),
      ]);

      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 12 },
      };
      let root = new NodePath({ root: program }).get("root");

      expect(isCommentedWithSuppressError(root, comments)).toBe(false);
    });

    /**
     * // suppress-dynamic-translation-error: true
     * $translate();
     */
    it("returns true for a program with a comment", function () {
      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 },
      };
      comments.push(lineComment);

      let program = b.program([
        b.expressionStatement(b.callExpression(b.identifier("$translate"), [])),
      ]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 },
      };

      let root = new NodePath({ root: program }).get("root");

      expect(isCommentedWithSuppressError(root, comments)).toBe(true);
    });

    /**
     * // suppress-dynamic-translation-error: true
     * $translate();
     */
    it("returns true if the containing program contains a comment", function () {
      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 },
      };
      comments.push(lineComment);

      let expression = b.expressionStatement(
        b.callExpression(b.identifier("$translate"), [])
      );
      expression.loc = {
        start: { line: 2, column: 1 },
        end: { line: 2, column: 12 },
      };

      let program = b.program([expression]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 },
      };

      let root = new NodePath({ root: program }).get("root");
      expect(
        isCommentedWithSuppressError(root.get("body").get(0), comments)
      ).toBe(true);
    });

    /**
     * {
     *      // suppress-dynamic-translation-error: true
     *      $translate();
     *  }
     */
    it("returns true if a parent block contains a comment", function () {
      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 2, column: 1 },
        end: { line: 2, column: 38 },
      };
      comments.push(lineComment);

      let expression = b.expressionStatement(
        b.callExpression(b.identifier("$translate"), [])
      );
      expression.loc = {
        start: { line: 3, column: 1 },
        end: { line: 3, column: 12 },
      };

      let block = b.blockStatement([expression]);
      block.loc = {
        start: { line: 1, column: 1 },
        end: { line: 4, column: 1 },
      };

      let program = b.program([block]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 4, column: 1 },
      };

      let root = new NodePath({ root: program }).get("root");

      expect(
        isCommentedWithSuppressError(
          root.get("body").get(0).get("body").get(0),
          comments
        )
      ).toBe(true);
    });

    /**
     * $translate();
     * {
     *      // suppress-dynamic-translation-error: true
     * }
     */
    it("returns false if a sibling block contains a comment", function () {
      let expression = b.expressionStatement(
        b.callExpression(b.identifier("$translate"), [])
      );
      expression.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 12 },
      };

      let block = b.blockStatement([expression]);
      block.loc = {
        start: { line: 2, column: 1 },
        end: { line: 4, column: 1 },
      };

      let lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 3, column: 1 },
        end: { line: 3, column: 38 },
      };
      comments.push(lineComment);

      let program = b.program([expression, block]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 4, column: 1 },
      };

      let root = new NodePath({ root: program }).get("root");

      expect(
        isCommentedWithSuppressError(root.get("body").get(0), comments)
      ).toBe(false);
    });
  });
});
