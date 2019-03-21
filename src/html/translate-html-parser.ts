import * as htmlparser from "htmlparser2";

import Translation from "../translation";
import ElementContext, {
  DocumentContext,
  HtmlParseContext
} from "./element-context";
import {
  HtmlTranslationExtractor,
  HtmlTranslationExtractionContext,
  TranslationOccurrence
} from "./html-translation-extractor";
import TranslateLoaderContext from "../translate-loader-context";
import { matchAngularExpressions } from "./ng-filters";
import { AngularElement } from "./html-translation-extractor";

export const SUPPRESS_ATTRIBUTE_NAME = "suppress-dynamic-translation-error";
const angularExpressionRegex = /^{{.*}}$/;

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

  constructor(
    private loader: TranslateLoaderContext,
    private translationExtractors: HtmlTranslationExtractor[]
  ) {
    this.ontext = this.ontext.bind(this);
  }

  parse(html: string): void {
    this.context = new DocumentContext(this.loader, html);
    this.parser = new htmlparser.Parser(this, { decodeEntities: true });
    this.parser.parseComplete(html);

    this.context = this.parser = null;
  }

  onopentag(name: string, attributes: { [type: string]: string }): void {
    const parsedAttributes = Object.keys(attributes).map(attributeName => ({
      name: attributeName,
      value: attributes[attributeName],
      expressions: matchAngularExpressions(attributes[attributeName]),
      startPosition: getStartIndex(this.parser)
    }));

    this.context = this.context.enter(
      name,
      parsedAttributes,
      getStartIndex(this.parser)
    );

    this.context.suppressDynamicTranslationErrors =
      typeof attributes[SUPPRESS_ATTRIBUTE_NAME] !== "undefined";
  }

  ontext(raw: string): void {
    const text = raw.trim();
    this.context.addText({
      startPosition: getStartIndex(this.parser),
      raw,
      text,
      expressions: matchAngularExpressions(text)
    });
  }

  onclosetag(name: string): void {
    if (!(this.context instanceof ElementContext)) {
      throw new Error("onopentag did not create an element context");
    }

    if (this.context.tagName !== name) {
      this.context.emitSuppressableError(
        "Error parsing html, close tag does not match open tag",
        this.context.elementStartPosition
      );
    } else {
      const element: AngularElement = {
        tagName: this.context.tagName,
        attributes: this.context.attributes,
        texts: this.context.texts,
        startPosition: this.context.elementStartPosition
      };

      const extractorContext = this.createExtractorContext();

      for (const extractor of this.translationExtractors) {
        extractor(element, extractorContext);
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

  private createExtractorContext(): HtmlTranslationExtractionContext {
    return {
      registerTranslation: this.registerTranslation.bind(this),
      emitError: this.context.emitError.bind(this.context),
      emitSuppressableError: this.context.emitSuppressableError.bind(
        this.context
      ),
      asHtml: this.context.asHtml.bind(this.context)
    };
  }

  private registerTranslation(translation: TranslationOccurrence) {
    if (
      isAngularExpression(translation.translationId) ||
      isAngularExpression(translation.defaultText)
    ) {
      this.context.emitSuppressableError(
        `The element '${this.context.asHtml()}' uses an angular expression as translation id ('${
          translation.translationId
        }') or as default text ('${
          translation.defaultText
        }'). This is not supported. Either use a string literal as translation id and default text or suppress this error by adding the '${SUPPRESS_ATTRIBUTE_NAME}' attribute to this element or any of its parents.`,
        translation.position
      );
      return;
    }

    this.loader.registerTranslation(
      new Translation(translation.translationId, translation.defaultText, {
        resource: this.loader.resourcePath,
        loc: this.context.loc(translation.position)
      })
    );
  }
}

function getStartIndex(parser: htmlparser.Parser): number {
  return (parser as any).startIndex;
}
