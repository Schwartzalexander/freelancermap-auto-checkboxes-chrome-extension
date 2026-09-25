const DEFAULT_TERMS = ["AGB", "allgemeine Geschaeftsbedingungen", "allgemeine Geschäftsbedingungen", "Datenschutz", "Referenz", "CV-en", "CV-de"];
const STORAGE_KEY = "checkboxTerms";

let activeTerms = DEFAULT_TERMS;
let debounceTimer = null;

function normalizeText(value) {
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTerms(terms) {
  const seen = new Set();
  return terms
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term) => {
      const normalized = normalizeText(term);
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

function getLabelText(checkbox) {
  const explicitLabel = checkbox.id ? document.querySelector(`label[for="${CSS.escape(checkbox.id)}"]`) : null;
  const label = checkbox.closest("label") || explicitLabel;
  const nearbyText = checkbox.parentElement ? checkbox.parentElement.textContent : "";
  return `${label ? label.textContent : ""} ${nearbyText}`;
}

function matchesTerms(checkbox) {
  const labelText = normalizeText(getLabelText(checkbox));
  return activeTerms.some((term) => labelText.includes(normalizeText(term)));
}

function checkMatchingBoxes(root = document) {
  const scope = root instanceof Element || root instanceof Document ? root : document;
  const checkboxes = scope.querySelectorAll('input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    if (!checkbox.checked && matchesTerms(checkbox)) {
      checkbox.click();
    }
  });
}

function scheduleCheck(root = document) {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => checkMatchingBoxes(root), 150);
}

function observePage() {
  const observer = new MutationObserver((mutations) => {
    const changedNode = mutations.find((mutation) => mutation.addedNodes.length > 0)?.target;
    scheduleCheck(changedNode instanceof Element ? changedNode : document);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_TERMS }, (items) => {
  activeTerms = uniqueTerms(items[STORAGE_KEY]);
  checkMatchingBoxes();
  observePage();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync" || !changes[STORAGE_KEY]) {
    return;
  }

  activeTerms = uniqueTerms(changes[STORAGE_KEY].newValue || DEFAULT_TERMS);
  checkMatchingBoxes();
});
