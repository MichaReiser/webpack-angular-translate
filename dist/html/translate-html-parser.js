"use strict";
var htmlparser = require("htmlparser2");
var translation_1 = require("../translation");
var element_context_1 = require("./element-context");
var ng_filters_1 = require("./ng-filters");
exports.SUPPRESS_ATTRIBUTE_NAME = "suppress-dynamic-translation-error";
var angularExpressionRegex = /^{{.*}}$/;
var translateAttributeRegex = /^translate-attr-.*$/;
function isAngularExpression(value) {
    return angularExpressionRegex.test(value);
}
/**
 * Visitor that implements the logic for extracting the translations.
 * Elements with a translate directive where the content should be translated are registered in the closetag event.
 * Translated attributes are registered in the opentag event
 * Attributes translated with the translate filter are handled in the opentag event
 * Expressions used in the body of an element are translated in the text event.
 */
var TranslateHtmlParser = (function () {
    function TranslateHtmlParser(loader) {
        this.loader = loader;
        this.context = new element_context_1.default(null, "root", null);
        this.ontext = this.ontext.bind(this);
    }
    TranslateHtmlParser.prototype.parse = function (html) {
        this.html = html;
        this.parser = new htmlparser.Parser(this, { decodeEntities: true });
        this.parser.parseComplete(html);
        this.html = this.parser = null;
    };
    TranslateHtmlParser.prototype.onopentag = function (name, attributes) {
        var _this = this;
        this.context = this.context.enter(name, attributes);
        if (name === "translate") {
            this.context.translateDirective = true;
        }
        else if (typeof (attributes["translate"]) !== "undefined") {
            this.context.translateDirective = true;
            this.context.translationId = attributes["translate"];
        }
        this.context.suppressDynamicTranslationErrors = typeof (attributes[exports.SUPPRESS_ATTRIBUTE_NAME]) !== "undefined";
        // <any attr='{{ x | translate }}'></any>
        Object.keys(attributes).forEach(function (name) { return _this.handleAngularExpression(attributes[name]); });
        if (!this.context.translateDirective) {
            // should not be translated
            return;
        }
        this.context.elementStartPosition = this.parser.startIndex;
        // translate-attr-*
        var translateAttributes = Object.keys(attributes).filter(function (key) { return translateAttributeRegex.test(key); });
        this.context.translateAttributes = translateAttributes.length > 0;
        // If an attribute is translated, then the content will not be translated.
        // Extracts the translations where translate-attr-ATTR defines the id and translate-default-ATTR the default text
        translateAttributes.forEach(function (attributeName) {
            var translationId = attributes[attributeName], translatedAttributeName = attributeName.substr("translate-attr-".length), defaultText = attributes["translate-default-attr-" + translatedAttributeName];
            _this.registerTranslation(translationId, defaultText);
        });
        this.context.defaultText = attributes["translate-default"];
    };
    TranslateHtmlParser.prototype.handleAngularExpression = function (value) {
        var matches = ng_filters_1.matchAngularExpressions(value);
        matches.forEach(this.handleFilterMatch, this);
        if (matches.length > 0) {
            var translationId = matches[0].value;
            if (/^".*"$/.test(translationId) || /^.*'$/.test(translationId)) {
                translationId = translationId.substring(1, translationId.length - 1);
                this.registerTranslation(translationId);
            }
        }
    };
    TranslateHtmlParser.prototype.ontext = function (text) {
        this.context.text = text = text.trim();
        // Content of an element that is translated
        if (this.context.translateDirective) {
            // The translation will be registered with the close tag.
            this.context.translationId = this.context.translationId || text;
        }
        else {
            // only attributes are translated or no translation at all
            var expressionMatches = ng_filters_1.matchAngularExpressions(text);
            expressionMatches.forEach(this.handleFilterMatch, this);
        }
    };
    TranslateHtmlParser.prototype.handleFilterMatch = function (match) {
        var translationId = match.value;
        if (!(/^".*"$/.test(translationId) || /^.*'$/.test(translationId))) {
            this.emitSuppressableError("A dynamic filter expression is used in the text or an attribute of the element '" + this.context.asHtml() + "'. Add the '" + exports.SUPPRESS_ATTRIBUTE_NAME + "' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).");
        }
        else if (match.previousFilters) {
            this.emitSuppressableError("Another filter is used before the translate filter in the element " + this.context.asHtml() + ". Add the '" + exports.SUPPRESS_ATTRIBUTE_NAME + "' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).");
        }
        else {
            translationId = translationId.substring(1, translationId.length - 1);
            this.registerTranslation(translationId);
        }
    };
    TranslateHtmlParser.prototype.onclosetag = function (name) {
        if (this.context.elementName !== name) {
            this.emitSuppressableError("Error parsing html, close tag does not match open tag");
        }
        // <any translate='test'></any>
        if (this.context.translateDirective) {
            if (this.context.translationId) {
                this.registerTranslation(this.context.translationId, this.context.defaultText, this.context.elementStartPosition);
            }
            else if (!this.context.translateAttributes) {
                // no translate-attr-* and the element has not specified a translation id, someone is using the directive incorrectly
                this.emitSuppressableError("the element uses the translate directive but does not specify a translation id nor has any translated attributes (translate-attr-*). Specify a translation id or remove the translate-directive.");
            }
        }
        this.context = this.context.leave();
    };
    TranslateHtmlParser.prototype.onerror = function (error) {
        this.emitError("Failed to parse the html, error is " + error.message, this.loc());
    };
    TranslateHtmlParser.prototype.emitSuppressableError = function (message, loc) {
        if (loc === void 0) { loc = this.loc(); }
        if (this.context.suppressDynamicTranslationErrors) {
            return;
        }
        this.emitError(message, loc);
    };
    TranslateHtmlParser.prototype.emitError = function (message, loc) {
        message = "Failed to extract the angular-translate translations from " + this.loader.resource + ":" + loc.line + ":" + loc.column + ": " + message;
        this.loader.emitError(message);
    };
    TranslateHtmlParser.prototype.registerTranslation = function (translationId, defaultText, position) {
        var loc = this.loc(position);
        if (isAngularExpression(translationId) || isAngularExpression(defaultText)) {
            this.emitSuppressableError("The element '" + this.context.asHtml() + "'  in '" + this.loader.resource + "' uses an angular expression as translation id ('" + translationId + "') or as default text ('" + defaultText + "'), this is not supported. To suppress this error at the '" + exports.SUPPRESS_ATTRIBUTE_NAME + "' attribute to the element or any of its parents.", loc);
            return;
        }
        this.loader.registerTranslation(new translation_1.default(translationId, defaultText, {
            resource: this.loader.resource,
            loc: loc
        }));
    };
    TranslateHtmlParser.prototype.loc = function (position) {
        if (position === void 0) { position = this.parser.startIndex; }
        var line = 1;
        var column = 0;
        for (var i = 0; i < position; ++i) {
            if (this.html[i] === "\n") {
                ++line;
                column = 0;
            }
            else {
                ++column;
            }
        }
        return { line: line, column: column };
    };
    return TranslateHtmlParser;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TranslateHtmlParser;
//# sourceMappingURL=translate-html-parser.js.map