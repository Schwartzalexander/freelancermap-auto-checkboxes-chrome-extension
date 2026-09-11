# Repository Summary

`freelancermap-auto-checkboxes-chrome-extension` is a lightweight Chrome Manifest V3 extension that automatically checks configured checkboxes in Freelancermap project modals.

It targets `freelancermap.de` and `freelancermap.ch`, observes dynamically rendered modal content, and selects checkbox inputs when their labels contain configured terms such as `AGB`, `Referenz`, `CV-en`, or `CV-de`.

The extension has no build step and consists of a content script, a small popup configuration UI, SVG icons, and documentation.
