# MCQAdminPanel

MCQAdminPanel is an offline-friendly MCQ authoring and exam delivery app. It lets you build a question bank, import and export JSON, print question papers and answer keys, and generate a standalone `exam.html` file for student use.

## What this repo contains

This GitHub repository currently contains the shared web app layer of the project.

Root files and folders:

- `index.html`
- `css/`
- `js/`
- `icons/`
- `vendor/`
- `standalone/`

## Current project architecture

The full project now uses a shared-source architecture with platform wrappers:

1. Shared web app source
2. Windows Electron wrapper
3. Android Capacitor wrapper

In the full local workspace, that architecture looks like:

- `Main/` - shared source-of-truth web app
- `Windows App/` - builds the Windows `.exe`
- `APK/` - builds the Android `.apk`

This repository represents the shared web app layer that those wrappers are built from.

## Main features

- Create, edit, reorder, clone, tag, and delete MCQ questions
- Preview math with MathJax while editing
- Import JSON question banks and export full JSON, selected JSON, and answer keys
- Build a standalone `exam.html` file for student delivery
- Print question papers and answer keys
- Save and restore local workspace snapshots
- Use shortcuts, command palette actions, dark theme, and high-contrast mode

## How the app is organized

### Shared web app files in this repo

- `index.html` - main entry point
- `css/` - stylesheets
- `js/` - application logic
- `icons/` - branding and UI assets
- `vendor/` - third-party browser assets
- `standalone/` - exam runtime assets used when building `exam.html`

## Running this repo locally

This repo is a static web app. Use a local static server instead of opening files directly.

Example workflow:

1. Open the repo in Live Server, or serve it with any static file server.
2. Open `index.html`.
3. Use the app in the browser.

## Main user workflows

### Question authoring

- Add questions
- Edit options
- mark correct answers
- set topic, difficulty, marks, tags, and explanation

### Data management

- Import JSON
- Export full JSON
- Export selected JSON
- Export answer key

### Exam delivery

- Open exam settings
- Validate readiness
- Build `exam.html`

### Utilities

- Print questions
- Print answer key
- Open snapshot library
- Use the test harness

## Notes

- The app is client-side and offline-friendly
- JSON is the main portability format
- The standalone `exam.html` is generated from the admin workspace
- In the full project, Windows and Android wrappers package this shared app with native file-saving behavior

## Documentation

- Beginner guide: [MCQAdminPanel_Beginner_Guide.txt](C:/Users/MSM/Documents/Projects/MCQAdminPanel_repo/MCQAdminPanel_Beginner_Guide.txt)
