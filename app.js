"use strict";

/*
 * MindMate AI Studio
 * Frontend starter application.
 *
 * IMPORTANT:
 * Projects and profile preferences are stored in this browser.
 * This is not secure online account storage.
 * AI generation and payments require a configured backend.
 */

const STORAGE_KEYS = {
  projects: "mindmate_projects_v1",
  profile: "mindmate_profile_v1"
};

const CREATION_TYPES = {
  image: {
    label: "AI Image",
    icon: "▧",
    description: "Image creation brief"
  },
  animation: {
    label: "AI Animation",
    icon: "▶",
    description: "Animation creation brief"
  },
  character: {
    label: "AI Character",
    icon: "♙",
    description: "Character creation brief"
  },
  story: {
    label: "AI Story",
    icon: "▤",
    description: "Story creation brief"
  }
};

let selectedType = "image";
let toastTimer = null;

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Unable to read local storage:", error);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Unable to save local storage:", error);
    showToast("Unable to save. Check your device storage.");
    return false;
  }
}

function getProjects() {
  const projects = readStorage(STORAGE_KEYS.projects, []);
  return Array.isArray(projects) ? projects : [];
}

function saveProjects(projects) {
  return writeStorage(STORAGE_KEYS.projects, projects);
}

function getProfile() {
  const profile = readStorage(STORAGE_KEYS.profile, {
    name: "Creator",
    email: ""
  });

  return {
    name: typeof profile.name === "string" ? profile.name : "Creator",
    email: typeof profile.email === "string" ? profile.email : ""
  };
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently saved";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* ------------------------------
   Navigation
------------------------------ */

function openPage(pageName) {
  const target = $(`#page-${pageName}`);

  if (!target) {
    showToast("This page is not available.");
    return;
  }

  $$(".page").forEach(page => {
    page.classList.toggle("active", page === target);
  });

  $$(".nav-item[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const pageTitles = {
    home: "Dashboard",
    create: "AI Creator",
    projects: "My Projects",
    characters: "Characters",
    stories: "Story Studio",
    credits: "Credits & Plans",
    profile: "My Profile"
  };

  const section = $("#currentSection");

  if (section) {
    section.textContent = pageTitles[pageName] || "Workspace";
  }

  closeSidebar();

  if (pageName === "projects") {
    renderProjects();
  }

  if (pageName === "home") {
    renderRecentProjects();
  }

  if (pageName === "profile") {
    populateProfile();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function closeSidebar() {
  const sidebar = $("#sidebar");

  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

function toggleSidebar() {
  const sidebar = $("#sidebar");

  if (sidebar) {
    sidebar.classList.toggle("open");
  }
}

/* ------------------------------
   Creator tools
------------------------------ */

function setCreationType(type) {
  if (!CREATION_TYPES[type]) {
    return;
  }

  selectedType = type;

  $$(".type-option").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.type === type
    );
  });

  updatePreviewDetails();
}

function updatePreviewDetails() {
  const typeInfo = CREATION_TYPES[selectedType];

  const typeLabel = $("#previewType");
  const styleLabel = $("#previewStyle");
  const aspectLabel = $("#previewAspect");

  if (typeLabel) {
    typeLabel.textContent = typeInfo.label;
  }

  if (styleLabel) {
    styleLabel.textContent = $("#styleSelect")?.value || "Cinematic";
  }

  if (aspectLabel) {
    aspectLabel.textContent = $("#aspectSelect")?.value || "1:1";
  }
}

function updateCharacterCount() {
  const prompt = $("#prompt");
  const counter = $("#charCount");

  if (!prompt || !counter) return;

  counter.textContent = `${prompt.value.length} / 3000`;
}

function updatePreviewContent(project) {
  const canvas = $("#previewCanvas");

  if (!canvas) return;

  const typeInfo = CREATION_TYPES[project.type] || CREATION_TYPES.image;

  canvas.replaceChildren();

  const symbol = document.createElement("div");
  symbol.className = "preview-symbol";
  symbol.textContent = typeInfo.icon;

  const heading = document.createElement("h3");
  heading.textContent = project.title;

  const description = document.createElement("p");
  description.textContent = project.prompt;

  canvas.append(symbol, heading, description);

  updatePreviewDetails();
}

function prepareCreation() {
  const promptField = $("#prompt");
  const titleField = $("#projectTitle");
  const styleField = $("#styleSelect");
  const aspectField = $("#aspectSelect");

  if (!promptField || !titleField || !styleField || !aspectField) {
    return;
  }

  const prompt = promptField.value.trim();

  if (!prompt) {
    showToast("Describe your idea before preparing a project.");
    promptField.focus();
    return;
  }

  const title = titleField.value.trim() || makeDefaultTitle(prompt);

  const project = {
    id: createId(),
    title,
    prompt,
    type: selectedType,
    style: styleField.value,
    aspect: aspectField.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const projects = getProjects();

  projects.unshift(project);

  if (!saveProjects(projects)) {
    return;
  }

  titleField.value = "";
  promptField.value = "";

  updateCharacterCount();
  updatePreviewContent(project);
  renderProjects();
  renderRecentProjects();

  showToast(
    "Creative brief saved. Real AI generation is not connected yet."
  );
}

function makeDefaultTitle(prompt) {
  const firstSentence = prompt.split(/[.!?\n]/)[0].trim();

  if (firstSentence.length <= 45) {
    return firstSentence || "Untitled project";
  }

  return firstSentence.slice(0, 42).trimEnd() + "...";
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function openCreatorWithType(type) {
  setCreationType(type);
  openPage("create");

  const promptField = $("#prompt");

  if (promptField) {
    setTimeout(() => promptField.focus(), 100);
  }
}

/* ------------------------------
   Project management
------------------------------ */

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";

  const typeInfo = CREATION_TYPES[project.type] || CREATION_TYPES.image;

  const art = document.createElement("div");
  art.className = "project-art";
  art.textContent = typeInfo.icon;
  art.setAttribute("aria-hidden", "true");

  const body = document.createElement("div");
  body.className = "project-body";

  const heading = document.createElement("h3");
  heading.textContent = project.title || "Untitled project";

  const description = document.createElement("p");
  description.textContent =
    `${typeInfo.label} · ${formatDate(project.updatedAt || project.createdAt)}`;

  const actions = document.createElement("div");
  actions.className = "project-actions";

  const openButton = document.createElement("button");
  openButton.className = "small-button";
  openButton.textContent = "Open";
  openButton.type = "button";

  openButton.addEventListener("click", () => {
    editProject(project.id);
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "small-button delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.type = "button";

  deleteButton.addEventListener("click", () => {
    deleteProject(project.id);
  });

  actions.append(openButton, deleteButton);
  body.append(heading, description, actions);
  card.append(art, body);

  return card;
}

function renderProjects() {
  const container = $("#allProjects");

  if (!container) return;

  const searchField = $("#projectSearch");
  const searchTerm = (searchField?.value || "").trim().toLowerCase();

  const projects = getProjects().filter(project => {
    const title = String(project.title || "").toLowerCase();
    const prompt = String(project.prompt || "").toLowerCase();

    return title.includes(searchTerm) || prompt.includes(searchTerm);
  });

  container.replaceChildren();

  if (projects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "panel empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = "▤";

    const heading = document.createElement("h2");
    heading.textContent = searchTerm
      ? "No matching projects"
      : "Your creative workspace is waiting";

    const description = document.createElement("p");
    description.textContent = searchTerm
      ? "Try another search term."
      : "Save your first creative brief to see it here.";

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = "Create a project →";
    button.type = "button";

    button.addEventListener("click", () => openPage("create"));

    empty.append(icon, heading, description, button);
    container.append(empty);
    return;
  }

  projects.forEach(project => {
    container.append(createProjectCard(project));
  });
}

function renderRecentProjects() {
  const container = $("#recentProjects");

  if (!container) return;

  container.replaceChildren();

  const projects = getProjects().slice(0, 3);

  if (projects.length === 0) {
    const empty = document.createElement("div");
    empty.className = "panel empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.textContent = "✦";

    const heading = document.createElement("h2");
    heading.textContent = "Your first idea goes here";

    const description = document.createElement("p");
    description.textContent =
      "Create a brief for an image, animation, character or story.";

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = "Start creating →";
    button.type = "button";

    button.addEventListener("click", () => openPage("create"));

    empty.append(icon, heading, description, button);
    container.append(empty);
    return;
  }

  projects.forEach(project => {
    container.append(createProjectCard(project));
  });
}

function editProject(projectId) {
  const project = getProjects().find(item => item.id === projectId);

  if (!project) {
    showToast("Project not found.");
    return;
  }

  openPage("create");

  $("#projectTitle").value = project.title || "";
  $("#prompt").value = project.prompt || "";

  if ($("#styleSelect")) {
    $("#styleSelect").value = project.style || "Cinematic";
  }

  if ($("#aspectSelect")) {
    $("#aspectSelect").value = project.aspect || "1:1";
  }

  setCreationType(project.type || "image");
  updateCharacterCount();
  updatePreviewContent(project);

  showToast("Project opened. Save a new version when ready.");
}

function deleteProject(projectId) {
  const projects = getProjects();
  const project = projects.find(item => item.id === projectId);

  if (!project) {
    showToast("Project not found.");
    return;
  }

  const confirmed = window.confirm(
    `Delete "${project.title}" from this browser?`
  );

  if (!confirmed) return;

  const remaining = projects.filter(item => item.id !== projectId);

  if (!saveProjects(remaining)) {
    return;
  }

  renderProjects();
  renderRecentProjects();

  showToast("Project deleted from this browser.");
}

/* ------------------------------
   Profile preferences
------------------------------ */

function populateProfile() {
  const profile = getProfile();

  const nameField = $("#displayName");
  const emailField = $("#displayEmail");

  if (nameField) {
    nameField.value = profile.name;
  }

  if (emailField) {
    emailField.value = profile.email;
  }

  updateProfileLabels(profile);
}

function updateProfileLabels(profile) {
  const name = profile.name.trim() || "Creator";
  const sidebarName = $("#sidebarName");

  if (sidebarName) {
    sidebarName.textContent = name;
  }

  $$(".avatar, .profile-avatar").forEach(avatar => {
    avatar.textContent = name.charAt(0).toUpperCase();
  });
}

function saveProfile() {
  const name = ($("#displayName")?.value || "").trim();
  const email = ($("#displayEmail")?.value || "").trim();

  if (name.length > 60) {
    showToast("Your display name is too long.");
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Enter a valid email address.");
    return;
  }

  const profile = {
    name: name || "Creator",
    email
  };

  if (!writeStorage(STORAGE_KEYS.profile, profile)) {
    return;
  }

  updateProfileLabels(profile);
  showToast("Profile preferences saved in this browser.");
}

/* ------------------------------
   Plan notification placeholders
------------------------------ */

function notifyPlan() {
  showToast(
    "Subscriptions are not active yet. Online payments will be added after backend setup."
  );
}

function notifyCredits() {
  showToast(
    "Credit purchases are not active yet. Flutterwave integration is still required."
  );
}

/* ------------------------------
   Event handling
------------------------------ */

function bindEvents() {
  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");

    if (pageButton) {
      event.preventDefault();
      openPage(pageButton.dataset.page);
      return;
    }

    const toolButton = event.target.closest("[data-tool]");

    if (toolButton) {
      event.preventDefault();
      openCreatorWithType(toolButton.dataset.tool);
    }
  });

  $$(".type-option").forEach(button => {
    button.addEventListener("click", () => {
      setCreationType(button.dataset.type);
    });
  });

  $("#prompt")?.addEventListener("input", updateCharacterCount);

  $("#styleSelect")?.addEventListener("change", updatePreviewDetails);

  $("#aspectSelect")?.addEventListener("change", updatePreviewDetails);

  $("#generateButton")?.addEventListener("click", prepareCreation);

  $("#projectSearch")?.addEventListener("input", renderProjects);

  $("#saveProfileButton")?.addEventListener("click", saveProfile);

  $("#notifyPlanButton")?.addEventListener("click", notifyPlan);

  $("#notifyCreditsButton")?.addEventListener("click", notifyCredits);

  $("#menuButton")?.addEventListener("click", toggleSidebar);

  document.addEventListener("click", event => {
    const sidebar = $("#sidebar");
    const menuButton = $("#menuButton");

    if (
      sidebar &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menuButton?.contains(event.target)
    ) {
      closeSidebar();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  window.addEventListener("hashchange", () => {
    const pageName = window.location.hash.replace("#", "");

    if ($(`#page-${pageName}`)) {
      openPage(pageName);
    }
  });
}

/* ------------------------------
   Application initialization
------------------------------ */

function initializeApp() {
  bindEvents();

  populateProfile();
  updateCharacterCount();
  updatePreviewDetails();

  renderProjects();
  renderRecentProjects();

  const initialPage = window.location.hash.replace("#", "");

  if (initialPage && $(`#page-${initialPage}`)) {
    openPage(initialPage);
  } else {
    openPage("home");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
