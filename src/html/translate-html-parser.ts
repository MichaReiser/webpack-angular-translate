import htmlparser = require("htmlparser2");

import Translation from "../translation";
import ElementContext, {
  RootContext,
  HtmlParseContext
} from "./element-context";
import TranslateLoaderContext from "../translate-loader-context";
import { matchAngularExpressions, AngularExpressionMatch } from "./ng-filters";

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
export default class TranslateHtmlParser implements htmlparser.Handler {
  context: HtmlParseContext;
  parser: htmlparser.Parser;

  constructor(private loader: TranslateLoaderContext) {
    this.ontext = this.ontext.bind(this);
  }

  parse(html: string): void {
    this.context = new RootContext(this.loader, html);
    this.parser = new htmlparser.Parser(this, { decodeEntities: true });
    this.parser.parseComplete(html);

    this.context = this.parser = null;
  }

  onopentag(name: string, attributes: { [type: string]: string }): void {
    const parsedAttributes = Object.keys(attributes).map(attributeName => ({
      name: attributeName,
      value: attributes[attributeName],
      expressions: matchAngularExpressions(attributes[attributeName])
    }));

    this.context = this.context.enter(
      name,
      parsedAttributes,
      getStartIndex(this.parser)
    );

    if (name === "translate") {
      this.context.translateDirective = true;
    } else if (typeof attributes["translate"] !== "undefined") {
      this.context.translateDirective = true;
      this.context.translationId = attributes["translate"];
    }

    this.context.suppressDynamicTranslationErrors =
      typeof attributes[SUPPRESS_ATTRIBUTE_NAME] !== "undefined";

    // <any attr='{{ x | translate }}'></any>
    Object.keys(attributes).forEach(name =>
      this.handleAngularExpression(attributes[name], getStartIndex(this.parser))
    );

    if (!this.context.translateDirective) {
      // should not be translated
      return;
    }

    // translate-attr-*
    const translateAttributes = Object.keys(attributes).filter(key =>
      translateAttributeRegex.test(key)
    );
    this.context.translateAttributes = translateAttributes.length > 0;

    // If an attribute is translated, then the content will not be translated.
    // Extracts the translations where translate-attr-ATTR defines the id and translate-default-ATTR the default text
    translateAttributes.forEach(attributeName => {
      var translationId = attributes[attributeName],
        translatedAttributeName = attributeName.substr(
          "translate-attr-".length
        ),
        defaultText =
          attributes["translate-default-attr-" + translatedAttributeName];

      this.registerTranslation({
        translationId,
        defaultText,
        position: getStartIndex(this.parser)
      });
    });

    this.context.defaultText = attributes["translate-default"];
  }

  private handleAngularExpression(value: string, position: number): void {
    var matches = matchAngularExpressions(value);
    matches.forEach(
      match => this.handleFilterMatch(match, getStartIndex(this.parser)),
      this
    );

    if (matches.length > 0) {
      let translationId = matches[0].value;

      if (/^".*"$/.test(translationId) || /^.*'$/.test(translationId)) {
        translationId = translationId.substring(1, translationId.length - 1);
        this.registerTranslation({ translationId, position });
      }
    }
  }

  ontext(raw: string): void {
    const text = raw.trim();
    this.context.addText({
      startPosition: getStartIndex(this.parser),
      raw,
      text,
      expressions: matchAngularExpressions(text)
    });

    // Content of an element that is translatedya
    if (this.context.translateDirective) {
      // The translation will be registered with the close tag.
      this.context.translationId = this.context.translationId || text;
    } else {
      // only attributes are translated or no translation at all
      var expressionMatches = matchAngularExpressions(text);
      expressionMatches.forEach(
        match => this.handleFilterMatch(match, getStartIndex(this.parser)),
        this
      );
    }
  }

  private handleFilterMatch(
    match: AngularExpressionMatch,
    position: number
  ): void {
    var translationId = match.value;

    if (!(/^".*"$/.test(translationId) || /^.*'$/.test(translationId))) {
      this.context.emitSuppressableError(
        `A dynamic filter expression is used in the text or an attribute of the element '${this.context.asHtml()}'. Add the '${SUPPRESS_ATTRIBUTE_NAME}' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).`,
        position
      );
    } else if (match.previousFilters) {
      this.context.emitSuppressableError(
        `Another filter is used before the translate filter in the element ${this.context.asHtml()}. Add the '${SUPPRESS_ATTRIBUTE_NAME}' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).`,
        position
      );
    } else {
      translationId = translationId.substring(1, translationId.length - 1);
      this.registerTranslation({ translationId, position });
    }
  }

  onclosetag(name: string): void {
    if (this.context.tagName !== name) {
      this.context.emitSuppressableError(
        "Error parsing html, close tag does not match open tag",
        this.context.elementStartPosition
      );
    }

    // <any translate='test'></any>
    if (this.context.translateDirective) {
      if (this.context.translationId) {
        this.registerTranslation({
          translationId: this.context.translationId,
          defaultText: this.context.defaultText,
          position: this.context.elementStartPosition
        });
      } else if (!this.context.translateAttributes) {
        // no translate-attr-* and the element has not specified a translation id, someone is using the directive incorrectly
        this.context.emitSuppressableError(
          "the element uses the translate directive but does not specify a translation id nor has any translated attributes (translate-attr-*). Specify a translation id or remove the translate-directive.",
          this.context.elementStartPosition
        );
      }
    }

    this.context = this.context.leave();
  }

  onerror(error: Error): void {
    this.context.emitError(
      `Failed to parse the html, error is ${error.message}`,
      getStartIndex(this.parser)
    );
  }

  private registerTranslation(translation: {
    translationId: string;
    defaultText?: string;
    position: number;
  }) {
    if (
      isAngularExpression(translation.translationId) ||
      isAngularExpression(translation.defaultText)
    ) {
      this.context.emitSuppressableError(
        `The element '${this.context.asHtml()}'  in '${
          this.loader.resource
        }' uses an angular expression as translation id ('${
          translation.translationId
        }') or as default text ('${
          translation.defaultText
        }'), this is not supported. To suppress this error at the '${SUPPRESS_ATTRIBUTE_NAME}' attribute to the element or any of its parents.`,
        translation.position
      );
      return;
    }

    this.loader.registerTranslation(
      new Translation(translation.translationId, translation.defaultText, {
        resource: this.loader.resource,
        loc: this.context.loc(translation.position)
      })
    );
  }
}

function getStartIndex(parser: htmlparser.Parser): number {
  return (parser as any).startIndex;
}
