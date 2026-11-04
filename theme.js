/* =====================================================
   SMART ACADEMY — THEME SWITCHER
   Light Mode / Dark Mode
   Saves the user's selected theme
===================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "smart-academy-theme";
  const root = document.documentElement;

  // Read the saved theme safely.
  function getSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch (error) {
      console.warn("Theme preference could not be read.");
    }

    return "light";
  }

  // Apply the selected theme.
  function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    root.setAttribute("data-theme", selectedTheme);

    try {
      localStorage.setItem(STORAGE_KEY, selectedTheme);
    } catch (error) {
      console.warn("Theme preference could not be saved.");
    }

    updateThemeButton(selectedTheme);
  }

  // Update the theme button's label and icon.
  function updateThemeButton(theme) {
    const button = document.getElementById("themeToggle");

    if (!button) return;

    const isDark = theme === "dark";

    button.textContent = isDark ? "☀" : "☾";

    button.setAttribute(
      "aria-label",
      isDark
        ? "Switch to light mode"
        : "Switch to dark mode"
    );

    button.setAttribute(
      "title",
      isDark
        ? "Switch to light mode"
        : "Switch to dark mode"
    );

    button.setAttribute("aria-pressed", String(isDark));
  }

  // Create the theme button without replacing existing HTML.
  function createThemeButton() {
    const topbar = document.querySelector(".topbar");

    if (!topbar) return;

    // Avoid creating duplicate buttons.
    if (document.getElementById("themeToggle")) return;

    const button = document.createElement("button");

    button.id = "themeToggle";
    button.className = "icon-btn";
    button.type = "button";
    button.textContent = "☾";

    button.setAttribute("aria-label", "Switch to dark mode");
    button.setAttribute("title", "Switch theme");
    button.setAttribute("aria-pressed", "false");

    button.style.fontSize = "21px";
    button.style.lineHeight = "1";

    button.addEventListener("click", function () {
      const currentTheme = root.getAttribute("data-theme");
      const nextTheme = currentTheme === "dark" ? "light" : "dark";

      applyTheme(nextTheme);
    });

    // Insert before the avatar when possible.
    const avatar = document.getElementById("avatar");

    if (avatar && avatar.parentElement === topbar) {
      topbar.insertBefore(button, avatar);
    } else {
      topbar.appendChild(button);
    }

    updateThemeButton(
      root.getAttribute("data-theme") || "light"
    );
  }

  // Apply saved theme immediately.
  applyTheme(getSavedTheme());

  // Build the button when the page is ready.
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      createThemeButton
    );
  } else {
    createThemeButton();
  }

})();
