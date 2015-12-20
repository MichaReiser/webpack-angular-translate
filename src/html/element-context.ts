
export interface Attributes {
    [type: string]: string;
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
    attributes: Attributes;

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
    elementStartPosition: number;

    /**
     * The translation id
     */
    translationId: string;

    /**
     * The default text of the translation
     */
    defaultText: string;

    /**
     * The content text of the element
     */
    text: string;

    private _suppressDynamicTranslationErrorMessage = false;

    constructor(public parent: ElementContext, public elementName: string, attributes: Attributes) {
        this.attributes = attributes || {};
    }

    get suppressDynamicTranslationErrors(): boolean {
        return this._suppressDynamicTranslationErrorMessage || (this.parent && this.parent.suppressDynamicTranslationErrors);
    }

    set suppressDynamicTranslationErrors(suppress: boolean) {
        this._suppressDynamicTranslationErrorMessage = suppress;
    }

    enter(elementName: string, attributes: Attributes): ElementContext {
        return new ElementContext(this, elementName, attributes);
    }

    leave(): ElementContext {
        return this.parent;
    }

    asHtml(): string {
        let result = `<${this.elementName}`;

        result = Object.keys(this.attributes).reduce((memo, attributeName) =>  memo + " " + attributeName + "='" + this.attributes[attributeName] + "'", result);
        const text = this.text ? this.text : "...";
        return `${result}>${text}</${this.elementName}>`;
    }
}
