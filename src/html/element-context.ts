import { AngularExpressionMatch } from "./ng-filters";
import TranslateLoaderContext from "../translate-loader-context";

export interface Attribute {
  name: string;
  value: string;
  expressions: AngularExpressionMatch[];
}

export interface Text {
  startPosition: number;
  text: string;
  raw: string;
  expressions: AngularExpressionMatch[];
}

export abstract class HtmlParseContext {
  /**
   * The html attributes of the current element
   */
  readonly attributes: Attribute[];

  /**
   * The position in the html file where the element has started.
   */
  readonly elementStartPosition: number;
  readonly tagName: string;

  /**
   * The text contents of the element
   */
  readonly texts: Text[] = [];

  public suppressDynamicTranslationErrors: boolean;

  /**
   * Is the translate directive applied to the current element (translate element or element with translate attribute)
   */
  translateDirective = false;

  /**
   * Does the element has translate-attr-* attributes?
   */
  translateAttributes = true;

  /**
   * The translation id
   */
  translationId: string;

  /**
   * The default text of the translation
   */
  defaultText: string;

  constructor(tagName: string, attributes: Attribute[], startPosition: number) {
    this.attributes = attributes || [];
    this.tagName = tagName;
    this.elementStartPosition = startPosition;
  }

  enter(
    elementName: string,
    attributes: Attribute[],
    startPosition: number
  ): HtmlParseContext {
    return new ElementContext(this, elementName, attributes, startPosition);
  }

  abstract leave(): HtmlParseContext;

  addText(text: Text): void {
    this.texts.push(text);
  }

  abstract emitError(message: string, position: number): void;

  emitSuppressableError(message: string, position: number): void {
    if (this.suppressDynamicTranslationErrors) {
      return;
    }

    this.emitError(message, position);
  }

  asHtml(): string {
    let result = `<${this.tagName}`;

    result = this.attributes.reduce(
      (memo, { name, value }) => memo + " " + name + "='" + value + "'",
      result
    );
    const text =
      this.texts.length === 0
        ? "..."
        : this.texts.reduce((memo, text) => memo + text.raw, "");
    return `${result}>${text}</${this.tagName}>`;
  }

  abstract loc(position: number): { line: number; column: number };
}

export class RootContext extends HtmlParseContext {
  constructor(
    private readonly loader: TranslateLoaderContext,
    private readonly html: string
  ) {
    super("root", [], 1);
    this.suppressDynamicTranslationErrors = false;
  }

  leave(): never {
    throw new Error(`Cannot leave the root context.`);
  }

  emitError(message: string, position: number) {
    const loc = this.loc(position);
    message = `Failed to extract the angular-translate translations from ${
      this.loader.resource
    }:${loc.line}:${loc.column}: ${message}`;

    this.loader.emitError(message);
  }

  loc(position: number): { line: number; column: number } {
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

    return { line, column };
  }
}

/**
 * Context for an html element.
 *
 * The context stores the state about the current (html) element and is used by the parser.
 * The parser calls `enter` for each new element. This will create a child context of the current context.
 * The child context inherits some attributes, like if translation-errors should be suppressed.
 */
export default class ElementContext extends HtmlParseContext {
  private _suppressDynamicTranslationErrorMessage = false;

  constructor(
    public readonly parent: HtmlParseContext,
    tagName: string,
    attributes: Attribute[],
    startPosition: number
  ) {
    super(tagName, attributes, startPosition);
  }

  get suppressDynamicTranslationErrors(): boolean {
    return (
      this._suppressDynamicTranslationErrorMessage ||
      (this.parent && this.parent.suppressDynamicTranslationErrors)
    );
  }

  set suppressDynamicTranslationErrors(suppress: boolean) {
    this._suppressDynamicTranslationErrorMessage = suppress;
  }

  emitError(message: string, position: number): void {
    return this.parent.emitError(message, position);
  }

  leave(): HtmlParseContext {
    return this.parent;
  }

  loc(position: number) {
    return this.parent.loc(position);
  }
}
