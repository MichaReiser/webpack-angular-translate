import {
  HtmlTranslationExtractionContext,
  AngularElement
} from "./html-translation-extractor";
import { AngularExpressionMatch } from "./ng-filters";
import { Attribute } from "./element-context";
import { SUPPRESS_ATTRIBUTE_NAME } from "./translate-html-parser";

const translateAttributeRegex = /^translate-attr-.*$/;

export default function translateDirectiveTranslationExtractor(
  element: AngularElement,
  context: HtmlTranslationExtractionContext
) {
  let translateDirective: boolean;
  let translationId: string;
  const translateAttribute = element.attributes.find(
    attribute => attribute.name === "translate"
  );

  if (element.tagName === "translate") {
    translateDirective = true;
  }

  if (translateAttribute) {
    translateDirective = true;
    translationId = translateAttribute.value;
  }

  for (const attribute of element.attributes) {
    handleAttributesWithTranslateExpressions(attribute, context);
  }

  if (translateDirective) {
    const hasTranslateAttributes = handleTranslateAttributes(element, context);

    const defaultTextAttribute = element.attributes.find(
      attr => attr.name === "translate-default"
    );

    if (!translationId) {
      if (element.texts.length === 1) {
        translationId = element.texts[0].text;
      } else if (element.texts.length > 1) {
        context.emitError(
          "The element does not specify a translation id but has multiple child text elements. Specify the translation id on the element to define the translation id.",
          element.startPosition
        );
        return;
      }
    }

    // <any translate='test'></any>
    if (translationId) {
      context.registerTranslation({
        translationId,
        defaultText: defaultTextAttribute
          ? defaultTextAttribute.value
          : undefined,
        position: element.startPosition
      });
    } else if (!hasTranslateAttributes) {
      // no translate-attr-* and the element has not specified a translation id, someone is using the directive incorrectly
      context.emitSuppressableError(
        "the element uses the translate directive but does not specify a translation id nor has any translated attributes (translate-attr-*). Specify a translation id or remove the translate-directive.",
        element.startPosition
      );
    }
  } else {
    handleTexts(element, context);
  }
}

type KeyedAttributes = { [name: string]: Attribute };

function handleTranslateAttributes(
  element: AngularElement,
  context: HtmlTranslationExtractionContext
) {
  const keyedAttributes = element.attributes.reduce(
    (obj, attribute) => {
      obj[attribute.name] = attribute;
      return obj;
    },
    {} as KeyedAttributes
  );

  // translate-attr-ATTR
  const translateAttributes = element.attributes.filter(attr =>
    translateAttributeRegex.test(attr.name)
  );

  for (const attribute of translateAttributes) {
    const attributeName = attribute.name.substr("translate-attr-".length);
    const defaultTextAttribute =
      keyedAttributes[`translate-default-attr-${attributeName}`];

    context.registerTranslation({
      translationId: attribute.value,
      defaultText: defaultTextAttribute
        ? defaultTextAttribute.value
        : undefined,
      position: attribute.startPosition
    });
  }

  return translateAttributes.length > 0;
}

// <any attr='{{ x | translate }}'></any>
function handleAttributesWithTranslateExpressions(
  attribute: Attribute,
  context: HtmlTranslationExtractionContext
) {
  for (const expression of attribute.expressions) {
    handleAngularExpression(expression, context, attribute.startPosition);
  }
}

function handleAngularExpression(
  expression: AngularExpressionMatch,
  context: HtmlTranslationExtractionContext,
  position: number
) {
  let translationId = expression.value;
  // e.g { translate | var} instead of a string constant
  if (!(/^".*"$/.test(translationId) || /^'.*'$/.test(translationId))) {
    context.emitSuppressableError(
      `A dynamic filter expression is used in the text or an attribute of the element '${context.asHtml()}'. Add the '${SUPPRESS_ATTRIBUTE_NAME}' attribute to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).`,
      position
    );
  } else if (expression.previousFilters) {
    context.emitSuppressableError(
      `Another filter is used before the translate filter in the element ${context.asHtml()}. Add the '${SUPPRESS_ATTRIBUTE_NAME}' to suppress the error (ensure that you have registered the translation manually, consider using i18n.registerTranslation).`,
      position
    );
  } else {
    // trim the quotes
    translationId = translationId.substring(1, translationId.length - 1);
    context.registerTranslation({
      translationId,
      position
    });
  }
}

function handleTexts(
  element: AngularElement,
  context: HtmlTranslationExtractionContext
) {
  for (const text of element.texts) {
    for (const expression of text.expressions) {
      handleAngularExpression(expression, context, text.startPosition);
    }
  }
}
