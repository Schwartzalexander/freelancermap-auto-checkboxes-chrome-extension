const DEFAULT_TERMS = ["AGB", "allgemeine Geschaeftsbedingungen", "allgemeine Geschäftsbedingungen", "Referenz", "CV-en", "CV-de"];
const STORAGE_KEY = "checkboxTerms";

const form = document.querySelector("#term-form");
const input = document.querySelector("#term-input");
const list = document.querySelector("#term-list");
const resetButton = document.querySelector("#reset-button");
const status = document.querySelector("#status");

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

chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_TERMS }, (items) => {
  terms = uniqueTerms(items[STORAGE_KEY]);
  renderTerms();
});
