const translateDirectiveTranslationExtractor = require("../../dist/html/translate-directive-translation-extractor")
  .default;
var StatefulHtmlParser = require("../../dist/html/translate-html-parser")
  .default;
var Translation = require("../../dist/translation").default;

require("../translate-jest-matchers");

describe("StatefulHtmlParserSpecs", function() {
  "use strict";

  var loaderContext;

  beforeEach(function() {
    loaderContext = {
      registerTranslation: jest.fn(),
      emitError: jest.fn(),
      emitWarning: jest.fn(),
      resourcePath: "path/test.html",
      context: "path"
    };
  });

  describe("<translate>", function() {
    it("uses the element text as translation id", function() {
      parse("<translate>Simple</translate>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the translate attribute value as id", function() {
      parse("<translate translate='simple-id'>Simple</translate>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("simple-id", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the value of the translate-default as defaultText", function() {
      parse("<translate translate-default='Other default'>Simple</translate>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", "Other default", {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("only translates the attribute if the translation id is undefined", function() {
      parse("<translate translate-attr-title='Simple'></translate>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledTimes(1);
    });

    it("only translates the attribute if the translation id is empty", function() {
      parse("<translate translate-attr-title='Simple'>    </translate>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledTimes(1);
    });

    it("translates the attribute and the content of the element if translate-attr is set and the element has non empty content", function() {
      parse(
        "<translate translate-attr-title='Attribute'>Element-Text</translate>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Attribute", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Element-Text", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the content of the element is an expression", function() {
      parse("<translate>{{controller.title}}</translate>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the default text is an expression", function() {
      parse(
        "<translate translate-default='{{controller.title}}'>Simple</translate>"
      );

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("suppresses the error if the translation element is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<translate suppress-dynamic-translation-error>{{controller.title}}</translate>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error if the default text is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<translate translate-default='{{controller.title}}' suppress-dynamic-translation-error>simple</translate>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  describe("<any translate>", function() {
    it("uses the value of the translate-attribute as translation id", function() {
      parse("<div translate='Simple'></div>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the content as translation id if the translate-attribute has no value assigned", function() {
      parse("<div translate>Simple</div>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the value of the default-text attribute as default text.", function() {
      parse("<div translate translate-default='Other default'>Simple</div>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", "Other default", {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("only translates the attribute if the element content is empty", function() {
      parse("<div translate translate-attr-title='Simple'></div>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledTimes(1);
    });

    it("only translates the attribute if the translation id is empty", function() {
      parse("<div translate translate-attr-title='Simple'></div>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Simple", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledTimes(1);
    });

    it("translates the attribute and the content of the element if translate-attr is set and the element has non empty content", function() {
      parse(
        "<div translate translate-attr-title='Attribute'>Element-Text</div>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Attribute", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Element-Text", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("translates the attribute and the content of the element if translate-attr is set and the translate attribute has an assigned value", function() {
      parse(
        "<div translate='Element-Text' translate-attr-title='Attribute'></div>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Attribute", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Element-Text", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the value of the translate id is an expression", function() {
      parse("<div translate='{{controller.title}}'></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("suppresses the error of a dynamic value in the translation id attribute if the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div translate='{{controller.title}}' suppress-dynamic-translation-error></div>"
      );
      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if a translation does not have a valid id", function() {
      parse("<title translate>\n     </title>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      // ensure the translation is not registered a second time because of a test if scope.text is falsy (what is the case above).
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("doesn't emit an error if a translation does not have a valid id but an attribute has been translated", function() {
      parse("<title translate translate-attr-title='test'>\n     </title>");

      expect(loaderContext.emitError).not.toHaveBeenCalled();
    });
  });

  describe("<any translate translate-attr-*>", function() {
    it("uses the value of the translate-attr-title attribute as translation-id", function() {
      parse("<div translate translate-attr-title='test'></div>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("test", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("uses the default text from the translate-default-attr-*", function() {
      parse(
        "<div translate translate-attr-title='test' translate-default-attr-title='Default Text'></div>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("test", "Default Text", {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("doesn't register a translation for the content of an element attributed with translate-attr", function() {
      parse(
        "<div translate translate-attr-title='test'><span>Test</span></div>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("test", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledTimes(1);
    });

    it("emits an error if translate-attr uses an expression", function() {
      parse(
        "<div translate translate-attr-title='{{controller.title}}'></div>"
      );

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error if translate-attr is used and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div translate translate-attr-title='{{controller.title}}' suppress-dynamic-translation-error></div>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  describe("{{ any | translate }}", function() {
    it("extracts the translation id of a translate filter with a literal value", function() {
      parse("<root>{{ 'test' | translate }}</root>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("test", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 6 }
        })
      );
    });

    it("extracts the translation id if the translate filter is the first in chain and a literal value is used", function() {
      parse("<root>{{ 'test' | translate | uppercase }}</root>");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("test", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 6 }
        })
      );
    });

    it("extracts the translation id if the translate filter is used inside a text body", function() {
      parse(
        "<root>{{ ctrl.total | number:0 }} {{ 'USD' | translate }} ($)</root>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("USD", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 6 }
        })
      );
    });

    it("emits an error if the translate filter is being used for a dynamic value", function() {
      parse("<root>{{ controller.title | translate }}</root>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the translate filter is not the first in the filter chain", function() {
      parse("<root>{{ 'title' | uppercase | translate }}</root>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("suppresses the error for a filter with a dynamic value if suppress-dynamic-translate-error is used on the parent element", function() {
      parse(
        "<span suppress-dynamic-translation-error>{{ controller.title | translate }}</span>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error for a filter chain where translate is not the first filter if suppress-dynamic-translate-error is used on the parent element", function() {
      parse(
        "<span suppress-dynamic-translation-error>{{ 'title' | uppercase | translate }}</span>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  describe("<any attr='{{ any | translate }}'>", function() {
    it("extracts the translation from an attribute with translate filter", function() {
      parse("<img src='xy' title=\"{{ 'Waterfall' | translate }}\" />");

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Waterfall", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("extracts multiple translations from an attribute with translate filters", function() {
      parse(
        "<img src='xy' title=\"Fixed Text: {{ 'Waterfall' | translate }} and {{ 'Other' | translate }}\" />"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Waterfall", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("Other", undefined, {
          resource: "path/test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the translate filter is not the first in the filter chain", function() {
      parse("<img src='xz' alt='{{ \"title\" | uppercase | translate }}' />");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });

    it("emits an error if the translate filter is used for a dynamic value", function() {
      parse("<img src='xz' alt='{{ ctrl.imgAlt | translate }}' />");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
    });
  });

  describe("invalid cases", function() {
    it("does not register an empty element without the translate attribute", function() {
      parse("<div></div>");

      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("does not register a translation for an element without the translate attribute", function() {
      parse("<div>Test</div>");

      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("does not register a translation for a translate-attribute if the translate directive is missing on the element", function() {
      parse("<div translate-attr-title='test'>Test</div>");

      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  function parse(source) {
    var statefulParser = new StatefulHtmlParser(loaderContext, [
      translateDirectiveTranslationExtractor
    ]);
    statefulParser.parse(source);
    return statefulParser;
  }
});
