var types = require("ast-types");
var b = types.builders;
var n = types.namedTypes;
var TranslateVisitor = require("../../dist/js/translate-visitor").default;
var isCommentedWithSuppressError = require("../../dist/js/translate-visitor")
  .isCommentedWithSuppressError;

describe("TranslateVisitor", function() {
  var loaderContext;
  var visitor;

  beforeEach(function() {
    loaderContext = {
      registerTranslation: jest.fn(),
      pruneTranslations: jest.fn(),
      emitError: jest.fn()
    };

    visitor = new TranslateVisitor(loaderContext);
  });

  describe("$translate", function() {
    "use strict";

    var $translate;

    beforeEach(function() {
      $translate = b.identifier("$translate");
    });

    it("extracts the translation with it's id from a $translate call with a single argument", function() {
      var translateCall = b.callExpression($translate, [b.literal("test")]);
      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });
    });

    it("extracts the translation with it's id and default text from a $translate call with a four argument", function() {
      var translateCall = b.callExpression($translate, [
        b.literal("test"),
        b.identifier("undefined"),
        b.identifier("undefined"),
        b.literal("Test")
      ]);
      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: "Test",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });
    });

    it("extracts all translation with their ids for a $translate call with an array of translation ids", function() {
      var translateCall = b.callExpression($translate, [
        b.arrayExpression([b.literal("test"), b.literal("test2")])
      ]);
      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test2",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });
    });

    it("extracts the translation when $translate is a member of this", function() {
      var translateCall = b.callExpression(
        b.memberExpression(b.thisExpression(), $translate),
        [b.literal("test")]
      );

      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });
    });

    it("extracts the translation when $translate is a member", function() {
      var translateCall = b.callExpression(
        b.memberExpression(b.identifier("_this"), $translate),
        [b.literal("test")]
      );

      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });
    });

    it("emits an error if the function is called without any arguments", function() {
      var translateCall = b.callExpression($translate, []);
      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to $translate: A call to $translate requires at least one argument that is the translation id. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (test.js:1:1)."
        })
      );
    });

    it("emits an error if the translation id is not an array expression and neither a literal", function() {
      var translateCall = b.callExpression($translate, [b.identifier("test")]);
      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to $translate: The translation id should either be a string literal or an array containing string literals. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (test.js:1:1)."
        })
      );
    });

    it("emits an error if any translation id in the passed in array is not a literal", function() {
      var translateCall = b.callExpression($translate, [
        b.arrayExpression([b.literal("test"), b.identifier("notValid")])
      ]);
      translateCall.loc = { start: { line: 1, column: 0 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to $translate: The array with the translation ids should only contain literals. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (test.js:1:0)."
        })
      );
    });

    it("emits an error if the default text is not a literal", function() {
      var translateCall = b.callExpression($translate, [
        b.literal("test"),
        b.literal(null),
        b.literal(null),
        b.identifier("test")
      ]);
      translateCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(translateCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to $translate: The default text should be a string literal. If you have registered the translation manually, you can use a /* suppress-dynamic-translation-error: true */ comment in the block of the function call to suppress this error. (test.js:1:1)."
        })
      );
    });

    it("suppress the call needs at least one argument error if block contains 'suppress-dynamic-translation-error: true' comment", function() {
      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 }
      };
      visitor.comments.push(lineComment);

      var translateCall = b.callExpression($translate, []);
      translateCall.loc = { start: { line: 2, column: 1 } };
      loaderContext.resource = "test.js";

      var root = b.program([b.expressionStatement(translateCall)]);
      root.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 }
      };

      visitor.visit(root);

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppress the id needs to be a literal error if block contains 'suppress-dynamic-translation-error: true' comment", function() {
      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 }
      };
      visitor.comments.push(lineComment);

      var translateCall = b.callExpression($translate, [b.identifier("test")]);
      translateCall.loc = { start: { line: 2, column: 1 } };
      loaderContext.resource = "test.js";

      var root = b.program([b.expressionStatement(translateCall)]);
      root.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 }
      };

      visitor.visit(root);

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppress the default value needs to be a literal error if block contains 'suppress-dynamic-translation-error: true' comment", function() {
      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 }
      };
      visitor.comments.push(lineComment);

      var translateCall = b.callExpression($translate, [
        b.literal("test"),
        b.literal(null),
        b.literal(null),
        b.identifier("defaultText")
      ]);
      translateCall.loc = { start: { line: 2, column: 1 } };
      loaderContext.resource = "test.js";

      var root = b.program([b.expressionStatement(translateCall)]);
      root.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 }
      };

      visitor.visit(root);

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  describe("i18n.registerTranslation", function() {
    "use strict";

    var i18n;
    var registerTranslation;

    beforeEach(function() {
      i18n = b.identifier("i18n");
      registerTranslation = b.memberExpression(
        i18n,
        b.identifier("registerTranslation")
      );
    });

    it("extracts the translation with it's id from a i18n.registerTranslation call with a single argument", function() {
      var registerTranslationCall = b.callExpression(registerTranslation, [
        b.literal("test")
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      var ast = visitor.visit(registerTranslationCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: undefined,
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });

      expect(visitor.changedAst).toBe(true);
      expect(n.Literal.check(ast)).toBe(true);
      expect(ast.value).toBe("test");
    });

    it("extracts the translation with it's id and default text from a i18n.registerTranslation call with a two arguments", function() {
      var registerTranslationCall = b.callExpression(registerTranslation, [
        b.literal("test"),
        b.literal("default Text")
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      var ast = visitor.visit(registerTranslationCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: "default Text",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });

      expect(visitor.changedAst).toBe(true);
      expect(n.Literal.check(ast)).toBe(true);
      expect(ast.value).toBe("test");
    });

    it("emits an error if called without arguments", function() {
      var registerTranslationCall = b.callExpression(registerTranslation, []);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(registerTranslationCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal (test.js:1:1)."
        })
      );
    });

    it("emits an error if the translation is not a literal", function() {
      var registerTranslationCall = b.callExpression(registerTranslation, [
        b.identifier("test")
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(registerTranslationCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to 'i18n.registerTranslation'. The call requires at least the 'translationId' argument that needs to be a literal (test.js:1:1)."
        })
      );
    });

    it("emits an error if the default text is not a literal", function() {
      var registerTranslationCall = b.callExpression(registerTranslation, [
        b.literal("test"),
        b.identifier("defaultText")
      ]);
      registerTranslationCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      visitor.visit(registerTranslationCall);

      expect(loaderContext.emitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Illegal argument for call to i18n.registerTranslation: the default text has to be a literal (test.js:1:1)."
        })
      );
    });
  });

  describe("i18n.registerTranslations", function() {
    "use strict";

    var i18n;
    var registerTranslations;

    beforeEach(function() {
      i18n = b.identifier("i18n");
      registerTranslations = b.memberExpression(
        i18n,
        b.identifier("registerTranslations")
      );
    });

    it("can process empty registerTranslations calls", function() {
      var registerTranslationCall = b.callExpression(registerTranslations, [
        b.objectExpression([])
      ]);
      loaderContext.resource = "test.js";

      var ast = visitor.visit(registerTranslationCall);

      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
      expect(visitor.changedAst).toBe(true);
      expect(n.ArrayExpression.check(ast)).toBe(true);
    });

    it("extracts the translation with it's id and default text from a i18n.registerTranslations call", function() {
      var registerTranslationsCall = b.callExpression(registerTranslations, [
        b.objectExpression([
          b.property("init", b.identifier("test"), b.literal("Test")),
          b.property("init", b.identifier("x"), b.literal("X"))
        ])
      ]);
      registerTranslationsCall.loc = { start: { line: 1, column: 1 } };
      loaderContext.resource = "test.js";

      var ast = visitor.visit(registerTranslationsCall);

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "test",
        defaultText: "Test",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
      });

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith({
        id: "x",
        defaultText: "X",
        usages: [
          {
            resource: "test.js",
            loc: { line: 1, column: 1 }
          }
        ]
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

  describe("isCommentedWithSuppressError", function() {
    "use strict";
    var comments;

    beforeEach(function() {
      comments = [];
    });

    /**
     * $translate();
     */
    it("returns false for a program without a comment", function() {
      var program = b.program([
        b.expressionStatement(b.callExpression(b.identifier("$translate"), []))
      ]);

      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 12 }
      };
      var root = new types.NodePath({ root: program }).get("root");

      expect(isCommentedWithSuppressError(root, comments)).toBe(false);
    });

    /**
     * // suppress-dynamic-translation-error: true
     * $translate();
     */
    it("returns true for a program with a comment", function() {
      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 }
      };
      comments.push(lineComment);

      var program = b.program([
        b.expressionStatement(b.callExpression(b.identifier("$translate"), []))
      ]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 }
      };

      var root = new types.NodePath({ root: program }).get("root");

      expect(isCommentedWithSuppressError(root, comments)).toBe(true);
    });

    /**
     * // suppress-dynamic-translation-error: true
     * $translate();
     */
    it("returns true if the containing program contains a comment", function() {
      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 38 }
      };
      comments.push(lineComment);

      var expression = b.expressionStatement(
        b.callExpression(b.identifier("$translate"), [])
      );
      expression.loc = {
        start: { line: 2, column: 1 },
        end: { line: 2, column: 12 }
      };

      var program = b.program([expression]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 2, column: 12 }
      };

      var root = new types.NodePath({ root: program }).get("root");
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
    it("returns true if a parent block contains a comment", function() {
      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 2, column: 1 },
        end: { line: 2, column: 38 }
      };
      comments.push(lineComment);

      var expression = b.expressionStatement(
        b.callExpression(b.identifier("$translate"), [])
      );
      expression.loc = {
        start: { line: 3, column: 1 },
        end: { line: 3, column: 12 }
      };

      var block = b.blockStatement([expression]);
      block.loc = {
        start: { line: 1, column: 1 },
        end: { line: 4, column: 1 }
      };

      var program = b.program([block]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 4, column: 1 }
      };

      var root = new types.NodePath({ root: program }).get("root");

      expect(
        isCommentedWithSuppressError(
          root
            .get("body")
            .get(0)
            .get("body")
            .get(0),
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
    it("returns false if a sibling block contains a comment", function() {
      var expression = b.expressionStatement(
        b.callExpression(b.identifier("$translate"), [])
      );
      expression.loc = {
        start: { line: 1, column: 1 },
        end: { line: 1, column: 12 }
      };

      var block = b.blockStatement([expression]);
      block.loc = {
        start: { line: 2, column: 1 },
        end: { line: 4, column: 1 }
      };

      var lineComment = b.line("suppress-dynamic-translation-error: true");
      lineComment.loc = {
        start: { line: 3, column: 1 },
        end: { line: 3, column: 38 }
      };
      comments.push(lineComment);

      var program = b.program([expression, block]);
      program.loc = {
        start: { line: 1, column: 1 },
        end: { line: 4, column: 1 }
      };

      var root = new types.NodePath({ root: program }).get("root");

      expect(
        isCommentedWithSuppressError(root.get("body").get(0), comments)
      ).toBe(false);
    });
  });
});
