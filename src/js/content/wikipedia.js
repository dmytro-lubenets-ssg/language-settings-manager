import defaultHandler from './default';

export default class wikipediaHandler extends defaultHandler {
  handlerName = 'wikipedia';

  async _targetLanguagesConfigCached() {
    return null;
  }

  async needToTweakLanguages() {
    // skip all caching that base class provides
    return this._targetLanguagesConfig();
  }

  _tweakLanguagesCTA(languageConfig) {
    return 'Ця сторінка є Українською. Переглянути?';
  }

  async _targetLanguagesConfig() {
    const currentLang = document.querySelector('html').getAttribute('lang');
    if (this.moreLanguages.includes(currentLang)) {
      return Promise.reject();
    }

    const langs = {};
    document
      .querySelectorAll(
        '#p-lang .vector-menu-content a.interlanguage-link-target'
      )
      .forEach((a) => (langs[a.getAttribute('lang')] = a.getAttribute('href')));

    for (var lng of this.moreLanguages) {
      if (!langs[lng]) continue;
      return Promise.resolve([lng, langs[lng]]);
    }

    return Promise.reject();
  }

  async _changeLanguageTo(language) {
    window.location.replace(language[1]);
  }

  _reloadPageOnceLanguagesChanged() {
    // do nothing, override base class
  }
}
