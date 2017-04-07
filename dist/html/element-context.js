"use strict";
/**
 * Context for an html element.
 *
 * The context stores the state about the current (html) element and is used by the parser.
 * The parser calls `enter` for each new element. This will create a child context of the current context.
 * The child context inherits some attributes, like if translation-errors should be suppressed.
 */
var ElementContext = (function () {
    function ElementContext(parent, elementName, attributes) {
        this.parent = parent;
        this.elementName = elementName;
        /**
         * Is the translate directive applied to the current element (translate element or element with translate attribute)
         */
        this.translateDirective = false;
        /**
         * Does the element has translate-attr-* attributes?
         */
        this.translateAttributes = true;
        this._suppressDynamicTranslationErrorMessage = false;
        this.attributes = attributes || {};
    }
    Object.defineProperty(ElementContext.prototype, "suppressDynamicTranslationErrors", {
        get: function () {
            return this._suppressDynamicTranslationErrorMessage || (this.parent && this.parent.suppressDynamicTranslationErrors);
        },
        set: function (suppress) {
            this._suppressDynamicTranslationErrorMessage = suppress;
        },
        enumerable: true,
        configurable: true
    });
    ElementContext.prototype.enter = function (elementName, attributes) {
        return new ElementContext(this, elementName, attributes);
    };
    ElementContext.prototype.leave = function () {
        return this.parent;
    };
    ElementContext.prototype.asHtml = function () {
        var _this = this;
        var result = "<" + this.elementName;
        result = Object.keys(this.attributes).reduce(function (memo, attributeName) { return memo + " " + attributeName + "='" + _this.attributes[attributeName] + "'"; }, result);
        var text = this.text ? this.text : "...";
        return result + ">" + text + "</" + this.elementName + ">";
    };
    return ElementContext;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ElementContext;
//# sourceMappingURL=element-context.js.map