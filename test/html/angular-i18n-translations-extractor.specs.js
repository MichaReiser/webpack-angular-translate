// import angular
var assert = require("chai").assert;
var sinon = require("sinon");

const angularI18nTranslationsExtractor = require("../../dist/html/angular-i18n-translations-extractor")
    .default;
var StatefulHtmlParser = require("../../dist/html/translate-html-parser")
    .default;
var Translation = require("../../dist/translation").default;

describe("StatefulHtmlParserSpecs", function() {
    "use strict";

    let loaderContext;

    beforeEach(function() {
        loaderContext = {
            registerTranslation: sinon.spy(),
            emitError: sinon.spy(),
            emitWarning: sinon.spy(),
            resource: "test.html"
        };
    });

    describe("<any i18n>", function() {
        it("uses the value of the i18n attribute without the '@@' as translation id and the content as default translation", function() {
            parse("<div i18n='@@Simple Case id'>Simple case</div>");

            sinon.assert.calledWith(
                loaderContext.registerTranslation,
                new Translation("Simple Case id", "Simple case", {
                    resource: "test.html",
                    loc: { line: 1, column: 0 }
                })
            );
        });

        it("emits an error if the attribute value does not contain the id indicator '@@'.", function() {
            parse("<div i18n='Simple Case id'>Simple case</div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The attribute i18n on element <div i18n='Simple Case id'>Simple case</div> attribute is missing the custom id indicator '@@'."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if the attribute value contains an empty id", function() {
            parse("<div i18n='@@'>Simple case</div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The attribute i18n on element <div i18n='@@'>Simple case</div> defines an empty ID."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if no default translation is provided", function() {
            parse("<div i18n='@@Simple Case id'></div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element <div i18n='@@Simple Case id'>...</div> with attribute  i18n is empty and is therefore missing the default translation."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if the content of the element is an expression", function() {
            parse("<div i18n='@@Simple Case id'>{{someValue}}</div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element '<div i18n='@@Simple Case id'>{{someValue}}</div>'  in 'test.html' uses an angular expression as translation id ('Simple Case id') or as default text ('{{someValue}}'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });
        it("emits an error if the value of the translate id is an expression", function() {
            parse("<div i18n='@@{{id}}'>{{someValue}}</div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element '<div i18n='@@{{id}}'>{{someValue}}</div>'  in 'test.html' uses an angular expression as translation id ('{{id}}') or as default text ('{{someValue}}'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("suppresses the error if the translation element is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
            parse("<div suppress-dynamic-translation-error> i18n='@@Simple Case id'>{{someValue}}</div>");

            assert.isNotOk(loaderContext.emitError.called);
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("suppresses the error if the default text is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
            parse("<div i18n='@@{{id}}' suppress-dynamic-translation-error>{{someValue}}</div>");

            assert.isNotOk(loaderContext.emitError.called);
            assert.isNotOk(loaderContext.registerTranslation.called);
        });
    });

    describe("<any i18n-*>", function() {
        it("uses the value of an i18n-[attr] without '@@' as translation id and the value of the [attr] as default text", function() {
            parse("<div i18n-title='@@test attribute id' title='test attribute'></div>");

            sinon.assert.calledWith(
                loaderContext.registerTranslation,
                new Translation("test attribute id", "test attribute", {
                    resource: "test.html",
                    loc: { line: 1, column: 0 }
                })
            );
        });

        it("emits an error if the attribute value does not contain the id indicator '@@'.", function() {
            parse("<div i18n-title='test attribute id' title='test attribute'></div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The attribute i18n-title on element <div i18n-title='test attribute id' title='test attribute'>...</div> attribute is missing the custom id indicator '@@'."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if the attribute value contains an empty id", function() {
            parse("<div i18n-title='@@' title='test attribute'></div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The attribute i18n-title on element <div i18n-title='@@' title='test attribute'>...</div> defines an empty ID."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if no corresponding attribute [attr] exist for the i18n-[attr] attribute", function() {
            parse("<div i18n-title='@@test attribute id'></div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element <div i18n-title='@@test attribute id'>...</div> with i18n-title is missing a corresponding title attribute."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if the corresponding attribute [attr] is empty", function() {
            parse("<div i18n-title='@@test attribute id' title=''></div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element <div i18n-title='@@test attribute id' title=''>...</div> with i18n-title is missing a value for the corresponding title attribute."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if the default translation is an expression", function() {
            parse("<div  i18n-title='@@myTitle' title='{{myTitle}}'></div>");

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element '<div i18n-title='@@myTitle' title='{{myTitle}}'>...</div>'  in 'test.html' uses an angular expression as translation id ('myTitle') or as default text ('{{myTitle}}'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("emits an error if the i18n-[attr] uses an expression as id", function() {
            parse(
                "<div i18n-title='@@{{id}}' title='My title'></div>"
            );

            sinon.assert.calledWith(
                loaderContext.emitError,
                "Failed to extract the angular-translate translations from test.html:1:0: The element '<div i18n-title='@@{{id}}' title='My title'>...</div>'  in 'test.html' uses an angular expression as translation id ('{{id}}') or as default text ('My title'), this is not supported. To suppress this error at the 'suppress-dynamic-translation-error' attribute to the element or any of its parents."
            );
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("suppresses the error if the i18n-[attr] id is used and the element is attributed with suppress-dynamic-translation-error", function() {
            parse(
                "<div i18n-title='@@{{id}}' title='My title' suppress-dynamic-translation-error></div>"
            );

            assert.isNotOk(loaderContext.emitError.called);
            assert.isNotOk(loaderContext.registerTranslation.called);
        });

        it("suppresses the error if the default text is an expression and the element is attributed with suppress-dynamic-translation-error", function() {
            parse("<div  i18n-title='@@myTitle' title='{{myTitle}}' suppress-dynamic-translation-error></div>");

            assert.isNotOk(loaderContext.emitError.called);
            assert.isNotOk(loaderContext.registerTranslation.called);
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
