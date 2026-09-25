const DEFAULT_TERMS = ["AGB", "allgemeine Geschaeftsbedingungen", "allgemeine Geschäftsbedingungen", "Datenschutz", "Referenz", "CV-en", "CV-de"];
const STORAGE_KEY = "checkboxTerms";
const PROJECT_TRACKING_ENABLED_KEY = "projectTrackingEnabled";

const form = document.querySelector("#term-form");
const input = document.querySelector("#term-input");
const list = document.querySelector("#term-list");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");
const projectTrackingToggle = document.querySelector("#project-tracking-toggle");

let terms = [];

function normalizeText(value) {
  return value
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTerms(values) {
  const seen = new Set();
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = normalizeText(value);
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

function saveTerms(nextTerms, message = "Gespeichert.") {
  terms = uniqueTerms(nextTerms);
  chrome.storage.sync.set({ [STORAGE_KEY]: terms }, () => {
    renderTerms();
    setStatus(message);
  });
}

function setStatus(message) {
  status.textContent = message;
  window.setTimeout(() => {
    if (status.textContent === message) {
      status.textContent = "";
    }
  }, 1800);
}

function renderTerms() {
  list.textContent = "";

  terms.forEach((term, index) => {
    const item = document.createElement("li");
    const text = document.createElement("span");
    const editButton = document.createElement("button");
    const removeButton = document.createElement("button");

    text.className = "term-text";
    text.textContent = term;

    editButton.type = "button";
    editButton.className = "secondary";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => editTerm(index));

    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "Entfernen";
    removeButton.addEventListener("click", () => saveTerms(terms.filter((_, termIndex) => termIndex !== index), "Entfernt."));

    item.append(text, editButton, removeButton);
    list.append(item);
  });
}

function editTerm(index) {
  const replacement = window.prompt("Suchbegriff bearbeiten", terms[index]);
  if (replacement === null) {
    return;
  }

  const nextTerms = [...terms];
  nextTerms[index] = replacement;
  saveTerms(nextTerms);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTerms([...terms, input.value], "Hinzugefügt.");
  input.value = "";
  input.focus();
});

resetButton.addEventListener("click", () => saveTerms(DEFAULT_TERMS, "Standards wiederhergestellt."));

projectTrackingToggle.addEventListener("change", () => {
  chrome.storage.local.set({ [PROJECT_TRACKING_ENABLED_KEY]: projectTrackingToggle.checked }, () => {
    setStatus(projectTrackingToggle.checked ? "Projekt-Tracking aktiviert." : "Projekt-Tracking deaktiviert.");
  });
});

chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_TERMS }, (items) => {
  terms = uniqueTerms(items[STORAGE_KEY]);
  renderTerms();
});

chrome.storage.local.get({ [PROJECT_TRACKING_ENABLED_KEY]: true }, (items) => {
  projectTrackingToggle.checked = items[PROJECT_TRACKING_ENABLED_KEY] !== false;
});
