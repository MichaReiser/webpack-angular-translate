import Translation from "./translation";
import { loader } from "webpack/";

export interface TranslateLoaderContext extends loader.LoaderContext {
  /**
   * Registers a new translation
   * @param translation the translation to register
   */
  registerTranslation?: (translation: Translation) => void;

  /**
   * Removes all translations for the passed in resource.
   * A resource is only removed if it was the last with the specific translation. If the translation
   * is used from multiple resources, then it is not removed.
   */
  pruneTranslations?: (resource: string) => void;
}

export default TranslateLoaderContext;
