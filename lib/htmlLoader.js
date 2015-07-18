var htmlparser = require('htmlparser2'),
    Translation = require('./Translation'),
    ngFilters = require('./ngFilters.js'),
    cheerio = require('cheerio');

var angularExpressionRegex = /^{{.*}}$/;
var translateAttributeRegex = /^translate-attr-.*$/;

function ElementScope(previous, elementName, attributes) {
    this.previous = previous;
    this.translateDirective = false;
    this.translateContent = true;
    this.elementName = elementName;
    this.attributes = attributes;
}

Object.defineProperty(ElementScope.prototype, 'suppressDynamicTranslationErrors', {
    get: function () {
        return this._suppressDynamicTranslationErrorMessage || (this.previous && this.previous.suppressDynamicTranslationErrors);
    },

    set: function (value) {
        this._suppressDynamicTranslationErrorMessage = value;
    },

    enumerable: true,
    configurable: true
});

ElementScope.prototype.childElementScope = function (elementName, attributes) {
    return new ElementScope(this, elementName, attributes);
};

ElementScope.prototype.exitElement = function () {
    return this.previous;
};

ElementScope.prototype.elementAsHtml = function () {
    var result = "<" + this.elementName,
        scope = this;

    result = Object.keys(this.attributes).reduce(function (memo, attributeName) {
        return memo + " " + attributeName + "='" + scope.attributes[attributeName] + "'";
    }, result);

    return result + ">" + ( this.text ? this.text : "..." ) + "</" + this.elementName + ">";
};

function StatefulParser(loader) {
    this.loader = loader;
    this.scope = new ElementScope();
}

StatefulParser.prototype.onopentag = function (name, attributes) {
    this.scope = this.scope.childElementScope(name, attributes);

    if (name === 'translate') {
        this.scope.translateDirective = true;
    } else if (typeof(attributes.translate) !== 'undefined') {
        this.scope.translateDirective = true;
        this.scope.translateId = attributes.translate;
    }

    this.scope.suppressDynamicTranslationErrors = typeof(attributes["suppress-dynamic-translation-error"]) !== "undefined";

    var translateAttributes = Object.keys(attributes).filter(function (key) {
        return translateAttributeRegex.test(key);
    });

    // If an attribute is translated, then the content will not be translated.
    // Extracts the translations where translate-attr-ATTR defines the id and translate-default-ATTR the default text
    this.scope.translateContent = translateAttributes.length === 0;
    translateAttributes.forEach(function (attributeName) {
        var translationId = attributes[attributeName],
            translatedAttributeName = attributeName.substr("translate-attr-".length),
            defaultText = attributes["translate-default-attr-" + translatedAttributeName];

            this.registerTranslation(translationId, defaultText);
    }, this);

    Object.keys(attributes).forEach(function (name) {
        this.handleAngularExpression(name, attributes[name]);
    }, this);

    if (this.scope.translateDirective) {
        this.scope.defaultText = attributes["translate-default"];
    }
};

// When using on attribute, then the element name didn't match fur custom elements???
StatefulParser.prototype.handleAngularExpression = function (name, value) {
    var matches = ngFilters.matchAngularExpressions(value);
    matches.forEach(this.handleFilterMatch, this);

    if (matches.length > 0) {
        var translationId = matches[0].value;

        if (/^".*"$/.test(translationId) || /^.*'$/.test(translationId)) {
            translationId = translationId.substring(1, translationId.length - 1);
            this.registerTranslation(translationId);
        }
    }
};

StatefulParser.prototype.ontext = function (text) {
    this.scope.text = text = text.trim();
    if (this.scope.translateDirective && this.scope.translateContent) {
        var translationId = this.scope.translateId || text;

        this.registerTranslation(translationId, this.scope.defaultText);
    } else {
        var expressionMatches = ngFilters.matchAngularExpressions(text);
        expressionMatches.forEach(this.handleFilterMatch, this);
    }
};

StatefulParser.prototype.handleFilterMatch = function (match) {
    var translationId = match.value;

    if (!(/^".*"$/.test(translationId) || /^.*'$/.test(translationId))) {
        this.emitError("A dynamic filter expression is used in the file " + this.loader.resourcePath +
            " in the text or an attribute of the element " + this.scope.elementAsHtml() + "." +
            " Attribute the element with suppress-dynamic-translation-error if you have registered the translation manual.");
    } else if (match.previousFilters) {
        this.emitError("Another filter is used before the translate filter in the element " + this.scope.elementAsHtml() + " (" +
            this.loader.resourcePath + "). Attribute the element with suppress-dynamic-translation-error if you have registered the translation manual.")
    } else {
        translationId = translationId.substring(1, translationId.length - 1);
        this.registerTranslation(translationId);
    }
};

StatefulParser.prototype.onclosetag = function (name) {
    if (this.scope.elementName !== name) {
        debugger;
    }

    this.scope = this.scope.exitElement();
};

StatefulParser.prototype.emitError = function (message) {
    if (this.scope.suppressDynamicTranslationErrors) {
        return;
    }

    this.loader.emitError(message);
};

StatefulParser.prototype.registerTranslation = function (translationId, defaultText) {
    if (isAngularExpression(translationId) || isAngularExpression(defaultText)) {
        this.emitError("The element '" + this.scope.elementAsHtml() + " in " + this.loader.resourcePath +
            " uses an angular expression as translation id (" + translationId + ") or as default text (" + defaultText + "), " +
            "this is not supported. To suppress this error attribute the element or any parent attribute with suppress-dynamic-translation-error.");
        return;
    }

    this.loader.registerTranslation(new Translation(translationId, defaultText, this.loader.resourcePath));
};


function isAngularExpression(value) {
    return angularExpressionRegex.test(value);
}

/**
 * Loader that must be used together with the plugin. The loader parses the html content and extracts all
 * translate elements, elements with a translate attribute or translate filter.
 *
 * The loader communicates with the plugin by the registerTranslation functions provided by the plugin (loader.registerTranslation).
 * The plugin is responsible for merging the translations and emitting them.
 *
 * The plugin is required because the loader doesn't know when all files have been processed. The plugin removes
 * all suppress-dynamic-translation-error attributes for non dev builds.
 *
 * The following cases are supported:
 * @example
 * <span translate>TRANSLATE-ID</span>
 * <translate>TRANSLATE-ID</translate>
 *
 * <span translate translate-default="Default Text">TRANSLATE-ID</span>
 * <translate translate-default="Default Text">TRANSLATE-ID</translate>
 *
 * <span translate translate-attr-title="TRANSLATE-ID">Content</span>
 * <translate translate-attr-title="TRANSLATE-ID">Content</translate>
 *
 * <span translate translate-attr-title="TRANSLATE-ID" translate-default-attr-title="Default Text">Content</span>
 *
 * <h1 title="{{ 'My title' | translate }}"></h1>
 * <h2>{{ 'My long translation' | translate | limitTo:20 }}</h2>
 *
 * <span>{{ "4" | translate }} {{ "x" | translate }}</span>
 *
 * @param source the content of the file (expected to be html or xml)
 * @param sourceMaps the source maps
 */
function loader(source, sourceMaps) {
    "use strict";

    var loader = this,
        result = source;
    this.cacheable();

    var statefulParser = new StatefulParser(loader);
    var parser = new htmlparser.Parser(statefulParser, { decodeEntities: true });
    statefulParser.htmlParser = parser;

    parser.write(source);

    if (!loader.options.debug) {
        var $ = cheerio.load(source);
        $('[suppress-dynamic-translation-error]').removeAttr('suppress-dynamic-translation-error');
        result = $.html();
    }

    this.callback(null, result, sourceMaps);
}


module.exports = loader;