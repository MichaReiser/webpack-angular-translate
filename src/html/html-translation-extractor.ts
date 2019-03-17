import { Attribute, Text } from "./element-context";

export interface AngularElement {
  tagName: string;
  attributes: Attribute[];
  texts: Text[];
  startPosition: number;
}

export interface TranslationOccurrence {
  translationId: string;
  defaultText?: string;
  position: number;
}

export interface HtmlTranslationExtractionContext {
  emitError(message: string, position: number): void;
  emitSuppressableError(message: string, position: number): void;
  registerTranslation(translation: TranslationOccurrence): void;
  asHtml(): void;
}

export interface HtmlTranslationExtractor {
  (element: AngularElement, context: HtmlTranslationExtractionContext): void;
}
