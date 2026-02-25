# MCQAdminPanel v2.0

Production-style MCQ admin panel and standalone exam generator built with:

- HTML5
- CSS3
- Vanilla JavaScript
- No framework
- No backend
- JSON import/export persistence

## Project Status

This repository's modern source of truth is:

- `index.html`
- `style.css`
- `script.js`

If a merged single-file artifact exists (for example `MCQAdminPanel.html`), treat the three source files above as canonical for development and release validation.

## Core Features

- Three-container admin architecture
- Main container with draggable question cards
- Left sliding question editor with full option/correct-answer logic
- Right control panel for system actions only
- JSON import that appends only (never replaces existing state)
- Export full JSON and selected-only JSON
- Standalone `exam.html` generation with embedded data
- Timed exam flow with setup, test, and results screens

## Admin Panel Behavior

### Main Container

- Shows question cards only
- Question preview, option count, checkbox, and Edit action
- Card selection highlight
- Drag and drop reorder with state update

### Left Editor Panel

- Hidden by default, slides in for editing
- Question textarea
- Dynamic options (min 2, max 6)
- Exactly one correct answer required
- Save and Cancel flow with unsaved-change guard
- Option textareas support multiline input
- Arrow key navigation between question and option textareas

### Right Control Panel

- Add question
- Delete current question
- Delete selected questions
- Import JSON (append-only)
- Export selected JSON
- Export full JSON
- Create exam file

## Data Model

Each question uses this structure:

```json
{
  "id": "q_unique_id",
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0
}
```

## JSON Rules

- Import accepts array payload or `{ "questions": [...] }`
- Imported questions are normalized and assigned new IDs
- Invalid entries are skipped
- Existing questions are preserved

## Generated Exam (`exam.html`)

The generated file is fully standalone and does not depend on admin files.

### Setup Screen

- Exam title
- Total available questions
- Question count input
- Shuffle questions toggle
- Shuffle options toggle
- Time limit input (minutes)
- Start button with validation

### Exam Screen

- Selected question subset based on setup
- Optional question and option shuffling
- Sticky timer
- One-answer-per-question radio inputs
- Manual submit confirmation
- Auto submit on timeout

### Result Screen

- Score and percentage
- Time taken
- Result mode (manual or auto submit)
- Review with correct/incorrect highlighting
- Toggle to show or hide detailed answer review

## Responsive Design

- Desktop: centered layout, sliding editor, fixed control panel
- Tablet: overlay control behavior
- Mobile: full-screen editor panel and slide-in controls with hamburger trigger

## Run Locally

No install step is required.

1. Open `index.html` in a browser.
2. Build questions and click `Create Exam File`.
3. Open the downloaded `exam.html` to run the standalone exam.

## Release Checklist

- Validate behavior from `index.html` + `style.css` + `script.js`
- Verify JSON import is append-only
- Verify drag reorder updates question order correctly
- Generate and test a fresh `exam.html`

