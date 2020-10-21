import {
  AngularElement,
  HtmlTranslationExtractionContext,
} from "./html-translation-extractor";
import { Attribute } from "./element-context";

const I18N_ATTRIBUTE_REGEX = /^i18n-.*$/;
const I18N_ATTRIBUTE_NAME = "i18n";
const ID_INDICATOR = "@@";

/**
 * Angular uses i18n and i18n-[attr] attributes for internationalization.
 * The angularI18nTranslationsExtractor looks for these attributes on elements
 * and extracts the found ids and default translations from the elements.
 *
 * @example
 * <div i18n="@@translationId">some translation</div>
 * results in a translation with id: 'translationId' and default translation: 'some translation'
 *
 * @example
 * <div i18n-title="@@titleId" title="some title"></div>
 * results in a translation with id: 'titleId' and default translation: 'some title'
 *
 * @param element the element to check for translations
 * @param context the current context
 */
export default function angularI18nTranslationsExtractor(
  element: AngularElement,
  context: HtmlTranslationExtractionContext
): void {
  const i18nElementTranslation = element.attributes.find(
    (attribute) => attribute.name === I18N_ATTRIBUTE_NAME
  );

  if (i18nElementTranslation) {
    handleTranslationsOfElements(element, context, i18nElementTranslation);
  }

  const i18nAttributeTranslations = element.attributes.filter((attribute) =>
    I18N_ATTRIBUTE_REGEX.test(attribute.name)
  );

  handleTranslationsOfAttributes(element, context, i18nAttributeTranslations);
}

function handleTranslationsOfElements(
  element: AngularElement,
  context: HtmlTranslationExtractionContext,
  attribute: Attribute
): void {
  const translationIdExtraction = extractTranslationId(attribute, context);

  if (translationIdExtraction.valid === false) {
    context.emitError(translationIdExtraction.error, attribute.startPosition);
  } else if (element.texts.length === 0) {
    context.emitError(
      `The element ${context.asHtml()} with attribute  ${
        attribute.name
      } is empty and is therefore missing the default translation.`,
      attribute.startPosition
    );
  } else if (element.texts.length === 1) {
    context.registerTranslation({
      translationId: translationIdExtraction.translationId,
      defaultText: element.texts[0].text,
      position: element.startPosition,
    });
  } else if (element.texts.length > 1) {
    context.emitError(
      `The element ${context.asHtml()} has multiple child elements and, therefore, the default translation cannot be extracted.`,
      attribute.startPosition
    );
  }
}

angularI18nTranslationsExtractor.mayContainTranslations = function (
  content: string
): boolean {
  return content.indexOf(I18N_ATTRIBUTE_NAME) !== -1;
};

function handleTranslationsOfAttributes(
  element: AngularElement,
  context: HtmlTranslationExtractionContext,
  i18nAttributes: Attribute[]
): void {
  for (const i18nAttribute of i18nAttributes) {
    handleAttribute(element, context, i18nAttribute);
  }
}

function handleAttribute(
  element: AngularElement,
  context: HtmlTranslationExtractionContext,
  i18nAttribute: Attribute
): void {
  const translationIdExtraction = extractTranslationId(i18nAttribute, context);
  if (translationIdExtraction.valid === false) {
    context.emitError(
      translationIdExtraction.error,
      i18nAttribute.startPosition
    );
    return;
  }

  const attributeName = i18nAttribute.name.substr(
    `${I18N_ATTRIBUTE_NAME}-`.length
  );
  const attribute = element.attributes.find(
    (attribute) => attribute.name === attributeName
  );

  if (!attribute) {
    context.emitError(
      `The element ${context.asHtml()} with ${
        i18nAttribute.name
      } is missing a corresponding ${attributeName} attribute.`,
      element.startPosition
    );
    return;
  }

  const defaultText = attribute.value;

  if (!defaultText) {
    context.emitError(
      `The element ${context.asHtml()} with ${
        i18nAttribute.name
      } is missing a value for the corresponding ${attributeName} attribute.`,
      element.startPosition
    );
    return;
  }

  context.registerTranslation({
    translationId: translationIdExtraction.translationId,
    defaultText: defaultText,
    position: i18nAttribute.startPosition,
  });
}

function extractTranslationId(
  attribute: Attribute,
  context: HtmlTranslationExtractionContext
): { valid: true; translationId: string } | { valid: false; error: string } {
  const index = attribute.value.indexOf(ID_INDICATOR);
  if (index < 0) {
    return {
      valid: false,
      error: `The attribute ${
        attribute.name
      } on element ${context.asHtml()} attribute is missing the custom id indicator '${ID_INDICATOR}'.`,
    };
  } else if (index + ID_INDICATOR.length === attribute.value.length) {
    return {
      valid: false,
      error: `The attribute ${
        attribute.name
      } on element ${context.asHtml()} defines an empty ID.`,
    };
  } else {
    return {
      valid: true,
      translationId: attribute.value.substr(index + ID_INDICATOR.length),
    };
  }
}
