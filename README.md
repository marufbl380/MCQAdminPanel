# MCQAdminPanel v2.1

Professional client-side MCQ authoring and exam delivery system built with:

- HTML5
- CSS3
- Vanilla JavaScript
- JSON-based data portability
- No backend, no framework, no jQuery

---

## Overview

MCQAdminPanel v2.1 is a complete CBT-style workflow in two parts:

1. **Admin Panel** (`index.html`)
2. **Generated Standalone Exam File** (`exam.html`, created from admin)

The admin panel is used to create, edit, organize, validate, and export questions.  
The generated exam file runs independently with setup, timed attempt, and result review.

---

## Canonical Project Files

Primary source files:

- `index.html`
- `style.css`
- `script.js`

Portable single-file artifact:

- `MCQAdminPanel.base64.html`

For development and maintenance, use the 3-file source set as canonical.

---

## Admin Panel (index.html)

### 3-Container Architecture

1. **Main Container (Question Cards)**
2. **Left Sliding Panel (Question Editor)**
3. **Right Control Panel (System Controls)**

### Main Container

- Displays question cards only
- Card content includes:
  - Question preview
  - Option count
  - Selection checkbox
  - Edit action
- Supports:
  - Multi-select
  - Drag-and-drop reorder
  - Visual selected/duplicate states

### Left Panel: Question Editor

- Opens for create/edit operations
- Contains:
  - Question field
  - Option list (min 2, max 6)
  - Correct answer selector (exactly 1)
  - Sticky option toolbar (`Add Option`, `Move Up`, `Move Down`)
  - Save / Cancel actions
- Includes unsaved-change protection
- Supports multiline option editing
- Supports keyboard navigation and editing shortcuts

### Math Authoring System

- Structures + Symbols navigation inside editor
- Math search input
- Insert templates/snippets into question or option cursor position
- Math preview with MathJax rendering
- Works in generated exam file as well

### Right Panel: System Controls

Core actions:

- Add Question
- Delete Question
- Delete Selected Questions
- Import JSON File (append-only)
- Export Selected to JSON
- Export JSON File
- Create Exam File

Extended utilities:

- Clone Selected
- Shuffle Selected
- Assign Tag to Selected
- Export Answer Key JSON
- Print Questions
- Print Answer Key
- Open Test Harness

### Additional Admin Features

- Theme toggle (Light/Dark)
- High-contrast mode
- Keyboard shortcuts modal
- Status log panel
- Question search and filtering:
  - Text query
  - Topic
  - Difficulty
  - Duplicates only
- Stats cards
- Undo/Redo history
- Auto-persisted local state

---

## Data Model

Question object:

```json
{
  "id": "unique-id",
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "topic": "Algebra",
  "difficulty": "medium",
  "marks": 1,
  "tags": ["chapter-1", "mcq"],
  "explanation": "Optional explanation"
}
```

---

## Import / Export Rules

### Import JSON

- Accepts:
  - Array format
  - `{ "questions": [...] }` format
- **Append-only behavior** (never wipes existing data)
- Imported records are normalized
- New unique IDs are generated for imported entries
- Invalid rows are rejected and reported

### Export JSON

- Full export: current question order preserved
- Selected export: only selected question cards, order preserved
- Answer-key export also available

---

## Exam Generation and Runtime

Click `Create Exam File` in admin to generate a standalone `exam.html`.

Generated exam includes embedded question payload:

- No dependency on admin page
- No dependency on localStorage from admin

### Exam Screen Flow

1. **Setup Screen**
   - Exam title
   - Total available questions
   - Requested question count
   - Shuffle questions toggle
   - Shuffle options toggle
   - Time limit (minutes)
   - Validation before start

2. **Exam Screen**
   - Selected questions rendered responsively
   - Visible timer
   - One-answer-per-question radio selection
   - Manual submit confirmation
   - Auto-submit when timer reaches zero

3. **Result Screen**
   - Score
   - Percentage
   - Time taken
   - Correct/incorrect highlighting
   - Toggleable answer review

### Exam Config / Security Options

From admin controls:

- Presets (`quick`, `school`, `mock`)
- Fullscreen on start (optional)
- Navigation warning tracking (optional)
- Attempt token generation (optional)
- Preflight validation before file generation

---

## Responsive Behavior

- **Desktop**: full 3-section workflow, sliding editor, persistent controls panel
- **Tablet**: panel overlay behavior
- **Mobile**:
  - Full-screen left editor
  - Controls panel opened via controls button
  - Controls panel fixed near bottom-right flow

---

## Keyboard Shortcuts (Default)

- `Ctrl + N` -> Add Question
- `Ctrl + S` -> Save Question
- `Ctrl + Z` -> Undo
- `Ctrl + Y` -> Redo
- `Ctrl + .` -> Toggle controls panel (compact layouts)
- `Shift + ?` -> Open shortcuts modal
- `Ctrl + K` -> Focus math search (editor open)

---

## Run Locally

No installation is required.

1. Open `index.html` in a browser.
2. Build/import question bank.
3. Click `Create Exam File`.
4. Open downloaded `exam.html` and run the test flow.

---

## Recommended QA Checklist

Before release/distribution:

1. Validate question save rules (2-6 options, one correct answer).
2. Validate import is append-only.
3. Validate drag reorder updates actual exported order.
4. Validate math renders in admin preview and generated exam.
5. Validate exam setup, timer, submit, and results flow.
6. Validate mobile controls and panel behavior.
