# MCQ Admin Panel

An easy, single-file tool for creating multiple-choice quizzes in your browser and exporting them as standalone HTML or JSON.

## Table of contents
- Features
- Quick start (read first)
- Try it now (1-minute)
- Recommended workflow
- Example JSON
- File layout
- Data model (details)
- Tips & best practices
- Troubleshooting
- Contributing
- License

## Features
- Create, edit, and delete MCQs in the browser (no server required).
- Add any number of options per question and mark a single option as correct.
- Export the question bank as JSON and import it back.
- Generate a standalone `quiz.html` file that students can open offline. The exported quiz includes a timer, randomized selection, and client-side scoring.

## Quick start (read first)
1. Double-click `MCQAdminPanel.html` to open it in your browser.
2. Click `+ Add Question`.
3. Type the question text and answers.
4. Mark the correct option (radio button).
5. Click `Create Quiz File` to export a student-ready HTML, or `Export JSON` to save the question bank.

## Try it now (1-minute)
1. Open `MCQAdminPanel.html` in your browser.
2. Click `Insert Sample Qs`.
3. Click `Create Quiz File`, name it `sample_quiz.html`, and open the file to try the quiz.

## Recommended workflow
- Build: add questions and options.
- Backup: use `Export JSON` frequently while editing.
- Finalize: use `Create Quiz File` to produce a distributable HTML quiz.

## Example JSON (short)
```json
{
  "title": "Sample Quiz",
  "lang": "English",
  "questions": [
    {
      "id": "q1",
      "text": "What is 2 + 2?",
      "opts": [ {"id":"o1","text":"3"}, {"id":"o2","text":"4"} ],
      "correctId": "o2"
    }
  ]
}
```

## File layout
- `MCQAdminPanel.html` — one self-contained HTML file with editor UI and export logic.

## Data model (details)
- Top-level JSON object: `{ title, lang, questions }`.
- Question object: `{ id, text, opts, correctId }`.
- Option object: `{ id, text }`.

## Tips & best practices
- Use descriptive filenames when exporting (e.g., `algebra_grade10_quiz.html`).
- Keep `Export JSON` backups as you edit—this is the easiest way to recover from accidental deletes.
- Use `Insert Sample Qs` to learn the format quickly.

## Troubleshooting
- Export fails: ensure at least one question exists, every question has text, and each has at least one option.
- Import fails: open the JSON in a text editor and confirm it has a `questions` array of objects.

## Contributing
- This is a small single-file utility. If you want to improve it, open a PR with changes to `MCQAdminPanel.html` or add sample files/screenshots.

## License
- MIT-style: use and modify freely. No external dependencies.
