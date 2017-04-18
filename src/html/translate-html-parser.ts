import htmlparser = require("htmlparser2");

import Translation from "../translation";
import ElementContext, {Attributes} from "./element-context";
import TranslateLoaderContext from "../translate-loader-context";
import {matchAngularExpressions, AngularExpressionMatch} from "./ng-filters";

export const SUPPRESS_ATTRIBUTE_NAME = "suppress-dynamic-translation-error";
const angularExpressionRegex = /^{{.*}}$/;
const translateAttributeRegex = /^translate-attr-.*$/;

function isAngularExpression(value: string): boolean {
    return angularExpressionRegex.test(value);
}

/**
 * Visitor that implements the logic for extracting the translations.
 * Elements with a translate directive where the content should be translated are registered in the closetag event.
 * Translated attributes are registered in the opentag event
 * Attributes translated with the translate filter are handled in the opentag event
 * Expressions used in the body of an element are translated in the text event.
 */
export  default class TranslateHtmlParser implements htmlparser.Handler {
    context = new ElementContext(null, "root", null);
    parser: htmlparser.Parser;
    html: string;

    constructor(private loader: TranslateLoaderContext) {
        this.ontext = this.ontext.bind(this);
    }

    parse(html: string): void {
        this.html = html;
        this.parser = new htmlparser.Parser(this, { decodeEntities: true });
        this.parser.parseComplete(html);

        this.html = this.parser = null;
    }

    onopentag(name: string, attributes: Attributes): void {
        this.context = this.context.enter(name, attributes);

        if (name === "translate") {
            this.context.translateDirective = true;
        } else if (typeof(attributes["translate"]) !== "undefined") {
            this.context.translateDirective = true;
            this.context.translationId = attributes["translate"];
        }

        this.context.suppressDynamicTranslationErrors = typeof(attributes[SUPPRESS_ATTRIBUTE_NAME]) !== "undefined";

        // <any attr='{{ x | translate }}'></any>
        Object.keys(attributes).forEach(name => this.handleAngularExpression(attributes[name]));

        if (!this.context.translateDirective) {
            // should not be translated
            return;
        }

        this.context.elementStartPosition = this.parser.startIndex;

        // translate-attr-*
        const translateAttributes = Object.keys(attributes).filter(key => translateAttributeRegex.test(key));
        this.context.translateAttributes = translateAttributes.length > 0;

        // If an attribute is translated, then the content will not be translated.
        // Extracts the translations where translate-attr-ATTR defines the id and translate-default-ATTR the default text
        translateAttributes.forEach(attributeName => {
            var translationId = attributes[attributeName],
                translatedAttributeName = attributeName.substr("translate-attr-".length),
                defaultText = attributes["translate-default-attr-" + translatedAttributeName];

            this.registerTranslation(translationId, attributes["translate-default"] || defaultText);
        });

        this.context.defaultText = attributes["translate-default"];
    }

    private handleAngularExpression(value: string): void {
        var matches = matchAngularExpressions(value);
        matches.forEach(this.handleFilterMatch, this);

        if (matches.length > 0) {
            let translationId = matches[0].value;

            if (/^".*"$/.test(translationId) || /^.*'$/.test(translationId)) {
                translationId = translationId.substring(1, translationId.length - 1);
                this.registerTranslation(translationId);
            }
        }
    }

    ontext(text: string): void {
        this.context.text = text = text.trim();

        // Content of an element that is translated
        if (this.context.translateDirective) {
            // The translation will be registered with the close tag.
            this.context.translationId = this.context.translationId || text;
        } else {
            // only attributes are translated or no translation at all
            var expressionMatches = matchAngularExpressions(text);
            expressionMatches.forEach(this.handleFilterMatch, this);
        }
    }

    private handleFilterMatch(match: AngularExpressionMatch): void {
        var translationId = match.value;

        if (!(/^".*"$/.test(translationId) || /^.*'$/.test(translationId))) {
            this.emitSuppressableError(`A dynamic filter expression is used in the text or an attribute of the element '${this.context.asHtml()}'. Add the '${SUPPRESS_ATTRIBUTE_NAME}' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).`);
        } else if (match.previousFilters) {
            this.emitSuppressableError(`Another filter is used before the translate filter in the element ${this.context.asHtml()}. Add the '${SUPPRESS_ATTRIBUTE_NAME}' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).`);
        } else {
            translationId = translationId.substring(1, translationId.length - 1);
            this.registerTranslation(translationId);
        }
    }

    onclosetag(name: string): void {
        if (this.context.elementName !== name) {
            this.emitSuppressableError("Error parsing html, close tag does not match open tag");
        }

        // <any translate='test'></any>
        if (this.context.translateDirective) {
            if (this.context.translationId) {
                this.registerTranslation(this.context.translationId, this.context.defaultText, this.context.elementStartPosition);
            } else if (!this.context.translateAttributes) {
                // no translate-attr-* and the element has not specified a translation id, someone is using the directive incorrectly
                this.emitSuppressableError("the element uses the translate directive but does not specify a translation id nor has any translated attributes (translate-attr-*). Specify a translation id or remove the translate-directive.");
            }
        }

        this.context = this.context.leave();
    }

    onerror(error: Error): void {
        this.emitError(`Failed to parse the html, error is ${error.message}`, this.loc());
    }

    private emitSuppressableError(message: string, loc: { line: number, column: number } = this.loc()): void {
        if (this.context.suppressDynamicTranslationErrors) {
            return;
        }

        this.emitError(message, loc);
    }

    private emitError(message: string, loc: { line: number, column: number }): void {
        message = `Failed to extract the angular-translate translations from ${this.loader.resource}:${loc.line}:${loc.column}: ${message}`;

        this.loader.emitError(message);
    }

    private registerTranslation(translationId: string, defaultText?: string, position?: number): void {
        const loc = this.loc(position);
        if (isAngularExpression(translationId) || isAngularExpression(defaultText)) {
            this.emitSuppressableError(`The element '${this.context.asHtml()}'  in '${this.loader.resource}' uses an angular expression as translation id ('${translationId}') or as default text ('${defaultText}'), this is not supported. To suppress this error at the '${SUPPRESS_ATTRIBUTE_NAME}' attribute to the element or any of its parents.`, loc);
            return;
        }

        this.loader.registerTranslation(new Translation(translationId, defaultText, {
            resource: this.loader.resource,
            loc: loc
        }));
    }

    private loc(position: number = this.parser.startIndex): { line: number, column: number } {
        let line = 1;
        let column = 0;
        for (let i = 0; i < position; ++i) {
            if (this.html[i] === "\n") {
                ++line;
                column = 0;
            } else {
                ++column;
            }
        }

        return { line: line, column: column };
    }
}
