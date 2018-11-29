import { AngularExpressionMatch } from "./ng-filters";

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

/**
 * Context for an html element.
 *
 * The context stores the state about the current (html) element and is used by the parser.
 * The parser calls `enter` for each new element. This will create a child context of the current context.
 * The child context inherits some attributes, like if translation-errors should be suppressed.
 */
export default class ElementContext {
  /**
   * The html attributes of the current element
   */
  readonly attributes: Attribute[];

  /**
   * Is the translate directive applied to the current element (translate element or element with translate attribute)
   */
  translateDirective = false;

  /**
   * Does the element has translate-attr-* attributes?
   */
  translateAttributes = true;

  /**
   * The position in the html file where the element has started.
   */
  readonly elementStartPosition: number;

  /**
   * The translation id
   */
  translationId: string;

  /**
   * The default text of the translation
   */
  defaultText: string;

  /**
   * The text contents of the element
   */
  readonly texts: Text[] = [];

  private _suppressDynamicTranslationErrorMessage = false;

  constructor(
    public readonly parent: ElementContext,
    public readonly elementName: string,
    attributes: Attribute[],
    startPosition: number
  ) {
    this.attributes = attributes || [];
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

  addText(text: Text) {
    this.texts.push(text);
  }

  enter(
    elementName: string,
    attributes: Attribute[],
    startPosition: number
  ): ElementContext {
    return new ElementContext(this, elementName, attributes, startPosition);
  }

  leave(): ElementContext {
    return this.parent;
  }

  asHtml(): string {
    let result = `<${this.elementName}`;

    result = this.attributes.reduce(
      (memo, { name, value }) => memo + " " + name + "='" + value + "'",
      result
    );
    const text =
      this.texts.length === 0
        ? "..."
        : this.texts.reduce((memo, text) => memo + text.raw, "");
    return `${result}>${text}</${this.elementName}>`;
  }
}
