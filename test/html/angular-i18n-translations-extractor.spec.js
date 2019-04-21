import angularI18nTranslationsExtractor from "../../src/html/angular-i18n-translations-extractor";
import StatefulHtmlParser from "../../src/html/translate-html-parser";
import Translation from "../../src/translation";

require("../translate-jest-matchers");

describe("StatefulHtmlParserSpecs", function() {
  "use strict";

  let loaderContext;

  beforeEach(function() {
    loaderContext = {
      registerTranslation: jest.fn(),
      emitError: jest.fn(),
      emitWarning: jest.fn(),
      resourcePath: "path/test.html",
      context: "path"
    };
  });

  describe("<any i18n>", function() {
    it("uses the value of the i18n attribute without the '@@' as translation id and the content as default translation", function() {
      parse("<div i18n='@@Simple Case id'>Simple case</div>");

      expect(loaderContext.registerTranslation).toHaveBeenLastCalledWith(
        new Translation("Simple Case id", "Simple case", {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the attribute value does not contain the id indicator '@@'.", function() {
      parse("<div i18n='Simple Case id'>Simple case</div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the attribute value contains an empty id", function() {
      parse("<div i18n='@@'>Simple case</div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if no default translation is provided", function() {
      parse("<div i18n='@@Simple Case id'></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the element contains multiple child nodes", function() {
      parse(
        "<div i18n='@@Simple Case id'>Created by <b>Thomas Muster</b> at 13:34</div>"
      );

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the content of the element is an expression", function() {
      parse("<div i18n='@@Simple Case id'>{{someValue}}</div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the value of the translate id is an expression", function() {
      parse("<div i18n='@@{{id}}'>Not an expression</div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error if the translation element is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div suppress-dynamic-translation-error> i18n='@@Simple Case id'>{{someValue}}</div>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error if the default text is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div i18n='@@{{id}}' suppress-dynamic-translation-error>Not an expression</div>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  describe("<any i18n-*>", function() {
    it("uses the value of an i18n-[attr] without '@@' as translation id and the value of the [attr] as default text", function() {
      parse(
        "<div i18n-title='@@test attribute id' title='test attribute'></div>"
      );

      expect(loaderContext.registerTranslation).toHaveBeenCalledWith(
        new Translation("test attribute id", "test attribute", {
          resource: "test.html",
          loc: { line: 1, column: 0 }
        })
      );
    });

    it("emits an error if the attribute value does not contain the id indicator '@@'.", function() {
      parse(
        "<div i18n-title='test attribute id' title='test attribute'></div>"
      );

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the attribute value contains an empty id", function() {
      parse("<div i18n-title='@@' title='test attribute'></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if no corresponding attribute [attr] exist for the i18n-[attr] attribute", function() {
      parse("<div i18n-title='@@test attribute id'></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the corresponding attribute [attr] is empty", function() {
      parse("<div i18n-title='@@test attribute id' title=''></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the default translation is an expression", function() {
      parse("<div  i18n-title='@@myTitle' title='{{myTitle}}'></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("emits an error if the i18n-[attr] uses an expression as id", function() {
      parse("<div i18n-title='@@{{id}}' title='My title'></div>");

      expect(loaderContext).toHaveEmittedErrorMatchingSnapshot();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error if the i18n-[attr] id is used and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div i18n-title='@@{{id}}' title='My title' suppress-dynamic-translation-error></div>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });

    it("suppresses the error if the default text is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
      parse(
        "<div  i18n-title='@@myTitle' title='{{myTitle}}' suppress-dynamic-translation-error></div>"
      );

      expect(loaderContext.emitError).not.toHaveBeenCalled();
      expect(loaderContext.registerTranslation).not.toHaveBeenCalled();
    });
  });

  function parse(source) {
    let statefulParser = new StatefulHtmlParser(loaderContext, [
      angularI18nTranslationsExtractor
    ]);
    statefulParser.parse(source);
    return statefulParser;
  }
});
