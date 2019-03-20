import * as path from "path";
import { AngularExpressionMatch } from "./ng-filters";
import TranslateLoaderContext from "../translate-loader-context";

export interface Attribute {
  name: string;
  value: string;
  expressions: AngularExpressionMatch[];
  startPosition: number;
}

export interface Text {
  startPosition: number;
  text: string;
  raw: string;
  expressions: AngularExpressionMatch[];
}

export abstract class HtmlParseContext {
  /**
   * The text contents of the element
   */
  readonly texts: Text[] = [];

  public suppressDynamicTranslationErrors: boolean;

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

  abstract asHtml(): string;

  abstract loc(position: number): { line: number; column: number };
}

export class DocumentContext extends HtmlParseContext {
  constructor(
    private readonly loader: TranslateLoaderContext,
    private readonly html: string
  ) {
    super();
    this.suppressDynamicTranslationErrors = false;
  }

  leave(): never {
    throw new Error(`Cannot leave the root context.`);
  }

  emitError(message: string, position: number) {
    const loc = this.loc(position);
    const relativePath = path.relative(
      this.loader.context,
      this.loader.resourcePath
    );
    message = `Failed to extract the angular-translate translations from '${relativePath}':${
      loc.line
    }:${loc.column}: ${message}`;

    this.loader.emitError(new Error(message));
  }

  asHtml(): string {
    return this.texts.reduce((memo, text) => memo + text.raw, "");
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
  /**
   * The html attributes of the current element
   */
  readonly attributes: Attribute[];

  /**
   * The position in the html file where the element has started.
   */
  readonly elementStartPosition: number;
  readonly tagName: string;

  private _suppressDynamicTranslationErrorMessage = false;

  constructor(
    public readonly parent: HtmlParseContext,
    tagName: string,
    attributes: Attribute[],
    startPosition: number
  ) {
    super();
    this.attributes = attributes || [];
    this.tagName = tagName;
    this.elementStartPosition = startPosition;
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

  leave(): HtmlParseContext {
    return this.parent;
  }

  loc(position: number) {
    return this.parent.loc(position);
  }
}
