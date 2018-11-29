var assert = require("chai").assert;
var sinon = require("sinon");

var StatefulHtmlParser = require("../../dist/html/translate-html-parser")
  .default;
var Translation = require("../../dist/translation").default;

describe("StatefulHtmlParserSpecs", function() {
  "use strict";

  var loaderContext;

  beforeEach(function() {
    loaderContext = {
      registerTranslation: sinon.spy(),
      emitError: sinon.spy(),
      emitWarning: sinon.spy(),
      resource: "test.html"
    };
  });

  describe("<translate>", function() {
    it("uses the element text as translation id", function() {
      parse("<translate>Simple</translate>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the value of the translate-default as defaultText", function() {
      parse("<translate translate-default='Other default'>Simple</translate>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", "Other default", {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("only translates the attribute if the translation id is undefined", function() {
      parse("<translate translate-attr-title='Simple'></translate>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      assert(loaderContext.registerTranslation.callCount, 1);
    });

    it("only translates the attribute if the translation id is empty", function() {
      parse("<translate translate-attr-title='Simple'>    </translate>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      assert(loaderContext.registerTranslation.callCount, 1);
    });

    it("translates the attribute and the content of the element if translate-attr is set and the element has non empty content", function() {
      parse(
        "<translate translate-attr-title='Attribute'>Element-Text</translate>"
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Attribute", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Element-Text", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the content of the element is an expression", function() {
      parse("<translate>{{controller.title}}</translate>");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: The element '<translate>{{controller.title}}</translate>'  in 'test.html' uses an angular expression as translation id ('{{controller.title}}') or as default text ('undefined'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
      );
    });

    it("emits an error if the default text is an expression", function() {
      parse(
        "<translate translate-default='{{controller.title}}'>Simple</translate>"
      );

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: The element '<translate translate-default='{{controller.title}}'>Simple</translate>'  in 'test.html' uses an angular expression as translation id ('Simple') or as default text ('{{controller.title}}'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
      );
    });

    it("suppresses the error if the translation element is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<translate suppress-dynamic-translation-error>{{controller.title}}</translate>"
      );

      assert.isNotOk(
        loaderContext.emitError.called,
        "It should not emit an error"
      );
      assert.isNotOk(
        loaderContext.registerTranslation.called,
        "It should not register the translation"
      );
    });

    it("suppresses the error if the default text is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<translate translate-default='{{controller.title}}' suppress-dynamic-translation-error>simple</translate>"
      );

      assert.isNotOk(
        loaderContext.emitError.called,
        "It should not emit an error"
      );
      assert.isNotOk(
        loaderContext.registerTranslation.called,
        "It should not register the translation"
      );
    });
  });

  describe("<any translate>", function() {
    it("uses the value of the translate-attribute as translation id", function() {
      parse("<div translate='Simple'></div>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the content as translation id if the translate-attribute has no value assigned", function() {
      parse("<div translate>Simple</div>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the value of the default-text attribute as default text.", function() {
      parse("<div translate translate-default='Other default'>Simple</div>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", "Other default", {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("only translates the attribute if the element content is empty", function() {
      parse("<div translate translate-attr-title='Simple'></div>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      assert(loaderContext.registerTranslation.callCount, 1);
    });

    it("only translates the attribute if the translation id is empty", function() {
      parse("<div translate translate-attr-title='Simple'>    </div>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Simple", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      assert(loaderContext.registerTranslation.callCount, 1);
    });

    it("translates the attribute and the content of the element if translate-attr is set and the element has non empty content", function() {
      parse(
        "<div translate translate-attr-title='Attribute'>Element-Text</div>"
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Attribute", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Element-Text", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("translates the attribute and the content of the element if translate-attr is set and the translate attribute has an assigned value", function() {
      parse(
        "<div translate='Element-Text' translate-attr-title='Attribute'></div>"
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Attribute", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Element-Text", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the value of the translate id is an expression", function() {
      parse("<div translate='{{controller.title}}'></div>");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: The element '<div translate='{{controller.title}}'>...</div>'  in 'test.html' uses an angular expression as translation id ('{{controller.title}}') or as default text ('undefined'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
      );
    });

    it("suppresses the error of a dynamic value in the translation id attribute if the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div translate='{{controller.title}}' suppress-dynamic-translation-error></div>"
      );
      assert.notOk(
        loaderContext.emitError.called,
        "It should not emit an error"
      );
      assert.notOk(
        loaderContext.registerTranslation.called,
        "It should not register the translation"
      );
    });

    it("emits an error if a translation does not have a valid id", function() {
      parse("<title translate>\n     </title>");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: the element uses the translate directive but does not specify a translation id nor has any translated attributes (translate-attr-*). Specify a translation id or remove the translate-directive."
      );
      // ensure the translation is not registered a second time because of a test if scope.text is falsy (what is the case above).
      assert.notOk(loaderContext.registerTranslation.called);
    });

    it("doesn't emit an error if a translation does not have a valid id but an attribute has been translated", function() {
      parse("<title translate translate-attr-title='test'>\n     </title>");

      assert.notOk(loaderContext.emitError.called);
    });
  });

  describe("<any translate translate-attr-*>", function() {
    it("uses the value of the translate-attr-title attribute as translation-id", function() {
      parse("<div translate translate-attr-title='test'></div>");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("test", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the default text from the translate-default-attr-*", function() {
      parse(
        "<div translate translate-attr-title='test' translate-default-attr-title='Default Text'></div>"
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("test", "Default Text", {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("doesn't register a translation for the content of an element attributed with translate-attr", function() {
      parse(
        "<div translate translate-attr-title='test'><span>Test</span></div>"
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("test", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      assert.equal(
        loaderContext.registerTranslation.callCount,
        1,
        "Not translated content is not registered as translation"
      );
    });

    it("emits an error if translate-attr uses an expression", function() {
      parse(
        "<div translate translate-attr-title='{{controller.title}}'></div>"
      );

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: The element '<div translate='' translate-attr-title='{{controller.title}}'>...</div>'  in 'test.html' uses an angular expression as translation id ('{{controller.title}}') or as default text ('undefined'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
      );
      assert.notOk(loaderContext.registerTranslation.called);
    });

    it("suppresses the error if translate-attr is used and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div translate translate-attr-title='{{controller.title}}' suppress-dynamic-translation-error></div>"
      );

      assert.notOk(loaderContext.emitError.called);
      assert.notOk(loaderContext.registerTranslation.called);
    });
  });

  describe("{{ any | translate }}", function() {
    it("extracts the translation id of a translate filter with a literal value", function() {
      parse("{{ 'test' | translate }}");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("test", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("extracts the translation id if the translate filter is the first in chain and a literal value is used", function() {
      parse("{{ 'test' | translate | uppercase }}");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("test", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("extracts the translation id if the translate filter is used inside a text body", function() {
      parse("{{ ctrl.total | number:0 }} {{ 'USD' | translate }} ($)");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("USD", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the translate filter is being used for a dynamic value", function() {
      parse("{{ controller.title | translate }}");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: A dynamic filter expression is used in the text or an attribute of the element '<root>{{ controller.title | translate }}</root>'. Add the 'suppress-dynamic-translation-error' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation)."
      );
    });

    it("emits an error if the translate filter is not the first in the filter chain", function() {
      parse("{{ 'title' | uppercase | translate }}");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: Another filter is used before the translate filter in the element <root>{{ 'title' | uppercase | translate }}</root>. Add the 'suppress-dynamic-translation-error' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation)."
      );
    });

    it("suppresses the error for a filter with a dynamic value if suppress-dynamic-translate-error is used on the parent element", function() {
      parse(
        "<span suppress-dynamic-translation-error>{{ controller.title | translate }}</span>"
      );

      assert.notOk(
        loaderContext.emitError.called,
        "It should not emit an error"
      );
      assert.notOk(
        loaderContext.registerTranslation.called,
        "It should not register the translation"
      );
    });

    it("suppresses the error for a filter chain where translate is not the first filter if suppress-dynamic-translate-error is used on the parent element", function() {
      parse(
        "<span suppress-dynamic-translation-error>{{ 'title' | uppercase | translate }}</span>"
      );

      assert.notOk(
        loaderContext.emitError.called,
        "It should not emit an error"
      );
      assert.notOk(
        loaderContext.registerTranslation.called,
        "It should not register the translation"
      );
    });
  });

  describe("<any attr='{{ any | translate }}'>", function() {
    it("extracts the translation from an attribute with translate filter", function() {
      parse("<img src='xy' title=\"{{ 'Waterfall' | translate }}\" />");

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Waterfall", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("extracts multiple translations from an attribute with translate filters", function() {
      parse(
        "<img src='xy' title=\"Fixed Text: {{ 'Waterfall' | translate }} and {{ 'Other' | translate }}\" />"
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Waterfall", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );

      sinon.assert.calledWith(
        loaderContext.registerTranslation,
        new Translation("Other", undefined, {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the translate filter is not the first in the filter chain", function() {
      parse("<img src='xz' alt='{{ \"title\" | uppercase | translate }}' />");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: Another filter is used before the translate filter in the element <img src='xz' alt='{{ \"title\" | uppercase | translate }}'>...</img>. Add the 'suppress-dynamic-translation-error' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation)."
      );
    });

    it("emits an error if the translate filter is used for a dynamic value", function() {
      parse("<img src='xz' alt='{{ ctrl.imgAlt | translate }}' />");

      sinon.assert.calledWith(
        loaderContext.emitError,
        "Failed to extract the angular-translate translations from test.html:1:0: A dynamic filter expression is used in the text or an attribute of the element '<img src='xz' alt='{{ ctrl.imgAlt | translate }}'>...</img>'. Add the 'suppress-dynamic-translation-error' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation)."
      );
    });
  });

  describe("invalid cases", function() {
    it("does not register an empty element without the translate attribute", function() {
      parse("<div></div>");

      assert.notOk(loaderContext.registerTranslation.called);
    });

    it("does not register a translation for an element without the translate attribute", function() {
      parse("<div>Test</div>");

      assert.notOk(loaderContext.registerTranslation.called);
    });

    it("does not register a translation for a translate-attribute if the translate directive is missing on the element", function() {
      parse("<div translate-attr-title='test'>Test</div>");

      assert.notOk(loaderContext.registerTranslation.called);
    });
  });

  function parse(source) {
    var statefulParser = new StatefulHtmlParser(loaderContext);
    statefulParser.parse(source);
    return statefulParser;
  }
});
