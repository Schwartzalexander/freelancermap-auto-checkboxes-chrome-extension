const DEFAULT_TERMS = ["AGB", "allgemeine Geschaeftsbedingungen", "allgemeine Geschäftsbedingungen", "Datenschutz", "Referenz", "CV-en", "CV-de"];
const STORAGE_KEY = "checkboxTerms";
const PROJECT_TRACKING_ENABLED_KEY = "projectTrackingEnabled";
const VIEWED_PROJECTS_KEY = "viewedProjects";
const PROJECT_QUEUE_DELAY_MS = 350;
const PROJECT_MODAL_TIMEOUT_MS = 8000;
const PROJECT_VIEWED_TIMEOUT_MS = 4000;
const VIEWED_PROJECT_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

let activeTerms = DEFAULT_TERMS;
let debounceTimer = null;
let projectTrackingEnabled = true;
let viewedProjects = new Map();
let projectTrackingReady = false;
let projectQueueTimer = null;
let projectQueueRunning = false;
const processedProjects = new Set();

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

function normalizeProjectId(href) {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, window.location.origin);
    return url.pathname.replace(/\/$/, "");
  } catch (error) {
    return href.trim();
  }
}

function getProjectLink(card) {
  return card.querySelector('a[data-id="project-card-title"], a[data-testid="title"]');
}

function getProjectIdFromCard(card) {
  return normalizeProjectId(getProjectLink(card)?.href || "");
}

function getListedProjectCards() {
  return Array.from(document.querySelectorAll(".project-list.project-list-grid .project-card"))
    .filter((card) => !card.closest(".search-result-modal"));
}

function getScrollableParent(element) {
  let parent = element.parentElement;

  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return document.scrollingElement;
}

function scrollToFirstProject() {
  const firstProject = getListedProjectCards()[0];
  if (!firstProject) {
    return;
  }

  firstProject.scrollIntoView({ block: "start", inline: "nearest" });

  const scrollParent = getScrollableParent(firstProject);
  if (scrollParent && scrollParent !== document.scrollingElement) {
    scrollParent.scrollTop += firstProject.getBoundingClientRect().top - scrollParent.getBoundingClientRect().top;
  }

  const top = firstProject.getBoundingClientRect().top + window.scrollY - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
}

function scheduleScrollToFirstProject() {
  [0, 300, 900].forEach((timeout) => {
    window.setTimeout(scrollToFirstProject, timeout);
  });
}

function parseViewedProjects(value) {
  const now = Date.now();
  const cutoff = now - VIEWED_PROJECT_MAX_AGE_MS;
  const entries = value && !Array.isArray(value) && typeof value === "object" ? Object.entries(value) : [];
  const projects = new Map();

  entries.forEach(([projectId, viewedAt]) => {
    const normalizedProjectId = normalizeProjectId(projectId);
    const timestamp = Number(viewedAt) || now;

    if (normalizedProjectId && timestamp >= cutoff) {
      projects.set(normalizedProjectId, timestamp);
    }
  });

  return projects;
}

function cleanupViewedProjects() {
  const cutoff = Date.now() - VIEWED_PROJECT_MAX_AGE_MS;

  for (const [projectId, viewedAt] of viewedProjects) {
    if (viewedAt < cutoff) {
      viewedProjects.delete(projectId);
      processedProjects.delete(projectId);
    }
  }
}

function saveViewedProjects() {
  cleanupViewedProjects();
  chrome.storage.local.set({ [VIEWED_PROJECTS_KEY]: Object.fromEntries(viewedProjects) });
}

function rememberViewedProject(projectId) {
  if (!projectId) {
    return;
  }

  cleanupViewedProjects();
  if (viewedProjects.has(projectId)) {
    return;
  }

  viewedProjects.set(projectId, Date.now());
  saveViewedProjects();
}

function collectViewedProjects() {
  if (!projectTrackingReady || !projectTrackingEnabled) {
    return;
  }

  getListedProjectCards()
    .filter((card) => card.classList.contains("viewed-project"))
    .forEach((card) => rememberViewedProject(getProjectIdFromCard(card)));

  const openedProjectLink = document.querySelector('.search-result-modal.show a[data-id="search-result-modal-open-show"]');
  rememberViewedProject(normalizeProjectId(openedProjectLink?.href || ""));
}

function waitForElement(selector, predicate = () => true, timeoutMs = PROJECT_MODAL_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing && predicate(existing)) {
      resolve(existing);
      return;
    }

    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element && predicate(element)) {
        window.clearTimeout(timeout);
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-hidden"]
    });
  });
}

function waitForCondition(predicate, timeoutMs) {
  return new Promise((resolve) => {
    if (predicate()) {
      resolve(true);
      return;
    }

    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      if (predicate()) {
        window.clearTimeout(timeout);
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-hidden"]
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function scheduleProjectQueue() {
  if (!projectTrackingReady || !projectTrackingEnabled || projectQueueRunning) {
    return;
  }

  window.clearTimeout(projectQueueTimer);
  projectQueueTimer = window.setTimeout(processProjectQueue, PROJECT_QUEUE_DELAY_MS);
}

async function processProjectQueue() {
  if (!projectTrackingReady || !projectTrackingEnabled || projectQueueRunning) {
    return;
  }

  const cards = getListedProjectCards().filter((card) => {
    const projectId = getProjectIdFromCard(card);
    return projectId && viewedProjects.has(projectId) && !card.classList.contains("viewed-project") && !processedProjects.has(projectId);
  });

  if (cards.length === 0) {
    return;
  }

  projectQueueRunning = true;

  for (const card of cards) {
    if (!projectTrackingEnabled) {
      break;
    }

    const projectId = getProjectIdFromCard(card);
    const link = getProjectLink(card);
    if (!projectId || !link || processedProjects.has(projectId)) {
      continue;
    }

    processedProjects.add(projectId);
    link.scrollIntoView({ block: "center" });
    link.click();

    const modal = await waitForElement('.search-result-modal.show[aria-hidden="false"]', (element) => !element.querySelector(".loading"));
    if (!modal) {
      continue;
    }

    collectViewedProjects();
    await waitForCondition(() => card.classList.contains("viewed-project"), PROJECT_VIEWED_TIMEOUT_MS);

    const closeButton = modal.querySelector('button.modal-close[aria-label="Close"]');
    if (closeButton) {
      closeButton.click();
      await waitForElement('.search-result-modal.hidden, .search-result-modal[aria-hidden="true"]', Boolean, 3000);
    }

    await delay(PROJECT_QUEUE_DELAY_MS);
  }

  projectQueueRunning = false;
  scheduleScrollToFirstProject();
  scheduleProjectQueue();
}

function observePage() {
  const observer = new MutationObserver((mutations) => {
    const changedNode = mutations.find((mutation) => mutation.addedNodes.length > 0)?.target;
    scheduleCheck(changedNode instanceof Element ? changedNode : document);
    collectViewedProjects();
    scheduleProjectQueue();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "aria-hidden"]
  });
}

document.addEventListener("click", (event) => {
  if (!projectTrackingReady || !projectTrackingEnabled) {
    return;
  }

  const card = event.target.closest?.(".project-card");
  if (!card || card.closest(".search-result-modal")) {
    return;
  }

  rememberViewedProject(getProjectIdFromCard(card));
}, true);

chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_TERMS }, (items) => {
  activeTerms = uniqueTerms(items[STORAGE_KEY]);
  checkMatchingBoxes();
  observePage();
});

chrome.storage.local.get({ [VIEWED_PROJECTS_KEY]: {}, [PROJECT_TRACKING_ENABLED_KEY]: true }, (items) => {
  projectTrackingEnabled = items[PROJECT_TRACKING_ENABLED_KEY] !== false;
  viewedProjects = parseViewedProjects(items[VIEWED_PROJECTS_KEY]);
  projectTrackingReady = true;
  saveViewedProjects();
  collectViewedProjects();
  scheduleProjectQueue();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes[STORAGE_KEY]) {
    activeTerms = uniqueTerms(changes[STORAGE_KEY].newValue || DEFAULT_TERMS);
    checkMatchingBoxes();
  }

  if (areaName !== "local") {
    return;
  }

  if (changes[PROJECT_TRACKING_ENABLED_KEY]) {
    projectTrackingEnabled = changes[PROJECT_TRACKING_ENABLED_KEY].newValue !== false;
    scheduleProjectQueue();
  }

  if (changes[VIEWED_PROJECTS_KEY]) {
    viewedProjects = parseViewedProjects(changes[VIEWED_PROJECTS_KEY].newValue || {});
    scheduleProjectQueue();
  }
});
