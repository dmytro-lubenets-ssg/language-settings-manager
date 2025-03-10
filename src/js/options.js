import '../css/options.css';
import 'semantic-ui-css/semantic.min.js';
import browser from 'webextension-polyfill';
import { sendEvent, removeAffiliateCookie } from './networking';
import {
  storageGetSync,
  storageSetSync,
  getMessage,
  localizeHtmlPage,
} from './util';

let savedLanguages = false;

localizeHtmlPage();

$('#selectMoreLanguagesForm .ui.dropdown').dropdown({
  maxSelections: 3,
  direction: 'upward',
  message: {
    addResult: getMessage('semantic_ui_add_term'),
    count: getMessage('semantic_ui_selected_count'),
    maxSelections: getMessage('semantic_ui_no_more_than_tree'),
    noResults: getMessage('semantic_ui_not_found'),
  },
  onChange: function () {
    // document.getElementById('savePrefs').disabled = false;
  },
});

$('#selectLessLanguagesForm .ui.dropdown').dropdown({
  maxSelections: 3,
  direction: 'upward',
  message: {
    addResult: getMessage('semantic_ui_add_term'),
    count: getMessage('semantic_ui_selected_count'),
    maxSelections: getMessage('semantic_ui_no_more_than_tree'),
    noResults: getMessage('semantic_ui_not_found'),
  },
  onChange: function () {
    //    document.getElementById('savePrefs').disabled = false;
  },
});

document.querySelectorAll('#userSpeed .ui.menu > .item').forEach((element) =>
  element.addEventListener('click', (event) => {
    storageGetSync('userSettings').then((data) => {
      const userSettings = data.userSettings;
      userSettings.speed = element.getAttribute('data');
      storageSetSync({ userSettings: userSettings });
    });

    if (element.getAttribute('data') === 'fast') {
      var clicks = element.getAttribute('clicks') || 0;
      if (clicks > 3) {
        clicks = 0;
        element.style.display = 'none';
        element = element.parentElement.querySelector(
          '.item[data="immediately"]'
        );

        element.style.display = 'flex';
      }

      element.style.borderWidth = clicks + 'px';
      clicks++;
      element.setAttribute('clicks', clicks);
    } else {
      const fast = element.parentElement.querySelector(
        '.ui.menu > .item[data="fast"]'
      );
      fast.setAttribute('clicks', 0);
      fast.style.borderWidth = clicks + 'px';
    }

    element.parentElement
      .querySelectorAll('.ui.menu > .item')
      .forEach((item) => item.classList.remove('active'));
    element.classList.add('active');
  })
);

storageGetSync('userSettings').then((settings) => {
  let userSettings = settings.userSettings || {};

  if (!userSettings.moreLanguages) {
    // This is user's first pass through the config.
    // Reveal settings step by step
    document.getElementById('saveMoreLangPrefs').classList.remove('hidden');
    document.getElementById('saveLessLangPrefs').classList.remove('hidden');
    return;
  }

  // User been here before. Load the config and let them tweak it
  savedLanguages = true;
  $('#selectMoreLanguagesForm .ui.dropdown').dropdown(
    'set exactly',
    userSettings.moreLanguages
  );

  $('#wantLessLanguages .ui.dropdown').dropdown(
    'set exactly',
    userSettings.lessLanguages
  );

  document
    .getElementById('grantRightsToCollectStats')
    .classList.remove('hidden');
  document.getElementById('wantLessLanguages').classList.remove('hidden');
  document.getElementById('saveAllPrefs').classList.remove('hidden');

  if (userSettings.is_18) {
    document.querySelector(
      '#permissions_form input[name="user_is_18_plus"]'
    ).checked = true;
  }

  if (userSettings.is_18 && userSettings.collectStats) {
    document.querySelector(
      '#permissions_form input[name="collect_stats"]'
    ).checked = true;
  }

  // Set speed menu to the preconfigured value
  const speed = userSettings.speed || 'gentle';
  document
    .querySelectorAll('#userSpeed .ui.menu > .item')
    .forEach((element) => element.classList.remove('active'));
  document
    .querySelector('#userSpeed .ui.menu > .item[data="' + speed + '"]')
    .classList.add('active');

  if (speed === 'immediately') {
    document.querySelector(
      '#userSpeed .ui.menu > .item[data="fast"]'
    ).style.display = 'none';
    document.querySelector(
      '#userSpeed .ui.menu > .item[data="immediately"]'
    ).style.display = 'flex';
  }

  updatePermissionsState();
});

// Bind events
document
  .querySelector('#permissions_form')
  .addEventListener('change', updatePermissionsState);

document
  .getElementById('selectMoreLanguagesForm')
  .addEventListener('submit', saveMoreLangPrefs);

document
  .getElementById('selectLessLanguagesForm')
  .addEventListener('submit', saveLessLangPrefs);

document
  .getElementById('permissions_form')
  .addEventListener('submit', saveAllLangPrefs);

document.getElementById('learnMore').addEventListener('click', function () {
  window.open('http://hmara.info/', '_blank');
});

// A little extra in development,
// so engineers don't have to reinstall extension every time

if (process.env.NODE_ENV === 'development') {
  // Reset for dev mode
  document.getElementById('reset').classList.remove('hidden');
  const resetSettings = function () {
    browser.storage.sync.remove(['userSettings']);
    browser.storage.local.remove(['userSettings', 'requestCounter']);
    location.reload();
  };
  document
    .getElementById('resetSettings')
    .addEventListener('click', resetSettings);
}

// Functions

function updatePermissionsState() {
  let is_18 = document.querySelector(
    '#permissions_form input[name="user_is_18_plus"]'
  ).checked;
  document.querySelector(
    '#permissions_form input[name="collect_stats"]'
  ).disabled = is_18 ? false : true;
}

function saveMoreLangPrefs(e) {
  e.preventDefault();
  if (!saveLangChoice()) {
    return;
  }
  document.getElementById('wantLessLanguages').classList.remove('hidden');
  document.getElementById('saveMoreLangPrefs').classList.add('hidden');

  if (!savedLanguages) {
    document.getElementById('wantLessLanguages').scrollIntoView({
      block: 'start',
      inline: 'nearest',
      behavior: 'smooth',
    });
  }
}

function saveLessLangPrefs(e) {
  e.preventDefault();
  saveLangChoice();
  document.getElementById('saveLessLangPrefs').classList.add('hidden');

  document
    .getElementById('grantRightsToCollectStats')
    .classList.remove('hidden');

  document.getElementById('saveAllPrefs').classList.remove('hidden');
}

function saveAllLangPrefs(e) {
  e.preventDefault();
  saveLangChoice();
  if (!savedLanguages) {
    document.getElementById('allSavedThankYou').classList.remove('hidden');
  }
  savedLanguages = true;
}

function saveLangChoice(e) {
  const moreLanguages = document
    .querySelector('input#moreLanguages')
    .value.split(/,/)
    .filter((lang) => lang.length > 0);

  const lessLanguages = document
    .querySelector('input#lessLanguages')
    .value.split(/,/)
    .filter((lang) => lang.length > 0);

  if (!moreLanguages.length) {
    alert(getMessage('no_language_selected_err'));
    return false;
  }

  let is_18 = document.querySelector(
    '#permissions_form input[name="user_is_18_plus"]'
  ).checked
    ? true
    : false;

  let collect_stats =
    is_18 &&
    document.querySelector('#permissions_form input[name="collect_stats"]')
      .checked
      ? true
      : false;

  storageGetSync('userSettings').then((data) => {
    const firstConfigSave = data.userSettings ? false : true;
    let userSettings = data.userSettings || {};
    userSettings.moreLanguages = moreLanguages;
    userSettings.lessLanguages = lessLanguages;
    userSettings.is_18 = is_18;
    userSettings.collectStats = collect_stats;

    storageSetSync({ userSettings: userSettings });

    if (firstConfigSave) {
      removeAffiliateCookie();
    }

    browser.runtime.sendMessage({
      type: 'savedLanguageChoice',
      data: userSettings,
    });
    sendEvent('savedLanguageChoice');
  });

  return true;
}
