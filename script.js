
(() => {
  "use strict";

  let questions = [];
  let selectedQuestionId = null;
  let selectedQuestionIds = new Set();

  const MIN_OPTIONS = 2;
  const MAX_OPTIONS = 6;
  const PREVIEW_LEN = 100;
  const DEFAULT_EXAM_TITLE = "MCQ Examination";

  const ui = {
    app: document.getElementById("app"),
    editorPanel: document.getElementById("editorPanel"),
    backdrop: document.getElementById("panelBackdrop"),
    cards: document.getElementById("cardsContainer"),
    count: document.getElementById("questionCountLabel"),
    status: document.getElementById("statusMessage"),
    openControlsBtn: document.getElementById("openControlsBtn"),
    closeControlsBtn: document.getElementById("closeControlsBtn"),
    closeEditorBtn: document.getElementById("closeEditorBtn"),
    addQuestionBtn: document.getElementById("addQuestionBtn"),
    deleteQuestionBtn: document.getElementById("deleteQuestionBtn"),
    deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
    importJsonBtn: document.getElementById("importJsonBtn"),
    importJsonInput: document.getElementById("importJsonInput"),
    exportSelectedBtn: document.getElementById("exportSelectedBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    createExamBtn: document.getElementById("createExamBtn"),
    form: document.getElementById("editorForm"),
    questionInput: document.getElementById("questionInput"),
    optionList: document.getElementById("optionList"),
    addOptionBtn: document.getElementById("addOptionBtn"),
    cancelBtn: document.getElementById("cancelEditBtn")
  };

  const missingUi = Object.entries(ui)
    .filter((entry) => !entry[1])
    .map((entry) => entry[0]);

  if (missingUi.length > 0) {
    console.error("MCQAdminPanel bootstrap failed. Missing UI elements:", missingUi.join(", "));
    return;
  }

  const editor = {
    draft: emptyDraft(),
    snapshot: "",
    dirty: false,
    dragId: null
  };

  let statusTimer = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  function init() {
    bind();
    resetDraft();
    renderAll();
  }

  function bind() {
    ui.openControlsBtn.addEventListener("click", () => {
      if (window.innerWidth <= 1200) {
        ui.app.classList.add("controls-open");
      }
    });
    ui.closeControlsBtn.addEventListener("click", () => ui.app.classList.remove("controls-open"));
    ui.closeEditorBtn.addEventListener("click", () => closeEditor(true));
    ui.backdrop.addEventListener("click", () => {
      closeEditor(true);
      ui.app.classList.remove("controls-open");
    });

    ui.addQuestionBtn.addEventListener("click", newQuestion);
    ui.deleteQuestionBtn.addEventListener("click", deleteCurrentQuestion);
    ui.deleteSelectedBtn.addEventListener("click", deleteSelectedQuestions);
    ui.importJsonBtn.addEventListener("click", () => ui.importJsonInput.click());
    ui.importJsonInput.addEventListener("change", importJsonAppend);
    ui.exportJsonBtn.addEventListener("click", () => exportJson(questions, "questions.json"));
    ui.exportSelectedBtn.addEventListener("click", exportSelectedJson);
    ui.createExamBtn.addEventListener("click", generateExamFile);

    ui.questionInput.addEventListener("input", (event) => {
      editor.draft.question = event.target.value;
      syncDirty();
    });
    ui.questionInput.addEventListener("keydown", onQuestionInputKeydown);
    ui.addOptionBtn.addEventListener("click", addOption);
    ui.cancelBtn.addEventListener("click", cancelEdit);
    ui.form.addEventListener("submit", saveQuestion);

    ui.cards.addEventListener("click", onCardClick);
    ui.cards.addEventListener("change", onCardChange);
    ui.cards.addEventListener("dragstart", onDragStart);
    ui.cards.addEventListener("dragover", onDragOver);
    ui.cards.addEventListener("dragleave", onDragLeave);
    ui.cards.addEventListener("drop", onDrop);
    ui.cards.addEventListener("dragend", clearDragState);

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1200) {
        ui.app.classList.remove("controls-open");
      }
    });

    window.addEventListener("beforeunload", (event) => {
      if (!editor.dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function emptyDraft() {
    return { question: "", options: ["", "", "", ""], correctIndex: 0 };
  }

  function resetDraft() {
    editor.draft = emptyDraft();
    editor.snapshot = JSON.stringify(editor.draft);
    editor.dirty = false;
    renderEditor();
  }

  function syncDirty() {
    editor.dirty = JSON.stringify(editor.draft) !== editor.snapshot;
  }

  function confirmDiscard() {
    if (!editor.dirty) {
      return true;
    }
    return window.confirm("You have unsaved changes. Discard them?");
  }

  function openEditor() {
    ui.app.classList.remove("controls-open");
    ui.app.classList.add("editor-open");
    ui.editorPanel.setAttribute("aria-hidden", "false");
  }

  function closeEditor(checkDirty) {
    if (checkDirty && !confirmDiscard()) {
      return false;
    }
    ui.app.classList.remove("editor-open");
    ui.editorPanel.setAttribute("aria-hidden", "true");
    return true;
  }

  function newQuestion() {
    if (!confirmDiscard()) {
      return;
    }
    selectedQuestionId = null;
    resetDraft();
    openEditor();
    status("New question draft opened.");
  }

  function editQuestion(questionId) {
    const question = questions.find((item) => item.id === questionId);
    if (!question) {
      status("Question not found.", "error");
      return;
    }
    if (!confirmDiscard()) {
      return;
    }
    selectedQuestionId = questionId;
    editor.draft = {
      question: question.question,
      options: [...question.options],
      correctIndex: question.correctIndex
    };
    editor.snapshot = JSON.stringify(editor.draft);
    editor.dirty = false;
    renderEditor();
    openEditor();
  }

  function renderEditor() {
    ui.questionInput.value = editor.draft.question;
    ui.optionList.innerHTML = "";

    editor.draft.options.forEach((optionText, index) => {
      const row = document.createElement("div");
      row.className = "option-row";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "correctOption";
      radio.checked = editor.draft.correctIndex === index;
      radio.addEventListener("change", () => {
        editor.draft.correctIndex = index;
        syncDirty();
      });

      const input = document.createElement("textarea");
      input.rows = 1;
      input.className = "option-textarea";
      input.placeholder = "Option " + String.fromCharCode(65 + index);
      input.value = optionText;
      input.dataset.optionIndex = String(index);
      input.addEventListener("input", (event) => {
        autoResizeTextarea(event.target);
        editor.draft.options[index] = event.target.value;
        syncDirty();
      });
      input.addEventListener("keydown", onOptionInputKeydown);
      autoResizeTextarea(input);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "option-delete-btn";
      del.textContent = "Delete";
      del.disabled = editor.draft.options.length <= MIN_OPTIONS;
      del.addEventListener("click", () => removeOption(index));

      row.append(radio, input, del);
      ui.optionList.appendChild(row);
    });
  }

  function addOption() {
    if (editor.draft.options.length >= MAX_OPTIONS) {
      status("Maximum 6 options allowed.", "error");
      return;
    }
    editor.draft.options.push("");
    renderEditor();
    syncDirty();
  }

  function onQuestionInputKeydown(event) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    const optionInputs = getOptionInputs();
    if (optionInputs.length === 0) {
      return;
    }

    if (event.key === "ArrowUp" && isCaretAtFirstLine(ui.questionInput)) {
      event.preventDefault();
      focusOptionInput(optionInputs.length - 1, "end");
      return;
    }

    if (event.key === "ArrowDown" && isCaretAtLastLine(ui.questionInput)) {
      event.preventDefault();
      focusOptionInput(0, "start");
    }
  }

  function onOptionInputKeydown(event) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    const optionInput = event.currentTarget;
    const optionIndex = Number.parseInt(optionInput.dataset.optionIndex || "", 10);
    if (!Number.isInteger(optionIndex)) {
      return;
    }

    const optionInputs = getOptionInputs();
    if (optionInputs.length === 0) {
      return;
    }

    if (event.key === "ArrowUp") {
      if (isCaretAtFirstLine(optionInput)) {
        event.preventDefault();
        if (optionIndex > 0) {
          focusOptionInput(optionIndex - 1, "end");
        } else {
          focusQuestionInput("end");
        }
      }
      return;
    }

    if (isCaretAtLastLine(optionInput)) {
      event.preventDefault();
      if (optionIndex < optionInputs.length - 1) {
        focusOptionInput(optionIndex + 1, "start");
      } else {
        focusQuestionInput("start");
      }
    }
  }

  function getOptionInputs() {
    return Array.from(ui.optionList.querySelectorAll("textarea[data-option-index]"));
  }

  function focusOptionInput(index, caret) {
    const optionInputs = getOptionInputs();
    const input = optionInputs[index];
    if (!input) {
      return;
    }
    input.focus();
    const position = caret === "end" ? input.value.length : 0;
    input.setSelectionRange(position, position);
  }

  function autoResizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(40, textarea.scrollHeight) + "px";
  }

  function focusQuestionInput(caret) {
    ui.questionInput.focus();
    const position = caret === "end" ? ui.questionInput.value.length : 0;
    ui.questionInput.setSelectionRange(position, position);
  }

  function isCaretAtFirstLine(textarea) {
    const cursor = textarea.selectionStart || 0;
    if (cursor === 0) {
      return true;
    }
    return textarea.value.slice(0, cursor).lastIndexOf("\n") === -1;
  }

  function isCaretAtLastLine(textarea) {
    const cursor = textarea.selectionStart || 0;
    if (cursor >= textarea.value.length) {
      return true;
    }
    return textarea.value.indexOf("\n", cursor) === -1;
  }

  function removeOption(index) {
    if (editor.draft.options.length <= MIN_OPTIONS) {
      status("At least 2 options are required.", "error");
      return;
    }
    editor.draft.options.splice(index, 1);
    if (editor.draft.correctIndex > index) {
      editor.draft.correctIndex -= 1;
    } else if (editor.draft.correctIndex === index) {
      editor.draft.correctIndex = 0;
    }
    renderEditor();
    syncDirty();
  }

  function cancelEdit() {
    if (!confirmDiscard()) {
      return;
    }
    if (selectedQuestionId) {
      const current = questions.find((item) => item.id === selectedQuestionId);
      if (current) {
        editor.draft = {
          question: current.question,
          options: [...current.options],
          correctIndex: current.correctIndex
        };
      } else {
        selectedQuestionId = null;
        editor.draft = emptyDraft();
      }
    } else {
      editor.draft = emptyDraft();
    }
    editor.snapshot = JSON.stringify(editor.draft);
    editor.dirty = false;
    renderEditor();
    closeEditor(false);
  }

  function validateDraft() {
    const question = editor.draft.question.trim();
    const options = editor.draft.options.map((option) => option.trim());

    if (!question) {
      return { ok: false, message: "Question text is required." };
    }
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      return { ok: false, message: "Options must be between 2 and 6." };
    }
    if (options.some((option) => !option)) {
      return { ok: false, message: "All option fields are required." };
    }
    if (!Number.isInteger(editor.draft.correctIndex) || editor.draft.correctIndex < 0 || editor.draft.correctIndex >= options.length) {
      return { ok: false, message: "Select exactly one correct answer." };
    }

    return {
      ok: true,
      payload: {
        question,
        options,
        correctIndex: editor.draft.correctIndex
      }
    };
  }

  function saveQuestion(event) {
    event.preventDefault();
    const result = validateDraft();
    if (!result.ok) {
      status(result.message, "error");
      return;
    }

    if (selectedQuestionId) {
      const index = questions.findIndex((item) => item.id === selectedQuestionId);
      if (index >= 0) {
        questions[index] = { ...questions[index], ...result.payload };
      } else {
        selectedQuestionId = null;
      }
    }

    if (!selectedQuestionId) {
      const created = { id: uid(), ...result.payload };
      questions.push(created);
      selectedQuestionId = created.id;
    }

    const current = questions.find((item) => item.id === selectedQuestionId);
    if (current) {
      editor.draft = {
        question: current.question,
        options: [...current.options],
        correctIndex: current.correctIndex
      };
      editor.snapshot = JSON.stringify(editor.draft);
      editor.dirty = false;
    }

    renderAll();
    closeEditor(false);
    status("Question saved.", "success");
  }

  function uid() {
    return "q_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function renderAll() {
    renderCards();
    ui.count.textContent = questions.length + (questions.length === 1 ? " question" : " questions");
  }

  function renderCards() {
    ui.cards.innerHTML = "";
    if (questions.length === 0) {
      const empty = document.createElement("article");
      empty.className = "empty-card";
      empty.innerHTML = "<h3>No questions yet</h3><p>Use System Controls to add your first question.</p>";
      ui.cards.appendChild(empty);
      return;
    }

    questions.forEach((question, index) => {
      const card = document.createElement("article");
      card.className = "question-card" + (selectedQuestionIds.has(question.id) ? " selected" : "");
      card.dataset.id = question.id;
      card.draggable = true;

      const head = document.createElement("div");
      head.className = "card-head";

      const label = document.createElement("label");
      label.className = "card-select";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "card-select-input";
      checkbox.dataset.id = question.id;
      checkbox.checked = selectedQuestionIds.has(question.id);
      const order = document.createElement("span");
      order.textContent = "#" + (index + 1);
      label.append(checkbox, order);

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "card-edit-btn";
      edit.dataset.action = "edit";
      edit.dataset.id = question.id;
      edit.textContent = "Edit";

      const preview = document.createElement("p");
      preview.className = "card-preview";
      preview.textContent = truncate(question.question, PREVIEW_LEN);

      const meta = document.createElement("p");
      meta.className = "card-meta";
      meta.textContent = question.options.length + " options";

      const optionsList = document.createElement("ul");
      optionsList.className = "card-options";
      question.options.forEach((option, optionIndex) => {
        const optionItem = document.createElement("li");
        optionItem.className = "card-option";
        optionItem.textContent = String.fromCharCode(65 + optionIndex) + ". " + option;
        optionsList.appendChild(optionItem);
      });

      head.append(label, edit);
      card.append(head, preview, meta, optionsList);
      ui.cards.appendChild(card);
    });
  }

  function truncate(text, length) {
    if (text.length <= length) {
      return text;
    }
    return text.slice(0, length).trimEnd() + "...";
  }

  function onCardClick(event) {
    const editBtn = event.target.closest("[data-action='edit']");
    if (editBtn) {
      editQuestion(editBtn.dataset.id);
    }
  }

  function onCardChange(event) {
    const input = event.target.closest(".card-select-input");
    if (!input) {
      return;
    }
    if (input.checked) {
      selectedQuestionIds.add(input.dataset.id);
    } else {
      selectedQuestionIds.delete(input.dataset.id);
    }
    renderCards();
  }

  function onDragStart(event) {
    const card = event.target.closest(".question-card");
    if (!card) {
      return;
    }
    editor.dragId = card.dataset.id;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(event) {
    const card = event.target.closest(".question-card");
    if (!card || !editor.dragId) {
      return;
    }
    event.preventDefault();
    if (card.dataset.id !== editor.dragId) {
      card.classList.add("drop-target");
    }
  }

  function onDragLeave(event) {
    const card = event.target.closest(".question-card");
    if (card) {
      card.classList.remove("drop-target");
    }
  }

  function onDrop(event) {
    event.preventDefault();
    const card = event.target.closest(".question-card");
    if (!card || !editor.dragId) {
      return;
    }
    reorder(editor.dragId, card.dataset.id);
    clearDragState();
    renderAll();
  }

  function clearDragState() {
    editor.dragId = null;
    ui.cards.querySelectorAll(".question-card").forEach((card) => {
      card.classList.remove("dragging", "drop-target");
    });
  }

  function reorder(fromId, toId) {
    if (!fromId || !toId || fromId === toId) {
      return;
    }
    const from = questions.findIndex((item) => item.id === fromId);
    const to = questions.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0 || from === to) {
      return;
    }
    const [moved] = questions.splice(from, 1);
    const insertAt = from < to ? to : to + 1;
    questions.splice(insertAt, 0, moved);
    status("Question order updated.", "success");
  }

  function deleteCurrentQuestion() {
    if (!selectedQuestionId) {
      status("No currently edited question selected.", "error");
      return;
    }
    const exists = questions.some((item) => item.id === selectedQuestionId);
    if (!exists) {
      selectedQuestionId = null;
      status("Selected question not found.", "error");
      return;
    }
    if (!window.confirm("Delete currently edited question?")) {
      return;
    }
    questions = questions.filter((item) => item.id !== selectedQuestionId);
    selectedQuestionIds.delete(selectedQuestionId);
    selectedQuestionId = null;
    resetDraft();
    closeEditor(false);
    renderAll();
    status("Question deleted.", "success");
  }

  function deleteSelectedQuestions() {
    if (selectedQuestionIds.size === 0) {
      status("No selected questions to delete.", "error");
      return;
    }
    const count = selectedQuestionIds.size;
    if (!window.confirm("Delete " + count + " selected question(s)?")) {
      return;
    }
    questions = questions.filter((item) => !selectedQuestionIds.has(item.id));
    if (selectedQuestionId && selectedQuestionIds.has(selectedQuestionId)) {
      selectedQuestionId = null;
      resetDraft();
      closeEditor(false);
    }
    selectedQuestionIds = new Set();
    renderAll();
    status("Selected questions deleted.", "success");
  }

  function importJsonAppend(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const imported = normalizeImportPayload(payload);
        if (imported.length === 0) {
          status("No valid questions found in JSON.", "error");
          return;
        }
        questions = [...questions, ...imported];
        renderAll();
        status(imported.length + " question(s) appended from JSON.", "success");
      } catch {
        status("Invalid JSON file.", "error");
      }
    };
    reader.onerror = () => status("Could not read file.", "error");
    reader.readAsText(file);
    event.target.value = "";
  }

  function normalizeImportPayload(payload) {
    const list = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.questions)
        ? payload.questions
        : [];

    return list.map(normalizeImportItem).filter((item) => item !== null);
  }

  function normalizeImportItem(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const questionRaw = typeof item.question === "string"
      ? item.question
      : typeof item.text === "string"
        ? item.text
        : "";
    const question = questionRaw.trim();
    if (!question || !Array.isArray(item.options)) {
      return null;
    }

    const options = item.options
      .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
      .filter((opt) => opt.length > 0);
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
      return null;
    }

    let correctIndex = Number.isInteger(item.correctIndex)
      ? item.correctIndex
      : Number.isInteger(item.answerIndex)
        ? item.answerIndex
        : -1;
    if (correctIndex < 0 && typeof item.correctAnswer === "string") {
      correctIndex = options.indexOf(item.correctAnswer.trim());
    }
    if (correctIndex < 0 || correctIndex >= options.length) {
      return null;
    }

    return {
      id: uid(),
      question,
      options,
      correctIndex
    };
  }

  function exportSelectedJson() {
    const selected = questions.filter((item) => selectedQuestionIds.has(item.id));
    if (selected.length === 0) {
      status("No selected questions for export.", "error");
      return;
    }
    exportJson(selected, "selected-questions.json");
  }

  function exportJson(list, fileName) {
    if (list.length === 0) {
      status("No questions available for export.", "error");
      return;
    }
    const output = list.map((item) => ({
      id: item.id,
      question: item.question,
      options: [...item.options],
      correctIndex: item.correctIndex
    }));
    download(fileName, JSON.stringify(output, null, 2), "application/json");
    status("JSON export created.", "success");
  }

  function generateExamFile() {
    if (questions.length === 0) {
      status("Add questions before creating exam file.", "error");
      return;
    }
    const enteredTitle = window.prompt("Enter exam title", DEFAULT_EXAM_TITLE);
    if (enteredTitle === null) {
      return;
    }
    const examTitle = enteredTitle.trim() || DEFAULT_EXAM_TITLE;
    const examData = questions.map((item) => ({
      id: item.id,
      question: item.question,
      options: [...item.options],
      correctIndex: item.correctIndex
    }));
    const html = buildExamHtml(examTitle, examData);
    download("exam.html", html, "text/html");
    status("Standalone exam.html generated.", "success");
  }

  function download(fileName, content, mime) {
    const blob = new Blob([content], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function status(message, type = "info") {
    if (statusTimer) {
      clearTimeout(statusTimer);
    }
    ui.status.textContent = message;
    ui.status.dataset.type = type;
    statusTimer = setTimeout(() => {
      ui.status.textContent = "";
      ui.status.dataset.type = "info";
    }, 4000);
  }

  function buildExamHtml(examTitle, questionSet) {
    const safeTitle = JSON.stringify(examTitle);
    const safeData = JSON.stringify(questionSet).replace(/</g, "\\u003c");
    const scriptOpenTag = "<scr" + "ipt>";
    const scriptCloseTag = "</scr" + "ipt>";
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${examTitle.replace(/</g, "&lt;")}</title>
  <style>
    :root{--bg:#f3f6fb;--surface:#fff;--soft:#f8faff;--text:#172033;--muted:#5b6880;--border:#d7e0ee;--primary:#1d4ed8;--primaryStrong:#1e40af;--ok:#0f766e;--bad:#b42318;--radius:14px;--shadow:0 12px 28px rgba(15,23,42,.1);--speed:300ms ease}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;color:var(--text);font-family:"Segoe UI","SF Pro Text",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;background:radial-gradient(circle at top right,rgba(29,78,216,.12),transparent 35%),radial-gradient(circle at bottom left,rgba(15,118,110,.1),transparent 40%),var(--bg)}
    .root{max-width:980px;margin:0 auto;padding:20px 14px 28px}
    .screen{display:none;animation:fade .22s ease}
    .screen.active{display:block}
    @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .panel{border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow);padding:18px}
    .panel h1,.panel h2,.panel h3{margin-top:0}
    .panel p{color:var(--muted);line-height:1.45}
    .grid{display:grid;gap:14px}
    .field{display:grid;gap:8px}
    label{font-size:.92rem;font-weight:700;color:var(--muted)}
    input[type="number"]{width:100%;border:1px solid var(--border);border-radius:10px;padding:.62rem .72rem;font-size:1rem}
    .check{display:flex;align-items:center;gap:8px;color:var(--text);font-weight:600}
    .btn{border:0;border-radius:10px;padding:.72rem 1rem;font-size:.98rem;font-weight:700;cursor:pointer;transition:transform var(--speed),box-shadow var(--speed),background-color var(--speed)}
    .btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.14)}
    .primary{color:#fff;background:var(--primary)}
    .primary:hover{background:var(--primaryStrong)}
    .secondary{color:var(--text);background:#eaf0fb;border:1px solid var(--border)}
    .error{min-height:22px;margin:8px 0 0;color:var(--bad);font-weight:700}
    .timer{position:sticky;top:8px;z-index:20;margin-bottom:12px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;box-shadow:0 10px 20px rgba(15,23,42,.1)}
    .timer h2{margin:0;font-size:1.02rem}
    .timer p{margin:4px 0 0;font-size:.86rem}
    .timerValue{min-width:88px;text-align:right;font-weight:800;font-size:1.35rem;color:var(--primary)}
    .timerValue.warn{color:var(--bad)}
    .list{display:grid;gap:12px;margin-bottom:16px}
    .card{border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:0 8px 20px rgba(15,23,42,.08);padding:14px}
    .card h3{margin:0 0 10px;font-size:1rem;line-height:1.35}
    .opts{display:grid;gap:8px}
    .opt{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:10px;background:var(--soft);padding:.62rem .68rem;cursor:pointer;transition:border-color var(--speed),background-color var(--speed)}
    .opt:hover{border-color:rgba(29,78,216,.45);background:rgba(29,78,216,.08)}
    .opt input{width:18px;height:18px;margin:0}
    .submit{display:flex;justify-content:flex-end}
    .scores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
    .score{border:1px solid var(--border);border-radius:12px;background:var(--soft);padding:12px}
    .score h3{margin:0 0 6px;color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}
    .score p{margin:0;color:var(--text);font-size:1.2rem;font-weight:800}
    .note{margin:0 0 12px;color:var(--muted);font-weight:600}
    .review{display:grid;gap:10px;margin-top:14px}
    .review.hidden{display:none}
    .reviewCard{border:1px solid var(--border);border-radius:12px;background:#fff;padding:12px}
    .reviewCard.good{border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.12)}
    .reviewCard.bad{border-color:rgba(180,35,24,.45);background:rgba(180,35,24,.12)}
    .reviewCard h3{margin:0 0 8px;font-size:.98rem}
    .reviewStatus{margin:0 0 10px;font-size:.84rem;font-weight:700}
    .reviewOpts{list-style:none;margin:0;padding:0;display:grid;gap:6px}
    .reviewOpts li{border:1px solid var(--border);border-radius:8px;background:#fff;padding:.5rem .62rem;font-size:.9rem}
    .reviewOpts li.correct{border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.12);font-weight:700}
    .reviewOpts li.incorrect{border-color:rgba(180,35,24,.45);background:rgba(180,35,24,.12);font-weight:700}
    @media(max-width:860px){.root{padding:12px}.scores{grid-template-columns:1fr}.panel{padding:14px}}
    @media(max-width:620px){.timer{top:0;margin-left:-12px;margin-right:-12px;border-radius:0;padding-left:12px;padding-right:12px}.btn{width:100%}.submit{justify-content:stretch}.opt{padding-top:.72rem;padding-bottom:.72rem}}
  </style>
</head>
<body>
  <div class="root">
    <section class="screen active" id="setup">
      <article class="panel">
        <h1 id="setupTitle"></h1>
        <p>Total available questions: <strong id="setupTotal"></strong></p>
        <div class="grid">
          <div class="field">
            <label for="questionCount">How many questions do you want to attempt?</label>
            <input type="number" id="questionCount" min="1">
          </div>
          <label class="check"><input type="checkbox" id="shuffleQuestions">Shuffle Questions</label>
          <label class="check"><input type="checkbox" id="shuffleOptions">Shuffle Options</label>
          <div class="field">
            <label for="timeLimit">Time limit (minutes)</label>
            <input type="number" id="timeLimit" min="1" value="30">
          </div>
          <button type="button" class="btn primary" id="startBtn">Start Exam</button>
        </div>
        <p class="error" id="setupError"></p>
      </article>
    </section>
    <section class="screen" id="exam">
      <div class="timer">
        <div>
          <h2 id="activeTitle"></h2>
          <p id="progress"></p>
        </div>
        <div class="timerValue" id="timerValue">00:00</div>
      </div>
      <form id="examForm">
        <div class="list" id="questionList"></div>
        <div class="submit">
          <button type="button" class="btn primary" id="submitBtn">Submit Exam</button>
        </div>
      </form>
    </section>
    <section class="screen" id="result">
      <article class="panel">
        <h2>Result Summary</h2>
        <div class="scores">
          <div class="score"><h3>Score</h3><p id="scoreLabel">0/0</p></div>
          <div class="score"><h3>Percentage</h3><p id="percentLabel">0%</p></div>
          <div class="score"><h3>Time Taken</h3><p id="timeLabel">00:00</p></div>
        </div>
        <p class="note" id="resultNote"></p>
        <button type="button" class="btn secondary" id="toggleReview">Show Correct Answers</button>
        <div class="review hidden" id="review"></div>
      </article>
    </section>
  </div>
  ${scriptOpenTag}
    (() => {
      "use strict";
      const examTitle = ${safeTitle};
      const examData = ${safeData};
      let selectedQuestions = [];
      let userAnswers = {};
      let timerInterval = null;
      let totalSeconds = 0;
      let remainingSeconds = 0;
      let startedAt = 0;
      let endedAt = 0;
      let submitted = false;
      let reviewVisible = false;

      const ui = {
        setup: document.getElementById("setup"),
        exam: document.getElementById("exam"),
        result: document.getElementById("result"),
        setupTitle: document.getElementById("setupTitle"),
        setupTotal: document.getElementById("setupTotal"),
        questionCount: document.getElementById("questionCount"),
        shuffleQuestions: document.getElementById("shuffleQuestions"),
        shuffleOptions: document.getElementById("shuffleOptions"),
        timeLimit: document.getElementById("timeLimit"),
        startBtn: document.getElementById("startBtn"),
        setupError: document.getElementById("setupError"),
        activeTitle: document.getElementById("activeTitle"),
        progress: document.getElementById("progress"),
        timerValue: document.getElementById("timerValue"),
        questionList: document.getElementById("questionList"),
        submitBtn: document.getElementById("submitBtn"),
        scoreLabel: document.getElementById("scoreLabel"),
        percentLabel: document.getElementById("percentLabel"),
        timeLabel: document.getElementById("timeLabel"),
        resultNote: document.getElementById("resultNote"),
        toggleReview: document.getElementById("toggleReview"),
        review: document.getElementById("review")
      };

      init();

      function init() {
        ui.setupTitle.textContent = examTitle || "MCQ Examination";
        ui.setupTotal.textContent = String(examData.length);
        if (examData.length > 0) {
          ui.questionCount.max = String(examData.length);
          ui.questionCount.value = String(Math.min(10, examData.length));
        } else {
          ui.startBtn.disabled = true;
          ui.questionCount.value = "0";
          ui.setupError.textContent = "No questions are embedded in this file.";
        }
        ui.startBtn.addEventListener("click", startExam);
        ui.submitBtn.addEventListener("click", manualSubmit);
        ui.toggleReview.addEventListener("click", toggleReview);
      }

      function validateSetup() {
        const requested = Number.parseInt(ui.questionCount.value, 10);
        const minutes = Number.parseInt(ui.timeLimit.value, 10);
        if (!Number.isInteger(requested) || requested < 1 || requested > examData.length) {
          return { ok: false, message: "Question count must be between 1 and " + examData.length + "." };
        }
        if (!Number.isInteger(minutes) || minutes < 1) {
          return { ok: false, message: "Time limit must be at least 1 minute." };
        }
        return { ok: true, requested, minutes, shuffleQuestions: ui.shuffleQuestions.checked, shuffleOptions: ui.shuffleOptions.checked };
      }

      function startExam() {
        const setup = validateSetup();
        if (!setup.ok) {
          ui.setupError.textContent = setup.message;
          return;
        }
        ui.setupError.textContent = "";
        selectedQuestions = selectQuestions(setup.requested, setup.shuffleQuestions, setup.shuffleOptions);
        userAnswers = {};
        submitted = false;
        reviewVisible = false;
        totalSeconds = setup.minutes * 60;
        remainingSeconds = totalSeconds;
        startedAt = Date.now();
        endedAt = 0;
        renderExam();
        switchScreen("exam");
        updateTimer();
        startTimer();
      }

      function selectQuestions(count, shuffleQuestionsFlag, shuffleOptionsFlag) {
        const base = examData.map((question, index) => ({
          id: question.id || "q_" + (index + 1),
          question: question.question,
          options: Array.isArray(question.options) ? question.options.slice() : [],
          correctIndex: question.correctIndex
        }));
        const ordered = shuffleQuestionsFlag ? shuffle(base) : base.slice();
        const picked = ordered.slice(0, count);
        return shuffleOptionsFlag ? picked.map(shuffleQuestionOptions) : picked;
      }

      function shuffle(input) {
        const arr = input.slice();
        for (let i = arr.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        return arr;
      }

      function shuffleQuestionOptions(question) {
        const pairs = question.options.map((option, index) => ({ option, correct: index === question.correctIndex }));
        const shuffled = shuffle(pairs);
        const options = [];
        let correctIndex = 0;
        shuffled.forEach((pair, index) => {
          options.push(pair.option);
          if (pair.correct) {
            correctIndex = index;
          }
        });
        return {
          id: question.id,
          question: question.question,
          options,
          correctIndex
        };
      }

      function renderExam() {
        ui.activeTitle.textContent = examTitle || "MCQ Examination";
        ui.progress.textContent = "Questions: " + selectedQuestions.length;
        ui.questionList.innerHTML = "";
        selectedQuestions.forEach((question, qIndex) => {
          const card = document.createElement("article");
          card.className = "card";
          const title = document.createElement("h3");
          title.textContent = (qIndex + 1) + ". " + question.question;
          const opts = document.createElement("div");
          opts.className = "opts";
          question.options.forEach((optionText, oIndex) => {
            const label = document.createElement("label");
            label.className = "opt";
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "question-" + qIndex;
            input.checked = userAnswers[qIndex] === oIndex;
            input.addEventListener("change", () => { userAnswers[qIndex] = oIndex; });
            const span = document.createElement("span");
            span.textContent = optionText;
            label.append(input, span);
            opts.appendChild(label);
          });
          card.append(title, opts);
          ui.questionList.appendChild(card);
        });
      }

      function startTimer() {
        stopTimer();
        timerInterval = window.setInterval(() => {
          remainingSeconds -= 1;
          if (remainingSeconds <= 0) {
            remainingSeconds = 0;
            updateTimer();
            submitExam("auto");
            return;
          }
          updateTimer();
        }, 1000);
      }

      function stopTimer() {
        if (timerInterval !== null) {
          window.clearInterval(timerInterval);
          timerInterval = null;
        }
      }

      function updateTimer() {
        ui.timerValue.textContent = formatTime(remainingSeconds);
        ui.timerValue.classList.toggle("warn", remainingSeconds <= 60);
      }

      function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return String(min).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
      }

      function manualSubmit() {
        if (submitted) {
          return;
        }
        if (!window.confirm("Submit exam now?")) {
          return;
        }
        submitExam("manual");
      }

      function submitExam(mode) {
        if (submitted) {
          return;
        }
        submitted = true;
        stopTimer();
        endedAt = Date.now();
        const result = evaluate();
        renderResult(result, mode);
        switchScreen("result");
      }

      function evaluate() {
        let correctCount = 0;
        const details = selectedQuestions.map((question, index) => {
          const answer = Object.prototype.hasOwnProperty.call(userAnswers, index) ? userAnswers[index] : null;
          const isCorrect = answer === question.correctIndex;
          if (isCorrect) {
            correctCount += 1;
          }
          return {
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            answer,
            isCorrect
          };
        });
        const total = selectedQuestions.length;
        const percent = total === 0 ? 0 : (correctCount / total) * 100;
        const elapsed = Math.min(totalSeconds, Math.max(0, Math.round((endedAt - startedAt) / 1000)));
        return { correctCount, total, percent, elapsed, details };
      }

      function renderResult(result, mode) {
        ui.scoreLabel.textContent = result.correctCount + "/" + result.total;
        ui.percentLabel.textContent = result.percent.toFixed(1) + "%";
        ui.timeLabel.textContent = formatTime(result.elapsed);
        ui.resultNote.textContent = mode === "auto" ? "Auto-submitted because timer reached zero." : "Submitted manually.";
        renderReview(result.details);
        reviewVisible = false;
        ui.review.classList.add("hidden");
        ui.toggleReview.textContent = "Show Correct Answers";
      }

      function renderReview(details) {
        ui.review.innerHTML = "";
        details.forEach((item, index) => {
          const card = document.createElement("article");
          card.className = "reviewCard " + (item.isCorrect ? "good" : "bad");
          const title = document.createElement("h3");
          title.textContent = (index + 1) + ". " + item.question;
          const status = document.createElement("p");
          status.className = "reviewStatus";
          status.textContent = item.answer === null ? "Not answered" : item.isCorrect ? "Correct" : "Incorrect";
          const list = document.createElement("ul");
          list.className = "reviewOpts";
          item.options.forEach((optionText, optionIndex) => {
            const li = document.createElement("li");
            li.textContent = optionText;
            if (optionIndex === item.correctIndex) {
              li.classList.add("correct");
            }
            if (item.answer === optionIndex && optionIndex !== item.correctIndex) {
              li.classList.add("incorrect");
            }
            list.appendChild(li);
          });
          card.append(title, status, list);
          ui.review.appendChild(card);
        });
      }

      function toggleReview() {
        reviewVisible = !reviewVisible;
        ui.review.classList.toggle("hidden", !reviewVisible);
        ui.toggleReview.textContent = reviewVisible ? "Hide Correct Answers" : "Show Correct Answers";
      }

      function switchScreen(name) {
        ui.setup.classList.remove("active");
        ui.exam.classList.remove("active");
        ui.result.classList.remove("active");
        if (name === "setup") {
          ui.setup.classList.add("active");
        } else if (name === "exam") {
          ui.exam.classList.add("active");
        } else {
          ui.result.classList.add("active");
        }
      }
    })();
  ${scriptCloseTag}
</body>
</html>`;
  }
})();
