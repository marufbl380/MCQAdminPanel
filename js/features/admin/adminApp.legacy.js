
(() => {
  "use strict";

  let questions = [];
  let selectedQuestionId = null;
  let selectedQuestionIds = new Set();
  let editorFloatActive = null; // "question" | "optionEdit"
  const floatQuestionState = {
    baseline: "",
    staged: "",
    returnParent: null,
    returnNextSibling: null,
    preSnapshot: "",
    preDirty: false,
    preSaveState: null
  };
  const floatOptionEditState = {
    optionIndex: -1,
    baseline: "",
    staged: "",
    returnParent: null,
    returnNextSibling: null,
    preSnapshot: "",
    preDirty: false,
    preSaveState: null
  };
  const optionMathHoldState = {
    pointerId: null,
    holdTimer: null,
    active: false,
    lastClientX: 0,
    lastClientY: 0
  };
  const questionMathHoldState = {
    pointerId: null,
    holdTimer: null,
    active: false,
    lastClientX: 0,
    lastClientY: 0,
    host: ""
  };

  const MIN_OPTIONS = 2;
  const MAX_OPTIONS = 6;
  const PREVIEW_LEN = 100;
  const DEFAULT_EXAM_TITLE = "MCQ Examination";
  const MATH_CURSOR_TOKEN = "__CURSOR__";
  const MATH_NEXT_1 = "__NEXT1__";
  const MATH_NEXT_2 = "__NEXT2__";
  const MATH_NEXT_3 = "__NEXT3__";
  // Set this to a vendored MathJax path if you ship a local bundle with the project.
  const LOCAL_MATHJAX_SRC = (() => {
    // `index.html` lives in project root, but `standalone/index.html` lives one level deeper.
    // Pick a relative path that works for both entry points.
    try {
      const path = (window.location && window.location.pathname) ? window.location.pathname : "";
      if (path.indexOf("/standalone/") !== -1 || path.indexOf("\\standalone\\") !== -1) {
        return "../vendor/mathjax/es5/tex-mml-chtml.js";
      }
    } catch (_e) {
      // Ignore and fall back to root-relative path.
    }
    return "./vendor/mathjax/es5/tex-mml-chtml.js";
  })();
  const CDN_MATHJAX_SRC = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
  const THEME_STORAGE_KEY = "mcq_admin_theme_v2";
  const CONTRAST_STORAGE_KEY = "mcq_admin_contrast_v1";
  const APP_STORAGE_KEY = "mcq_admin_state_v2";
  const SHORTCUTS_STORAGE_KEY = "mcq_admin_shortcuts_v1";
  const SNAPSHOT_STORAGE_KEY = "mcq_admin_snapshots_v1";
  const HISTORY_LIMIT = 120;
  const STATUS_LOG_LIMIT = 120;
  const TOAST_LIMIT = 4;
  const CURRENT_SCHEMA_VERSION = 2;
  const PREVIEW_DEBOUNCE_MS = 280;
  const TYPING_IDLE_MS = 220;
  const PERSIST_DEBOUNCE_MS = 260;
  const HISTORY_DEBOUNCE_MS = 360;

  const EXAM_PRESETS = {
    quick: { label: "Quick Quiz", maxQuestions: 10, timeMinutes: 15, shuffleQuestions: true, shuffleOptions: true },
    school: { label: "School Test", maxQuestions: 30, timeMinutes: 40, shuffleQuestions: false, shuffleOptions: false },
    mock: { label: "Full Mock", maxQuestions: 80, timeMinutes: 90, shuffleQuestions: true, shuffleOptions: true }
  };

  const DEFAULT_SHORTCUTS = {
    addQuestion: "Ctrl+N",
    saveQuestion: "Ctrl+S",
    undo: "Ctrl+Z",
    redo: "Ctrl+Y",
    commandPalette: "Ctrl+Shift+P",
    openControls: "Ctrl+.",
    openShortcuts: "?",
    searchMath: "Ctrl+K",
    importJson: "Ctrl+Alt+I",
    exportJson: "Ctrl+Alt+J",
    createExam: "Ctrl+Alt+E",
    deleteSelected: "Ctrl+Alt+X"
  };

  const MATH_STRUCTURE_GROUPS = [
    {
      title: "Core",
      items: [
        { label: "Inline", insert: "\\(" + MATH_CURSOR_TOKEN + "\\)" },
        { label: "Block", insert: "\\[" + MATH_CURSOR_TOKEN + "\\]" },
        { label: "Fraction", insert: "\\frac{" + MATH_CURSOR_TOKEN + "}{" + MATH_NEXT_1 + "}" },
        { label: "Division", insert: "\\dfrac{" + MATH_CURSOR_TOKEN + "}{" + MATH_NEXT_1 + "}" },
        { label: "Square Root", insert: "\\sqrt{" + MATH_CURSOR_TOKEN + "}" },
        { label: "Nth Root", insert: "\\sqrt[" + MATH_CURSOR_TOKEN + "]{" + MATH_NEXT_1 + "}" },
        { label: "Superscript", insert: "{" + MATH_CURSOR_TOKEN + "}^{" + MATH_NEXT_1 + "}" },
        { label: "Square", insert: "{" + MATH_CURSOR_TOKEN + "}^2" },
        { label: "Cube", insert: "{" + MATH_CURSOR_TOKEN + "}^3" },
        { label: "Subscript", insert: "{" + MATH_CURSOR_TOKEN + "}_{" + MATH_NEXT_1 + "}" },
        { label: "Absolute", insert: "\\left|" + MATH_CURSOR_TOKEN + "\\right|" },
        { label: "Parentheses", insert: "\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "Brackets", insert: "\\left[" + MATH_CURSOR_TOKEN + "\\right]" }
      ]
    },
    {
      title: "Algebra",
      items: [
        { label: "Linear Form", insert: MATH_CURSOR_TOKEN + "x + " + MATH_NEXT_1 + " = 0" },
        { label: "Quadratic", insert: MATH_CURSOR_TOKEN + "x^2 + " + MATH_NEXT_1 + "x + " + MATH_NEXT_2 + " = 0" },
        { label: "Quadratic Formula", insert: "x = \\frac{-" + MATH_CURSOR_TOKEN + " \\pm \\sqrt{" + MATH_NEXT_1 + "^2 - 4" + MATH_NEXT_2 + MATH_NEXT_3 + "}}{2" + MATH_NEXT_2 + "}" },
        { label: "Binomial", insert: "\\left(" + MATH_CURSOR_TOKEN + " + " + MATH_NEXT_1 + "\\right)^{" + MATH_NEXT_2 + "}" },
        { label: "Log", insert: "\\log_{" + MATH_CURSOR_TOKEN + "}\\left(" + MATH_NEXT_1 + "\\right)" },
        { label: "Exponential", insert: "e^{" + MATH_CURSOR_TOKEN + "}" },
        { label: "Modulus Eq", insert: "\\left|" + MATH_CURSOR_TOKEN + "\\right| = " + MATH_NEXT_1 }
      ]
    },
    {
      title: "Geometry",
      items: [
        { label: "Angle", insert: "\\angle " + MATH_CURSOR_TOKEN },
        { label: "Triangle", insert: "\\triangle " + MATH_CURSOR_TOKEN + MATH_NEXT_1 + MATH_NEXT_2 },
        { label: "Parallel", insert: MATH_CURSOR_TOKEN + " \\parallel " + MATH_NEXT_1 },
        { label: "Perpendicular", insert: MATH_CURSOR_TOKEN + " \\perp " + MATH_NEXT_1 },
        { label: "Arc", insert: "\\overset{\\frown}{" + MATH_CURSOR_TOKEN + "}" },
        { label: "Distance", insert: "\\sqrt{\\left(" + MATH_CURSOR_TOKEN + " - " + MATH_NEXT_1 + "\\right)^2 + \\left(" + MATH_NEXT_2 + " - " + MATH_NEXT_3 + "\\right)^2}" }
      ]
    },
    {
      title: "Trigonometry",
      items: [
        { label: "sin()", insert: "\\sin\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "cos()", insert: "\\cos\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "tan()", insert: "\\tan\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "cosec()", insert: "\\csc\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "sec()", insert: "\\sec\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "cot()", insert: "\\cot\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "sin^-1()", insert: "\\sin^{-1}\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "cos^-1()", insert: "\\cos^{-1}\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "tan^-1()", insert: "\\tan^{-1}\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "Trig Identity", insert: "\\sin^2\\left(" + MATH_CURSOR_TOKEN + "\\right) + \\cos^2\\left(" + MATH_NEXT_1 + "\\right) = 1" }
      ]
    },
    {
      title: "Calculus",
      items: [
        { label: "Derivative", insert: "\\frac{d}{d" + MATH_CURSOR_TOKEN + "}\\left(" + MATH_NEXT_1 + "\\right)" },
        { label: "Partial Derivative", insert: "\\frac{\\partial " + MATH_CURSOR_TOKEN + "}{\\partial " + MATH_NEXT_1 + "}" },
        { label: "Integral", insert: "\\int_{" + MATH_CURSOR_TOKEN + "}^{" + MATH_NEXT_1 + "} " + MATH_NEXT_2 + "\\, d" + MATH_NEXT_3 },
        { label: "Double Integral", insert: "\\iint_{" + MATH_CURSOR_TOKEN + "} " + MATH_NEXT_1 + "\\, d" + MATH_NEXT_2 + "\\, d" + MATH_NEXT_3 },
        { label: "Summation", insert: "\\sum_{" + MATH_CURSOR_TOKEN + "}^{" + MATH_NEXT_1 + "} " + MATH_NEXT_2 },
        { label: "Product", insert: "\\prod_{" + MATH_CURSOR_TOKEN + "}^{" + MATH_NEXT_1 + "} " + MATH_NEXT_2 },
        { label: "Limit", insert: "\\lim_{" + MATH_CURSOR_TOKEN + " \\to " + MATH_NEXT_1 + "} " + MATH_NEXT_2 }
      ]
    },
    {
      title: "Matrix / Vectors",
      items: [
        { label: "2x2 Matrix", insert: "\\begin{bmatrix} " + MATH_CURSOR_TOKEN + " & " + MATH_NEXT_1 + " \\\\ " + MATH_NEXT_2 + " & " + MATH_NEXT_3 + " \\end{bmatrix}" },
        { label: "3x3 Matrix", insert: "\\begin{bmatrix} " + MATH_CURSOR_TOKEN + " & " + MATH_NEXT_1 + " & " + MATH_NEXT_2 + " \\\\ " + MATH_NEXT_3 + " & 0 & 0 \\\\ 0 & 0 & 0 \\end{bmatrix}" },
        { label: "Determinant", insert: "\\begin{vmatrix} " + MATH_CURSOR_TOKEN + " & " + MATH_NEXT_1 + " \\\\ " + MATH_NEXT_2 + " & " + MATH_NEXT_3 + " \\end{vmatrix}" },
        { label: "Column Vector", insert: "\\begin{bmatrix} " + MATH_CURSOR_TOKEN + " \\\\ " + MATH_NEXT_1 + " \\\\ " + MATH_NEXT_2 + " \\end{bmatrix}" },
        { label: "Dot Product", insert: "\\vec{" + MATH_CURSOR_TOKEN + "} \\cdot \\vec{" + MATH_NEXT_1 + "}" },
        { label: "Cross Product", insert: "\\vec{" + MATH_CURSOR_TOKEN + "} \\times \\vec{" + MATH_NEXT_1 + "}" }
      ]
    },
    {
      title: "Probability / Stats",
      items: [
        { label: "P(A)", insert: "P\\left(" + MATH_CURSOR_TOKEN + "\\right)" },
        { label: "P(A|B)", insert: "P\\left(" + MATH_CURSOR_TOKEN + " \\mid " + MATH_NEXT_1 + "\\right)" },
        { label: "nCr", insert: "\\binom{" + MATH_CURSOR_TOKEN + "}{" + MATH_NEXT_1 + "}" },
        { label: "Mean (Sigma f_i x_i)", insert: "\\bar{x} = \\frac{1}{n}\\sum\\limits_{i=1}^{k} f_i x_i" },
        { label: "Assumed Mean", insert: "\\bar{x} = a + \\frac{\\sum f_i u_i}{n}\\times h" },
        { label: "Mean", insert: "\\bar{" + MATH_CURSOR_TOKEN + "} = \\frac{1}{" + MATH_NEXT_1 + "}\\sum " + MATH_NEXT_2 },
        { label: "Variance", insert: "\\sigma^2 = \\frac{1}{" + MATH_CURSOR_TOKEN + "}\\sum\\left(" + MATH_NEXT_1 + " - \\mu\\right)^2" },
        { label: "Std Deviation", insert: "\\sigma = \\sqrt{" + MATH_CURSOR_TOKEN + "}" }
      ]
    }
  ];

  const MATH_SYMBOL_GROUPS = [
    {
      title: "Greek",
      items: [
        { label: "\u03b1", insert: "\\alpha " },
        { label: "\u03b2", insert: "\\beta " },
        { label: "\u03b3", insert: "\\gamma " },
        { label: "\u03b8", insert: "\\theta " },
        { label: "\u03bb", insert: "\\lambda " },
        { label: "\u03c0", insert: "\\pi " },
        { label: "\u03c3", insert: "\\sigma " },
        { label: "\u03c6", insert: "\\phi " },
        { label: "\u03c9", insert: "\\omega " },
        { label: "\u0394", insert: "\\Delta " }
      ]
    },
    {
      title: "Operators",
      items: [
        { label: "\u00d7", insert: "\\times " },
        { label: "\u00f7", insert: "\\div " },
        { label: "\u00b1", insert: "\\pm " },
        { label: "\u22c5", insert: "\\cdot " },
        { label: "\u2217", insert: "\\ast " },
        { label: "\u2297", insert: "\\otimes " },
        { label: "\u2295", insert: "\\oplus " },
        { label: "\u221e", insert: "\\infty " }
      ]
    },
    {
      title: "Relations",
      items: [
        { label: "\u2260", insert: "\\neq " },
        { label: "\u2264", insert: "\\leq " },
        { label: "\u2265", insert: "\\geq " },
        { label: "\u2248", insert: "\\approx " },
        { label: "\u2261", insert: "\\equiv " },
        { label: "\u223c", insert: "\\sim " },
        { label: "\u221d", insert: "\\propto " }
      ]
    },
    {
      title: "Sets",
      items: [
        { label: "\u2208", insert: "\\in " },
        { label: "\u2209", insert: "\\notin " },
        { label: "\u2282", insert: "\\subset " },
        { label: "\u2286", insert: "\\subseteq " },
        { label: "\u222a", insert: "\\cup " },
        { label: "\u2229", insert: "\\cap " },
        { label: "\u2205", insert: "\\emptyset " },
        { label: "\u211d", insert: "\\mathbb{R} " },
        { label: "\u2115", insert: "\\mathbb{N} " },
        { label: "\u2124", insert: "\\mathbb{Z} " }
      ]
    },
    {
      title: "Logic",
      items: [
        { label: "\u2200", insert: "\\forall " },
        { label: "\u2203", insert: "\\exists " },
        { label: "\u00ac", insert: "\\neg " },
        { label: "\u2227", insert: "\\land " },
        { label: "\u2228", insert: "\\lor " },
        { label: "\u21d2", insert: "\\Rightarrow " },
        { label: "\u21d4", insert: "\\Leftrightarrow " },
        { label: "\u22a2", insert: "\\vdash " }
      ]
    },
    {
      title: "Arrows",
      items: [
        { label: "\u2192", insert: "\\to " },
        { label: "\u2190", insert: "\\leftarrow " },
        { label: "\u2194", insert: "\\leftrightarrow " },
        { label: "\u21a6", insert: "\\mapsto " },
        { label: "\u2191", insert: "\\uparrow " },
        { label: "\u2193", insert: "\\downarrow " }
      ]
    },
    {
      title: "Misc",
      items: [
        { label: "\u2202", insert: "\\partial " },
        { label: "\u2207", insert: "\\nabla " },
        { label: "\u2220", insert: "\\angle " },
        { label: "\u22a5", insert: "\\perp " },
        { label: "\u2225", insert: "\\parallel " },
        { label: "\u00b0", insert: "^{\\circ}" }
      ]
    }
  ];

  const ui = {
    app: document.getElementById("app"),
    editorPanel: document.getElementById("editorPanel"),
    backdrop: document.getElementById("panelBackdrop"),
    cards: document.getElementById("cardsContainer"),
    count: document.getElementById("questionCountLabel"),
    selectedCount: document.getElementById("selectedCountLabel"),
    status: document.getElementById("statusMessage"),
    statusLog: document.getElementById("statusLog"),
    toastStack: document.getElementById("toastStack"),
    saveStatePill: document.getElementById("saveStatePill"),
    commandPaletteBtn: document.getElementById("commandPaletteBtn"),
    openJsonToolsBtn: document.getElementById("openJsonToolsBtn"),
    openControlsBtn: document.getElementById("openControlsBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),
    contrastToggleBtn: document.getElementById("contrastToggleBtn"),
    shortcutsBtn: document.getElementById("shortcutsBtn"),
    closeControlsBtn: document.getElementById("closeControlsBtn"),
    closeEditorBtn: document.getElementById("closeEditorBtn"),
    undoBtn: document.getElementById("undoBtn"),
    redoBtn: document.getElementById("redoBtn"),
    addQuestionBtn: document.getElementById("addQuestionBtn"),
    deleteQuestionBtn: document.getElementById("deleteQuestionBtn"),
    deleteSelectedBtn: document.getElementById("deleteSelectedBtn"),
    assignTagBtn: document.getElementById("assignTagBtn"),
    cloneSelectedBtn: document.getElementById("cloneSelectedBtn"),
    shuffleSelectedBtn: document.getElementById("shuffleSelectedBtn"),
    importJsonBtn: document.getElementById("importJsonBtn"),
    importJsonInput: document.getElementById("importJsonInput"),
    openExamSettingsBtn: document.getElementById("openExamSettingsBtn"),
    exportSelectedBtn: document.getElementById("exportSelectedBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    exportAnswerKeyBtn: document.getElementById("exportAnswerKeyBtn"),
    printQuestionsBtn: document.getElementById("printQuestionsBtn"),
    printAnswerKeyBtn: document.getElementById("printAnswerKeyBtn"),
    openTestHarnessBtn: document.getElementById("openTestHarnessBtn"),
    examPresetSelect: document.getElementById("examPresetSelect"),
    securityFullscreenToggle: document.getElementById("securityFullscreenToggle"),
    securityNavWarnToggle: document.getElementById("securityNavWarnToggle"),
    securityTokenToggle: document.getElementById("securityTokenToggle"),
    institutionInput: document.getElementById("institutionInput"),
    subjectInput: document.getElementById("subjectInput"),
    examCodeInput: document.getElementById("examCodeInput"),
    negativeMarksInput: document.getElementById("negativeMarksInput"),
    studentInfoToggle: document.getElementById("studentInfoToggle"),
    saveSnapshotBtn: document.getElementById("saveSnapshotBtn"),
    snapshotLibraryBtn: document.getElementById("snapshotLibraryBtn"),
    questionSearchInput: document.getElementById("questionSearchInput"),
    topicFilterSelect: document.getElementById("topicFilterSelect"),
    difficultyFilterSelect: document.getElementById("difficultyFilterSelect"),
    showDuplicatesToggle: document.getElementById("showDuplicatesToggle"),
    statsGrid: document.getElementById("statsGrid"),
    openExamSettingsEditorBtn: document.getElementById("openExamSettingsEditorBtn"),
    openQuestionDetailsBtn: document.getElementById("openQuestionDetailsBtn"),
    createExamBtn: document.getElementById("createExamBtn"),
    form: document.getElementById("editorForm"),
    editorScroll: document.querySelector("#editorPanel .editor-scroll"),
    questionInput: document.getElementById("questionInput"),
    questionOpenStructuresBtn: document.getElementById("questionOpenStructuresBtn"),
    questionOpenSymbolsBtn: document.getElementById("questionOpenSymbolsBtn"),
    questionMathHoldBtn: document.getElementById("questionMathHoldBtn"),
    questionMathTargets: document.getElementById("questionMathTargets"),
    questionMathSymbolsTarget: document.getElementById("questionMathSymbolsTarget"),
    questionMathStructuresTarget: document.getElementById("questionMathStructuresTarget"),
    topicInput: document.getElementById("topicInput"),
    difficultySelect: document.getElementById("difficultySelect"),
    marksInput: document.getElementById("marksInput"),
    tagsInput: document.getElementById("tagsInput"),
    explanationInput: document.getElementById("explanationInput"),
    questionMathPreview: document.getElementById("questionMathPreview"),
    questionMathHint: document.getElementById("questionMathHint"),
    optionToolbar: document.getElementById("optionToolbar"),
    optionMoveUpBtn: document.getElementById("optionMoveUpBtn"),
    optionMoveDownBtn: document.getElementById("optionMoveDownBtn"),
    optionToolbarHint: document.getElementById("optionToolbarHint"),
    optionList: document.getElementById("optionList"),
    addOptionBtn: document.getElementById("addOptionBtn"),
    cancelBtn: document.getElementById("cancelEditBtn"),
    editorFloatBackdrop: document.getElementById("editorFloatBackdrop"),
    questionFloatCard: document.getElementById("questionFloatCard"),
    questionFloatBody: document.getElementById("questionFloatBody"),
    questionFloatInputMount: document.getElementById("questionFloatInputMount"),
    questionFloatPreview: document.getElementById("questionFloatPreview"),
    floatOpenStructuresBtn: document.getElementById("floatOpenStructuresBtn"),
    floatOpenSymbolsBtn: document.getElementById("floatOpenSymbolsBtn"),
    floatQuestionMathHoldBtn: document.getElementById("floatQuestionMathHoldBtn"),
    floatQuestionMathTargets: document.getElementById("floatQuestionMathTargets"),
    floatQuestionMathSymbolsTarget: document.getElementById("floatQuestionMathSymbolsTarget"),
    floatQuestionMathStructuresTarget: document.getElementById("floatQuestionMathStructuresTarget"),
    floatCloseQuestionBtn: document.getElementById("floatCloseQuestionBtn"),
    floatSaveQuestionBtn: document.getElementById("floatSaveQuestionBtn"),
    floatCancelQuestionBtn: document.getElementById("floatCancelQuestionBtn"),
    floatOptionMoveUpBtn: document.getElementById("floatOptionMoveUpBtn"),
    floatOptionMoveDownBtn: document.getElementById("floatOptionMoveDownBtn"),
    floatOptionDeleteBtn: document.getElementById("floatOptionDeleteBtn"),
    optionEditFloatCard: document.getElementById("optionEditFloatCard"),
    optionEditFloatBody: document.getElementById("optionEditFloatBody"),
    optionEditFloatInputMount: document.getElementById("optionEditFloatInputMount"),
    optionFloatPreview: document.getElementById("optionFloatPreview"),
    floatOptionMathHoldBtn: document.getElementById("floatOptionMathHoldBtn"),
    floatOptionMathTargets: document.getElementById("floatOptionMathTargets"),
    floatOptionMathSymbolsTarget: document.getElementById("floatOptionMathSymbolsTarget"),
    floatOptionMathStructuresTarget: document.getElementById("floatOptionMathStructuresTarget"),
    floatOptionOpenStructuresBtn: document.getElementById("floatOptionOpenStructuresBtn"),
    floatOptionOpenSymbolsBtn: document.getElementById("floatOptionOpenSymbolsBtn"),
    floatCloseOptionEditBtn: document.getElementById("floatCloseOptionEditBtn"),
    floatSaveOptionEditBtn: document.getElementById("floatSaveOptionEditBtn"),
    floatCancelOptionEditBtn: document.getElementById("floatCancelOptionEditBtn"),
    mathNavSection: document.getElementById("mathNavSection"),
    mathSearchInput: document.getElementById("mathSearchInput"),
    mathStructuresTab: document.getElementById("mathStructuresTab"),
    mathSymbolsTab: document.getElementById("mathSymbolsTab"),
    mathStructuresPanel: document.getElementById("mathStructuresPanel"),
    mathSymbolsPanel: document.getElementById("mathSymbolsPanel"),
    importReportModal: document.getElementById("importReportModal"),
    closeImportReportBtn: document.getElementById("closeImportReportBtn"),
    importReportContent: document.getElementById("importReportContent"),
    preflightModal: document.getElementById("preflightModal"),
    closePreflightBtn: document.getElementById("closePreflightBtn"),
    preflightContent: document.getElementById("preflightContent"),
    continuePreflightBtn: document.getElementById("continuePreflightBtn"),
    cancelPreflightBtn: document.getElementById("cancelPreflightBtn"),
    shortcutsModal: document.getElementById("shortcutsModal"),
    closeShortcutsBtn: document.getElementById("closeShortcutsBtn"),
    shortcutsContent: document.getElementById("shortcutsContent"),
    jsonToolsModal: document.getElementById("jsonToolsModal"),
    closeJsonToolsBtn: document.getElementById("closeJsonToolsBtn"),
    cancelJsonToolsBtn: document.getElementById("cancelJsonToolsBtn"),
    mathToolsModal: document.getElementById("mathToolsModal"),
    closeMathToolsBtn: document.getElementById("closeMathToolsBtn"),
    questionDetailsModal: document.getElementById("questionDetailsModal"),
    closeQuestionDetailsBtn: document.getElementById("closeQuestionDetailsBtn"),
    saveQuestionDetailsBtn: document.getElementById("saveQuestionDetailsBtn"),
    cancelQuestionDetailsBtn: document.getElementById("cancelQuestionDetailsBtn"),
    examSettingsModal: document.getElementById("examSettingsModal"),
    closeExamSettingsBtn: document.getElementById("closeExamSettingsBtn"),
    cancelExamSettingsBtn: document.getElementById("cancelExamSettingsBtn"),
    commandPaletteModal: document.getElementById("commandPaletteModal"),
    closeCommandPaletteBtn: document.getElementById("closeCommandPaletteBtn"),
    commandPaletteInput: document.getElementById("commandPaletteInput"),
    commandPaletteList: document.getElementById("commandPaletteList"),
    snapshotModal: document.getElementById("snapshotModal"),
    closeSnapshotBtn: document.getElementById("closeSnapshotBtn"),
    snapshotContent: document.getElementById("snapshotContent")
  };

  const requiredUiKeys = [
    "app",
    "editorPanel",
    "backdrop",
    "cards",
    "count",
    "selectedCount",
    "status",
    "statusLog",
    "toastStack",
    "saveStatePill",
    "commandPaletteBtn",
    "openJsonToolsBtn",
    "openControlsBtn",
    "themeToggleBtn",
    "contrastToggleBtn",
    "shortcutsBtn",
    "closeControlsBtn",
    "closeEditorBtn",
    "undoBtn",
    "redoBtn",
    "addQuestionBtn",
    "deleteQuestionBtn",
    "deleteSelectedBtn",
    "assignTagBtn",
    "cloneSelectedBtn",
    "shuffleSelectedBtn",
    "importJsonBtn",
    "importJsonInput",
    "openExamSettingsBtn",
    "exportSelectedBtn",
    "exportJsonBtn",
    "exportAnswerKeyBtn",
    "printQuestionsBtn",
    "printAnswerKeyBtn",
    "openTestHarnessBtn",
    "examPresetSelect",
    "securityFullscreenToggle",
    "securityNavWarnToggle",
    "securityTokenToggle",
    "institutionInput",
    "subjectInput",
    "examCodeInput",
    "negativeMarksInput",
    "studentInfoToggle",
    "saveSnapshotBtn",
    "snapshotLibraryBtn",
    "questionSearchInput",
    "topicFilterSelect",
    "difficultyFilterSelect",
    "showDuplicatesToggle",
    "statsGrid",
    "openExamSettingsEditorBtn",
    "openQuestionDetailsBtn",
    "createExamBtn",
    "form",
    "questionInput",
    "topicInput",
    "difficultySelect",
    "marksInput",
    "tagsInput",
    "explanationInput",
    "questionMathPreview",
    "optionToolbar",
    "optionMoveUpBtn",
    "optionMoveDownBtn",
    "optionToolbarHint",
    "optionList",
    "addOptionBtn",
    "cancelBtn",
    "editorScroll",
    "editorFloatBackdrop",
    "questionFloatCard",
    "questionFloatBody",
    "questionFloatInputMount",
    "questionFloatPreview",
    "floatCloseQuestionBtn",
    "floatSaveQuestionBtn",
    "floatCancelQuestionBtn",
    "floatOptionMoveUpBtn",
    "floatOptionMoveDownBtn",
    "floatOptionDeleteBtn",
    "optionEditFloatCard",
    "optionEditFloatBody",
    "optionEditFloatInputMount",
    "optionFloatPreview",
    "floatOptionMathHoldBtn",
    "floatOptionMathTargets",
    "floatOptionMathSymbolsTarget",
    "floatOptionMathStructuresTarget",
    "floatOptionOpenStructuresBtn",
    "floatOptionOpenSymbolsBtn",
    "floatCloseOptionEditBtn",
    "floatSaveOptionEditBtn",
    "floatCancelOptionEditBtn",
    "mathNavSection",
    "mathStructuresTab",
    "mathSymbolsTab",
    "mathStructuresPanel",
    "mathSymbolsPanel",
    "importReportModal",
    "closeImportReportBtn",
    "importReportContent",
    "preflightModal",
    "closePreflightBtn",
    "preflightContent",
    "continuePreflightBtn",
    "cancelPreflightBtn",
    "shortcutsModal",
    "closeShortcutsBtn",
    "shortcutsContent",
    "jsonToolsModal",
    "closeJsonToolsBtn",
    "cancelJsonToolsBtn",
    "mathToolsModal",
    "closeMathToolsBtn",
    "questionDetailsModal",
    "closeQuestionDetailsBtn",
    "saveQuestionDetailsBtn",
    "cancelQuestionDetailsBtn",
    "examSettingsModal",
    "closeExamSettingsBtn",
    "cancelExamSettingsBtn",
    "commandPaletteModal",
    "closeCommandPaletteBtn",
    "commandPaletteInput",
    "commandPaletteList",
    "snapshotModal",
    "closeSnapshotBtn",
    "snapshotContent"
  ];

  const missingUi = requiredUiKeys
    .filter((key) => !ui[key]);

  if (missingUi.length > 0) {
    console.error("MCQAdminPanel bootstrap failed. Missing UI elements:", missingUi.join(", "));
    return;
  }

  // Optional enhancement nodes: create safe fallbacks if markup is older.
  if (!ui.mathSearchInput) {
    const fallbackSearch = document.createElement("input");
    fallbackSearch.type = "text";
    fallbackSearch.id = "mathSearchInput";
    fallbackSearch.className = "math-search-input";
    fallbackSearch.placeholder = "Search structures and symbols (Ctrl/Cmd+K)";
    fallbackSearch.setAttribute("aria-label", "Search math structures and symbols");

    const wrap = document.createElement("div");
    wrap.className = "math-search-wrap";
    wrap.appendChild(fallbackSearch);
    ui.mathNavSection.prepend(wrap);
    ui.mathSearchInput = fallbackSearch;
  }

  if (!ui.questionMathHint) {
    const fallbackHint = document.createElement("p");
    fallbackHint.id = "questionMathHint";
    fallbackHint.className = "math-hint";
    fallbackHint.setAttribute("aria-live", "polite");
    ui.questionMathPreview.insertAdjacentElement("afterend", fallbackHint);
    ui.questionMathHint = fallbackHint;
  }

  const editor = {
    draft: emptyDraft(),
    snapshot: "",
    dirty: false,
    dragId: null,
    activeInput: null
  };

  const filters = {
    query: "",
    topic: "",
    difficulty: "",
    duplicatesOnly: false
  };

  const examConfig = {
    preset: "quick",
    security: {
      fullscreen: false,
      navWarn: true,
      token: true
    },
    branding: {
      institution: "",
      subject: "",
      examCode: "",
      showStudentInfo: true
    },
    marking: {
      negative: 0
    }
  };

  let shortcuts = { ...DEFAULT_SHORTCUTS };
  let statusLogItems = [];
  let snapshotLibrary = [];
  let persistTimer = null;
  let historyTimer = null;
  let historySuspended = false;
  const history = {
    undo: [],
    redo: []
  };
  let pendingExamCreation = null;
  let activeModal = null;
  let saveState = {
    mode: "saved",
    at: null
  };

  let statusTimer = null;
  let typingStateTimer = null;
  let toastSeed = 0;
  let questionPreviewTimer = null;
  const optionPreviewTimers = new WeakMap();
  const resizeFrameTimers = new WeakMap();
  const typesetTimers = new WeakMap();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  function init() {
    ensureEditorFloatPortal();
    initTheme();
    initContrast();
    loadShortcuts();
    ensureMathJax();
    renderMathMenus();
    activateMathTab("structures");
    hydrateAppState();
    hydrateSnapshots();
    applyFiltersToControls();
    applyExamConfigToControls();
    renderShortcutsModal();
    renderCommandPalette();
    renderSnapshotLibrary();
    bind();
    resetDraft();
    renderAll();
    renderStatusLog();
    updateHistoryButtons();
    updateSaveStatePill();
    schedulePersistAppState();
  }

  function ensureEditorFloatPortal() {
    // Keep floating editor overlays at app root so transformed editor panels
    // cannot trap these fixed-position layers.
    const host = ui.app || document.body;
    [
      ui.editorFloatBackdrop,
      ui.questionFloatCard,
      ui.optionEditFloatCard
    ].forEach((node) => {
      if (node && node.parentElement !== host) {
        host.appendChild(node);
      }
    });
  }

  function bind() {
    ui.commandPaletteBtn.addEventListener("click", openCommandPalette);
    ui.openJsonToolsBtn.addEventListener("click", () => openModal(ui.jsonToolsModal));
    ui.themeToggleBtn.addEventListener("click", toggleTheme);
    ui.contrastToggleBtn.addEventListener("click", toggleContrast);
    ui.shortcutsBtn.addEventListener("click", () => openModal(ui.shortcutsModal));
    ui.openControlsBtn.addEventListener("click", () => {
      if (window.innerWidth <= 1200) {
        ui.app.classList.add("controls-open");
      }
    });
    ui.closeControlsBtn.addEventListener("click", () => ui.app.classList.remove("controls-open"));
    ui.closeEditorBtn.addEventListener("click", () => closeEditor(true));
    ui.backdrop.addEventListener("click", () => {
      // Float overlays close first; only close the editor when no float is active.
      if (editorFloatActive !== null) {
        closeTopEditorFloat(true);
        return;
      }
      closeEditor(true);
      ui.app.classList.remove("controls-open");
    });

    ui.undoBtn.addEventListener("click", undoState);
    ui.redoBtn.addEventListener("click", redoState);
    ui.addQuestionBtn.addEventListener("click", newQuestion);
    ui.deleteQuestionBtn.addEventListener("click", deleteCurrentQuestion);
    ui.deleteSelectedBtn.addEventListener("click", deleteSelectedQuestions);
    ui.assignTagBtn.addEventListener("click", assignTagToSelected);
    ui.cloneSelectedBtn.addEventListener("click", cloneSelectedQuestions);
    ui.shuffleSelectedBtn.addEventListener("click", shuffleSelectedQuestions);
    ui.importJsonBtn.addEventListener("click", () => ui.importJsonInput.click());
    ui.importJsonInput.addEventListener("change", importJsonAppend);
    ui.openExamSettingsBtn.addEventListener("click", openExamSettings);
    ui.exportJsonBtn.addEventListener("click", () => {
      void exportJson(questions, "questions.json");
    });
    ui.exportSelectedBtn.addEventListener("click", exportSelectedJson);
    ui.exportAnswerKeyBtn.addEventListener("click", exportAnswerKeyJson);
    ui.printQuestionsBtn.addEventListener("click", printQuestions);
    ui.printAnswerKeyBtn.addEventListener("click", printAnswerKey);
    ui.openTestHarnessBtn.addEventListener("click", openTestHarness);
    ui.createExamBtn.addEventListener("click", generateExamFile);
    ui.examPresetSelect.addEventListener("change", onExamConfigChange);
    ui.securityFullscreenToggle.addEventListener("change", onExamConfigChange);
    ui.securityNavWarnToggle.addEventListener("change", onExamConfigChange);
    ui.securityTokenToggle.addEventListener("change", onExamConfigChange);
    ui.institutionInput.addEventListener("input", onExamConfigChange);
    ui.subjectInput.addEventListener("input", onExamConfigChange);
    ui.examCodeInput.addEventListener("input", onExamConfigChange);
    ui.negativeMarksInput.addEventListener("input", onExamConfigChange);
    ui.studentInfoToggle.addEventListener("change", onExamConfigChange);
    ui.saveSnapshotBtn.addEventListener("click", saveSnapshot);
    ui.snapshotLibraryBtn.addEventListener("click", openSnapshotLibrary);

    ui.questionSearchInput.addEventListener("input", onFilterChange);
    ui.topicFilterSelect.addEventListener("change", onFilterChange);
    ui.difficultyFilterSelect.addEventListener("change", onFilterChange);
    ui.showDuplicatesToggle.addEventListener("change", onFilterChange);

    ui.questionInput.addEventListener("input", (event) => {
      const nextValue = event.target.value;
      if (editorFloatActive === "question") {
        floatQuestionState.staged = nextValue;
        markEditorTyping();
        renderQuestionFloatPreview();
        return;
      }
      editor.draft.question = nextValue;
      markEditorTyping();
      scheduleQuestionPreview();
      syncDirty();
      scheduleHistoryFromDraft();
    });
    ui.questionInput.addEventListener("blur", () => {
      if (editorFloatActive === "question") {
        renderQuestionFloatPreview({ immediate: true });
        return;
      }
      renderQuestionPreview({ immediate: true });
    });
    ui.questionInput.addEventListener("keydown", onQuestionInputKeydown);
    ui.questionInput.addEventListener("focus", () => {
      editor.activeInput = ui.questionInput;
      refreshOptionToolbar();
    });
    ui.topicInput.addEventListener("input", (event) => {
      editor.draft.topic = event.target.value;
      markEditorTyping();
      syncDirty();
      scheduleHistoryFromDraft();
    });
    ui.difficultySelect.addEventListener("change", (event) => {
      editor.draft.difficulty = sanitizeDifficulty(event.target.value);
      syncDirty();
      scheduleHistoryFromDraft();
    });
    ui.marksInput.addEventListener("input", (event) => {
      const parsed = Number.parseInt(event.target.value, 10);
      editor.draft.marks = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
      syncDirty();
      scheduleHistoryFromDraft();
    });
    ui.tagsInput.addEventListener("input", (event) => {
      editor.draft.tags = event.target.value;
      markEditorTyping();
      syncDirty();
      scheduleHistoryFromDraft();
    });
    ui.explanationInput.addEventListener("input", (event) => {
      editor.draft.explanation = event.target.value;
      markEditorTyping();
      syncDirty();
      scheduleHistoryFromDraft();
    });
    ui.addOptionBtn.addEventListener("click", addOption);
    ui.optionMoveUpBtn.addEventListener("click", () => moveActiveOption(-1));
    ui.optionMoveDownBtn.addEventListener("click", () => moveActiveOption(1));
    if (ui.questionOpenStructuresBtn) {
      ui.questionOpenStructuresBtn.addEventListener("click", () => openMathTools("structures"));
    }
    if (ui.questionOpenSymbolsBtn) {
      ui.questionOpenSymbolsBtn.addEventListener("click", () => openMathTools("symbols"));
    }
    if (ui.questionMathHoldBtn) {
      ui.questionMathHoldBtn.addEventListener("pointerdown", (event) => onQuestionMathHoldPointerDown(event, "inline"));
      ui.questionMathHoldBtn.addEventListener("pointermove", onQuestionMathHoldPointerMove);
      ui.questionMathHoldBtn.addEventListener("pointerup", onQuestionMathHoldPointerUp);
      ui.questionMathHoldBtn.addEventListener("pointercancel", onQuestionMathHoldPointerCancel);
    }
    ui.cancelBtn.addEventListener("click", cancelEdit);
    ui.openExamSettingsEditorBtn.addEventListener("click", openExamSettings);
    ui.openQuestionDetailsBtn.addEventListener("click", () => openModal(ui.questionDetailsModal));
    ui.form.addEventListener("submit", saveQuestion);
    ui.form.addEventListener("focusin", onEditorFocusIn);
    ui.mathSearchInput.addEventListener("input", onMathSearchInput);

    // Preview-first editor: tapping rendered previews opens floating inputs.
    ui.questionMathPreview.setAttribute("role", "button");
    ui.questionMathPreview.tabIndex = 0;
    ui.questionMathPreview.addEventListener("click", () => {
      if (!ui.app.classList.contains("editor-preview-mode")) {
        return;
      }
      openQuestionFloat();
    });
    ui.questionMathPreview.addEventListener("keydown", (event) => {
      if (!ui.app.classList.contains("editor-preview-mode")) {
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      openQuestionFloat();
    });

    ui.editorFloatBackdrop.addEventListener("click", (event) => {
      if (event.target !== ui.editorFloatBackdrop) {
        return;
      }
      closeTopEditorFloat(true);
    });

    // Floating question editor.
    if (ui.floatOpenStructuresBtn) {
      ui.floatOpenStructuresBtn.addEventListener("click", () => openMathTools("structures"));
    }
    if (ui.floatOpenSymbolsBtn) {
      ui.floatOpenSymbolsBtn.addEventListener("click", () => openMathTools("symbols"));
    }
    if (ui.floatQuestionMathHoldBtn) {
      ui.floatQuestionMathHoldBtn.addEventListener("pointerdown", (event) => onQuestionMathHoldPointerDown(event, "float"));
      ui.floatQuestionMathHoldBtn.addEventListener("pointermove", onQuestionMathHoldPointerMove);
      ui.floatQuestionMathHoldBtn.addEventListener("pointerup", onQuestionMathHoldPointerUp);
      ui.floatQuestionMathHoldBtn.addEventListener("pointercancel", onQuestionMathHoldPointerCancel);
    }
    ui.floatCloseQuestionBtn.addEventListener("click", () => closeQuestionFloat(true));
    ui.floatCancelQuestionBtn.addEventListener("click", () => closeQuestionFloat(true));
    ui.floatSaveQuestionBtn.addEventListener("click", () => closeQuestionFloat(false));

    // Floating option text editor.
    ui.floatOptionOpenStructuresBtn.addEventListener("click", () => openMathTools("structures"));
    ui.floatOptionOpenSymbolsBtn.addEventListener("click", () => openMathTools("symbols"));
    ui.floatOptionMoveUpBtn.addEventListener("click", () => onFloatOptionMove(-1));
    ui.floatOptionMoveDownBtn.addEventListener("click", () => onFloatOptionMove(1));
    ui.floatOptionDeleteBtn.addEventListener("click", onFloatOptionDelete);
    ui.floatCloseOptionEditBtn.addEventListener("click", () => closeOptionEditFloat(true));
    ui.floatCancelOptionEditBtn.addEventListener("click", () => closeOptionEditFloat(true));
    ui.floatSaveOptionEditBtn.addEventListener("click", () => closeOptionEditFloat(false));
    ui.floatOptionMathHoldBtn.addEventListener("pointerdown", onOptionMathHoldPointerDown);
    ui.floatOptionMathHoldBtn.addEventListener("pointermove", onOptionMathHoldPointerMove);
    ui.floatOptionMathHoldBtn.addEventListener("pointerup", onOptionMathHoldPointerUp);
    ui.floatOptionMathHoldBtn.addEventListener("pointercancel", onOptionMathHoldPointerCancel);

    ui.mathNavSection.addEventListener("mousedown", (event) => {
      if (event.target.closest(".math-insert-btn")) {
        event.preventDefault();
      }
    });
    ui.mathNavSection.addEventListener("click", onMathNavClick);

    ui.cards.addEventListener("click", onCardClick);
    ui.cards.addEventListener("change", onCardChange);
    ui.cards.addEventListener("dragstart", onDragStart);
    ui.cards.addEventListener("dragover", onDragOver);
    ui.cards.addEventListener("dragleave", onDragLeave);
    ui.cards.addEventListener("drop", onDrop);
    ui.cards.addEventListener("dragend", clearDragState);

    ui.closeImportReportBtn.addEventListener("click", () => closeModal(ui.importReportModal));
    ui.closePreflightBtn.addEventListener("click", cancelPreflight);
    ui.continuePreflightBtn.addEventListener("click", continuePreflight);
    ui.cancelPreflightBtn.addEventListener("click", cancelPreflight);
    ui.closeShortcutsBtn.addEventListener("click", () => closeModal(ui.shortcutsModal));
    ui.closeJsonToolsBtn.addEventListener("click", () => closeModal(ui.jsonToolsModal));
    ui.cancelJsonToolsBtn.addEventListener("click", () => closeModal(ui.jsonToolsModal));
    ui.closeMathToolsBtn.addEventListener("click", () => closeModal(ui.mathToolsModal));
    ui.closeQuestionDetailsBtn.addEventListener("click", () => closeModal(ui.questionDetailsModal));
    ui.saveQuestionDetailsBtn.addEventListener("click", () => closeModal(ui.questionDetailsModal));
    ui.cancelQuestionDetailsBtn.addEventListener("click", () => closeModal(ui.questionDetailsModal));
    ui.closeExamSettingsBtn.addEventListener("click", () => closeModal(ui.examSettingsModal));
    ui.cancelExamSettingsBtn.addEventListener("click", () => closeModal(ui.examSettingsModal));
    ui.closeCommandPaletteBtn.addEventListener("click", () => closeModal(ui.commandPaletteModal));
    ui.commandPaletteInput.addEventListener("input", onCommandPaletteInput);
    ui.commandPaletteList.addEventListener("click", onCommandPaletteClick);
    ui.closeSnapshotBtn.addEventListener("click", () => closeModal(ui.snapshotModal));
    ui.snapshotContent.addEventListener("click", onSnapshotContentClick);
    document.addEventListener("click", onActionProxyClick);

    [ui.importReportModal, ui.preflightModal, ui.shortcutsModal, ui.jsonToolsModal, ui.mathToolsModal, ui.questionDetailsModal, ui.examSettingsModal, ui.commandPaletteModal, ui.snapshotModal].forEach((modal) => {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          closeModal(modal);
        }
      });
    });

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
    document.addEventListener("keydown", onGlobalKeydown);
  }

  function initTheme() {
    const stored = readThemePreference();
    const initialTheme = stored || getSystemTheme();
    applyTheme(initialTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    writeThemePreference(next);
  }

  function applyTheme(theme) {
    const normalized = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = normalized;
    const nextLabel = normalized === "dark" ? "Light Theme" : "Dark Theme";
    ui.themeToggleBtn.textContent = nextLabel;
    ui.themeToggleBtn.setAttribute("aria-label", "Switch color theme. Next: " + nextLabel);
  }

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function readThemePreference() {
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (value === "light" || value === "dark") {
        return value;
      }
      return null;
    } catch {
      return null;
    }
  }

  function writeThemePreference(theme) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }

  function initContrast() {
    const stored = readContrastPreference();
    applyContrast(stored === "high" ? "high" : "normal");
  }

  function toggleContrast() {
    const current = document.documentElement.dataset.contrast === "high" ? "high" : "normal";
    const next = current === "high" ? "normal" : "high";
    applyContrast(next);
    writeContrastPreference(next);
    status("Contrast mode: " + (next === "high" ? "High" : "Normal") + ".", "success");
  }

  function applyContrast(mode) {
    const normalized = mode === "high" ? "high" : "normal";
    if (normalized === "high") {
      document.documentElement.dataset.contrast = "high";
    } else {
      delete document.documentElement.dataset.contrast;
    }
    const nextLabel = normalized === "high" ? "Normal Contrast" : "High Contrast";
    ui.contrastToggleBtn.textContent = nextLabel;
    ui.contrastToggleBtn.setAttribute("aria-label", "Toggle high contrast mode. Next: " + nextLabel);
  }

  function readContrastPreference() {
    try {
      const value = window.localStorage.getItem(CONTRAST_STORAGE_KEY);
      return value === "high" ? "high" : "normal";
    } catch {
      return "normal";
    }
  }

  function writeContrastPreference(mode) {
    try {
      window.localStorage.setItem(CONTRAST_STORAGE_KEY, mode === "high" ? "high" : "normal");
    } catch {
      // Ignore storage errors.
    }
  }

  function loadShortcuts() {
    try {
      const raw = window.localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      if (!raw) {
        shortcuts = { ...DEFAULT_SHORTCUTS };
        return;
      }
      const parsed = JSON.parse(raw);
      shortcuts = { ...DEFAULT_SHORTCUTS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch {
      shortcuts = { ...DEFAULT_SHORTCUTS };
    }
  }

  function renderShortcutsModal() {
    const rows = [
      ["Add Question", shortcuts.addQuestion],
      ["Save Question", shortcuts.saveQuestion],
      ["Undo", shortcuts.undo],
      ["Redo", shortcuts.redo],
      ["Command Palette", shortcuts.commandPalette],
      ["Open Controls", shortcuts.openControls],
      ["Open Shortcuts", shortcuts.openShortcuts],
      ["Math Search", shortcuts.searchMath],
      ["Import JSON", shortcuts.importJson],
      ["Export Full JSON", shortcuts.exportJson],
      ["Open Exam Settings", shortcuts.createExam],
      ["Delete Selected", shortcuts.deleteSelected]
    ];
    const table = document.createElement("table");
    table.className = "shortcuts-table";
    table.innerHTML = "<thead><tr><th>Action</th><th>Shortcut</th></tr></thead>";
    const body = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const action = document.createElement("td");
      action.textContent = row[0];
      const key = document.createElement("td");
      key.textContent = row[1];
      tr.append(action, key);
      body.appendChild(tr);
    });
    table.appendChild(body);
    ui.shortcutsContent.innerHTML = "";
    ui.shortcutsContent.appendChild(table);
  }

  function getCommandPaletteItems() {
    return [
      { id: "add-question", label: "Add Question", hint: "Open a new draft in the editor.", run: () => newQuestion() },
      { id: "save-question", label: "Save Question", hint: "Save the current editor draft.", run: () => ui.form.requestSubmit() },
      { id: "open-exam-settings", label: "Open Exam Settings", hint: "Adjust exam settings and build the standalone exam.html file.", run: () => openExamSettings() },
      { id: "import-json", label: "Import JSON", hint: "Append questions from a JSON file.", run: () => ui.importJsonInput.click() },
      { id: "export-json", label: "Export Full JSON", hint: "Download the full question bank.", run: () => void exportJson(questions, "questions.json") },
      { id: "export-selected", label: "Export Selected", hint: "Download only selected questions.", run: () => void exportSelectedJson() },
      { id: "save-snapshot", label: "Save Snapshot", hint: "Store the current workspace state locally.", run: () => saveSnapshot() },
      { id: "open-snapshots", label: "Open Snapshot Library", hint: "Browse and restore saved snapshots.", run: () => openSnapshotLibrary() },
      { id: "focus-search", label: "Focus Question Search", hint: "Jump to the main search box.", run: () => ui.questionSearchInput.focus() },
      { id: "open-shortcuts", label: "Open Shortcuts", hint: "View keyboard shortcut guide.", run: () => openModal(ui.shortcutsModal) },
      { id: "toggle-theme", label: "Toggle Theme", hint: "Switch between light and dark mode.", run: () => toggleTheme() },
      { id: "toggle-contrast", label: "Toggle Contrast", hint: "Switch contrast mode for accessibility.", run: () => toggleContrast() },
      { id: "open-test-harness", label: "Open Test Harness", hint: "Launch the built-in QA checklist tab.", run: () => openTestHarness() }
    ];
  }

  function renderCommandPalette(query = "") {
    const normalized = String(query || "").trim().toLowerCase();
    const items = getCommandPaletteItems().filter((item) => {
      const haystack = (item.label + " " + item.hint).toLowerCase();
      return !normalized || haystack.includes(normalized);
    });
    ui.commandPaletteList.innerHTML = "";
    if (items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "snapshot-empty";
      empty.textContent = "No commands match this search.";
      ui.commandPaletteList.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "command-item";
      button.dataset.commandId = item.id;
      button.innerHTML = "<strong>" + escapeHtml(item.label) + "</strong><span>" + escapeHtml(item.hint) + "</span>";
      ui.commandPaletteList.appendChild(button);
    });
  }

  function openCommandPalette() {
    renderCommandPalette(ui.commandPaletteInput.value);
    openModal(ui.commandPaletteModal);
    window.requestAnimationFrame(() => {
      ui.commandPaletteInput.focus();
      ui.commandPaletteInput.select();
    });
  }

  function onCommandPaletteInput(event) {
    renderCommandPalette(event.target.value);
  }

  function onCommandPaletteClick(event) {
    const button = event.target.closest("[data-command-id]");
    if (!button) {
      return;
    }
    const command = getCommandPaletteItems().find((item) => item.id === button.dataset.commandId);
    if (!command) {
      return;
    }
    closeModal(ui.commandPaletteModal);
    command.run();
  }

  function onActionProxyClick(event) {
    const trigger = event.target.closest("[data-action-target]");
    if (!trigger) {
      return;
    }
    const targetId = trigger.dataset.actionTarget;
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target || target === trigger) {
      return;
    }
    if (window.innerWidth <= 1200) {
      ui.app.classList.remove("controls-open");
    }
    target.click();
  }

  function ensureMathJax() {
    if (!window.MathJax || typeof window.MathJax !== "object" || typeof window.MathJax.typesetPromise !== "function") {
      window.MathJax = window.MathJax || {};
      window.MathJax.tex = window.MathJax.tex || {};
      window.MathJax.tex.inlineMath = window.MathJax.tex.inlineMath || [["\\(", "\\)"], ["$", "$"]];
      window.MathJax.tex.displayMath = window.MathJax.tex.displayMath || [["\\[", "\\]"], ["$$", "$$"]];
      window.MathJax.tex.processEscapes = true;
      window.MathJax.options = window.MathJax.options || {};
      window.MathJax.options.skipHtmlTags = window.MathJax.options.skipHtmlTags || ["script", "noscript", "style", "textarea", "pre", "code"];
    }

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      return;
    }

    const primarySrc = LOCAL_MATHJAX_SRC || CDN_MATHJAX_SRC;
    const primaryMarker = LOCAL_MATHJAX_SRC ? "local" : "cdn";

    if (!primarySrc || document.querySelector("script[data-mathjax-loader='" + primaryMarker + "']")) {
      return;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.src = primarySrc;
    script.dataset.mathjaxLoader = primaryMarker;
    script.addEventListener("load", () => queueMathTypeset(document.body));
    if (LOCAL_MATHJAX_SRC) {
      script.addEventListener("error", () => {
        if (document.querySelector("script[data-mathjax-loader='fallback']")) {
          return;
        }
        const fallback = document.createElement("script");
        fallback.defer = true;
        fallback.src = CDN_MATHJAX_SRC;
        fallback.dataset.mathjaxLoader = "fallback";
        fallback.addEventListener("load", () => queueMathTypeset(document.body));
        document.head.appendChild(fallback);
      });
    }
    document.head.appendChild(script);
  }

  function queueMathTypeset(target) {
    if (!target || !window.MathJax) {
      return;
    }
    const pendingTimer = typesetTimers.get(target);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
    }
    const timer = window.setTimeout(() => {
      typesetTimers.delete(target);
      runMathTypeset(target);
    }, PREVIEW_DEBOUNCE_MS);
    typesetTimers.set(target, timer);
  }

  function runMathTypeset(target) {
    if (!target || !window.MathJax) {
      return;
    }
    if (typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([target]).catch(() => {});
      return;
    }
    if (typeof window.MathJax.typeset === "function") {
      try {
        window.MathJax.typeset([target]);
      } catch {
        // Ignore transient parse/render errors while users type incomplete LaTeX.
      }
    }
  }

  function renderMathMenus() {
    ui.mathStructuresPanel.innerHTML = "";
    ui.mathSymbolsPanel.innerHTML = "";
    renderMathPanel(ui.mathStructuresPanel, MATH_STRUCTURE_GROUPS);
    renderMathPanel(ui.mathSymbolsPanel, MATH_SYMBOL_GROUPS);
    queueMathTypeset(ui.mathNavSection);
  }

  function renderMathPanel(panel, groups) {
    groups.forEach((group) => {
      const section = document.createElement("section");
      section.className = "math-group";

      const title = document.createElement("p");
      title.className = "math-group-title";
      title.textContent = group.title;

      const grid = document.createElement("div");
      grid.className = "math-insert-grid";
      group.items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "math-insert-btn";
        button.dataset.insert = item.insert;
        button.dataset.example = buildMathTemplateExample(item.insert);
        button.dataset.search = normalizeMathQuery(item.label + " " + item.insert + " " + group.title);
        button.title = item.insert.trim();
        const label = document.createElement("span");
        label.className = "math-btn-label";
        label.textContent = item.label;

        const preview = document.createElement("span");
        preview.className = "math-btn-preview";
        preview.textContent = buildMathButtonPreview(item);

        button.append(label, preview);
        grid.appendChild(button);
      });

      section.append(title, grid);
      panel.appendChild(section);
    });
  }

  function activateMathTab(tabName) {
    const showingStructures = tabName === "structures";
    ui.mathStructuresTab.classList.toggle("active", showingStructures);
    ui.mathSymbolsTab.classList.toggle("active", !showingStructures);
    ui.mathStructuresTab.setAttribute("aria-selected", showingStructures ? "true" : "false");
    ui.mathSymbolsTab.setAttribute("aria-selected", showingStructures ? "false" : "true");
    ui.mathStructuresPanel.classList.toggle("active", showingStructures);
    ui.mathSymbolsPanel.classList.toggle("active", !showingStructures);
    ui.mathStructuresPanel.hidden = !showingStructures;
    ui.mathSymbolsPanel.hidden = showingStructures;
    filterMathPalette(ui.mathSearchInput.value);
  }

  function onMathSearchInput(event) {
    filterMathPalette(event.target.value);
  }

  function onGlobalKeydown(event) {
    const activeTag = document.activeElement && document.activeElement.tagName ? document.activeElement.tagName.toLowerCase() : "";
    const isTextEditing = activeTag === "input" || activeTag === "textarea";

    if (event.key === "Escape" && activeModal === ui.mathToolsModal && document.activeElement === ui.mathSearchInput && ui.mathSearchInput.value) {
      event.preventDefault();
      ui.mathSearchInput.value = "";
      filterMathPalette("");
      return;
    }

    if (event.key === "Escape") {
      if (activeModal) {
        event.preventDefault();
        closeModal(activeModal);
        return;
      }
      if (editorFloatActive) {
        event.preventDefault();
        closeTopEditorFloat(true);
        return;
      }
      if (ui.app.classList.contains("editor-open")) {
        event.preventDefault();
        closeEditor(true);
        return;
      }
      if (ui.app.classList.contains("controls-open")) {
        event.preventDefault();
        ui.app.classList.remove("controls-open");
        return;
      }
    }

    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "n") {
      event.preventDefault();
      newQuestion();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "s") {
      if (!ui.app.classList.contains("editor-open")) {
        return;
      }
      event.preventDefault();
      ui.form.requestSubmit();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      if (isTextEditing) {
        return;
      }
      event.preventDefault();
      undoState();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "y") {
      if (isTextEditing) {
        return;
      }
      event.preventDefault();
      redoState();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === ".") {
      event.preventDefault();
      if (window.innerWidth <= 1200) {
        ui.app.classList.toggle("controls-open");
      } else {
        ui.openControlsBtn.focus();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "i") {
      event.preventDefault();
      ui.importJsonInput.click();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "j") {
      event.preventDefault();
      void exportJson(questions, "questions.json");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      openExamSettings();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === "x") {
      if (isTextEditing || selectedQuestionIds.size === 0) {
        return;
      }
      event.preventDefault();
      deleteSelectedQuestions();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && event.shiftKey && event.key === "?") {
      event.preventDefault();
      openModal(ui.shortcutsModal);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (ui.app.classList.contains("editor-open")) {
        openMathTools("structures");
      }
      return;
    }

    if (!isTextEditing && event.key === "Delete" && selectedQuestionIds.size > 0) {
      event.preventDefault();
      deleteSelectedQuestions();
    }
  }

  function openModal(modal) {
    if (!modal) {
      return;
    }
    if (activeModal && activeModal !== modal) {
      closeModal(activeModal);
    }
    modal.hidden = false;
    activeModal = modal;
    ui.app.classList.add("modal-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) {
      return;
    }
    modal.hidden = true;
    if (activeModal === modal) {
      activeModal = null;
      ui.app.classList.remove("modal-open");
      document.body.style.overflow = "";
      if (editor.activeInput && typeof editor.activeInput.focus === "function") {
        window.requestAnimationFrame(() => {
          editor.activeInput.focus();
        });
      }
    }
  }

  function openMathTools(tabName) {
    activateMathTab(tabName === "symbols" ? "symbols" : "structures");
    ui.mathSearchInput.value = "";
    filterMathPalette("");
    openModal(ui.mathToolsModal);
    queueMathTypeset(ui.mathNavSection);
    window.requestAnimationFrame(() => {
      ui.mathSearchInput.focus();
      ui.mathSearchInput.select();
    });
  }

  function openExamSettings() {
    applyExamConfigToControls();
    ui.app.classList.remove("controls-open");
    openModal(ui.examSettingsModal);
  }

  function filterMathPalette(rawQuery) {
    const query = normalizeMathQuery(rawQuery);
    [ui.mathStructuresPanel, ui.mathSymbolsPanel].forEach((panel) => {
      filterMathPanel(panel, query);
    });
  }

  function filterMathPanel(panel, query) {
    if (!panel) {
      return;
    }
    const groups = Array.from(panel.querySelectorAll(".math-group"));
    let visibleCount = 0;
    groups.forEach((group) => {
      const buttons = Array.from(group.querySelectorAll(".math-insert-btn"));
      let groupVisible = false;
      buttons.forEach((button) => {
        const terms = button.dataset.search || "";
        const show = !query || terms.includes(query);
        button.hidden = !show;
        if (show) {
          groupVisible = true;
          visibleCount += 1;
        }
      });
      group.classList.toggle("hidden", !groupVisible);
    });

    let empty = panel.querySelector(".math-empty");
    if (visibleCount === 0) {
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "math-empty";
        empty.textContent = "No match found for this query.";
        panel.appendChild(empty);
      }
      return;
    }
    if (empty) {
      empty.remove();
    }
  }

  function normalizeMathQuery(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function buildMathButtonPreview(item) {
    const raw = typeof item.preview === "string" ? item.preview : buildMathTemplateExample(String(item.insert || item.label || ""));
    if (!raw) {
      return "";
    }
    const preview = raw.trim();
    if (!preview) {
      return "";
    }
    if (hasExplicitMathDelimiters(preview)) {
      return preview;
    }
    if (looksLikeLatex(preview)) {
      return "\\(" + preview + "\\)";
    }
    return preview;
  }

  function buildMathTemplateExample(template) {
    const raw = replaceToken(String(template || ""), MATH_CURSOR_TOKEN, "x");
    const withNext1 = replaceToken(raw, MATH_NEXT_1, "y");
    const withNext2 = replaceToken(withNext1, MATH_NEXT_2, "z");
    const normalized = replaceToken(withNext2, MATH_NEXT_3, "n").trim();
    if (!normalized) {
      return "";
    }
    return normalized
      .replace(/\\d?frac\{([A-Za-z0-9])\}\{([A-Za-z0-9])\}/g, (m, a, b) => m.startsWith("\\dfrac") ? "\\dfrac " + a + " " + b : "\\frac " + a + " " + b)
      .replace(/\\sqrt\{([A-Za-z0-9])\}/g, "\\sqrt $1")
      .replace(/\\sqrt\[([^\]]+)\]\{([A-Za-z0-9])\}/g, "\\sqrt[$1] $2")
      .replace(/\{([A-Za-z0-9])\}(?=\^|_)/g, "$1")
      .replace(/_\{([A-Za-z0-9])\}/g, "_$1")
      .replace(/\^\{([A-Za-z0-9])\}/g, "^$1");
  }

  function replaceToken(value, token, replacement) {
    if (!token) {
      return String(value || "");
    }
    return String(value || "").split(token).join(replacement);
  }

  function onMathNavClick(event) {
    const tabBtn = event.target.closest("[data-math-tab]");
    if (tabBtn) {
      activateMathTab(tabBtn.dataset.mathTab);
      return;
    }

    const insertBtn = event.target.closest(".math-insert-btn");
    if (!insertBtn) {
      return;
    }
    insertMathSnippet(insertBtn.dataset.example || insertBtn.dataset.insert || "");
  }

  function onEditorFocusIn(event) {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }
    if (target === ui.questionInput || target.classList.contains("option-textarea")) {
      editor.activeInput = target;
      refreshOptionToolbar();
    }
  }

  function resolveActiveEditorInput() {
    const previewMode = ui.app.classList.contains("editor-preview-mode");
    const isValidEditorInput = (node) => node instanceof HTMLTextAreaElement
      && (node === ui.questionInput || node.classList.contains("option-textarea"));
    const isMountedInEditorContext = (node) => ui.form.contains(node)
      || ui.questionFloatCard.contains(node)
      || ui.optionEditFloatCard.contains(node);
    const activeInput = editor.activeInput && isValidEditorInput(editor.activeInput) && isMountedInEditorContext(editor.activeInput)
      ? editor.activeInput
      : null;
    if (activeInput) {
      if (previewMode && ui.editorScroll && ui.editorScroll.contains(activeInput)) {
        return null;
      }
      return activeInput;
    }

    const activeEl = isValidEditorInput(document.activeElement) && isMountedInEditorContext(document.activeElement)
      ? document.activeElement
      : null;
    if (activeEl) {
      if (previewMode && ui.editorScroll && ui.editorScroll.contains(activeEl)) {
        return null;
      }
      return activeEl;
    }

    if (previewMode) {
      return null;
    }
    return ui.questionInput;
  }

  function insertMathSnippet(template) {
    const target = resolveActiveEditorInput();
    if (!target) {
      status("Focus question or option field first.", "error");
      return;
    }

    const start = Number.isInteger(target.selectionStart) ? target.selectionStart : target.value.length;
    const end = Number.isInteger(target.selectionEnd) ? target.selectionEnd : target.value.length;
    const selectedText = target.value.slice(start, end);
    let snippet = buildMathTemplateExample(template);
    if (!snippet) {
      return;
    }
    const firstX = snippet.indexOf("x");
    if (selectedText && firstX >= 0) {
      snippet = snippet.slice(0, firstX) + selectedText + snippet.slice(firstX + 1);
    }

    if (shouldWrapInInlineMath(target.value, start, template)) {
      snippet = "\\(" + snippet + "\\)";
    }

    const nextValue = target.value.slice(0, start) + snippet + target.value.slice(end);
    const editRange = findEditableRange(snippet);
    const selectionStart = start + editRange.start;
    const selectionEnd = start + editRange.end;

    target.value = nextValue;
    target.focus();
    target.setSelectionRange(selectionStart, selectionEnd);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function findEditableRange(snippet) {
    const match = /(^|[^a-zA-Z])(x|y|z|n|a|b|c)(?![a-zA-Z])/i.exec(snippet);
    if (!match) {
      const endPos = snippet.length;
      return { start: endPos, end: endPos };
    }
    const index = match.index + match[1].length;
    return { start: index, end: index + match[2].length };
  }

  function shouldWrapInInlineMath(text, cursor, template) {
    if (!template) {
      return false;
    }
    if (template.includes("\\(") || template.includes("\\[") || template.includes("$$")) {
      return false;
    }
    if (isCursorInsideMathExpression(text, cursor)) {
      return false;
    }
    return true;
  }

  function isCursorInsideMathExpression(text, cursor) {
    const safeCursor = Math.max(0, Math.min(cursor, text.length));
    const prefix = text.slice(0, safeCursor);
    const inlineDepth = tokenDelta(prefix, "\\(", "\\)");
    const blockDepth = tokenDelta(prefix, "\\[", "\\]");
    const dollarDepth = unescapedDollarCount(prefix) % 2;
    const doubleDollarDepth = unescapedDoubleDollarCount(prefix) % 2;
    return inlineDepth > 0 || blockDepth > 0 || dollarDepth === 1 || doubleDollarDepth === 1;
  }

  function tokenDelta(text, openToken, closeToken) {
    let depth = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (text.startsWith(openToken, index)) {
        depth += 1;
        index += openToken.length - 1;
        continue;
      }
      if (text.startsWith(closeToken, index)) {
        depth = Math.max(0, depth - 1);
        index += closeToken.length - 1;
      }
    }
    return depth;
  }

  function unescapedDollarCount(text) {
    let count = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== "$") {
        continue;
      }
      const prev = index > 0 ? text[index - 1] : "";
      const next = index < text.length - 1 ? text[index + 1] : "";
      if (prev === "\\") {
        continue;
      }
      if (next === "$") {
        index += 1;
        continue;
      }
      count += 1;
    }
    return count;
  }

  function unescapedDoubleDollarCount(text) {
    let count = 0;
    for (let index = 0; index < text.length - 1; index += 1) {
      if (text[index] !== "$" || text[index + 1] !== "$") {
        continue;
      }
      const prev = index > 0 ? text[index - 1] : "";
      if (prev === "\\") {
        continue;
      }
      count += 1;
      index += 1;
    }
    return count;
  }

  function markEditorTyping() {
    ui.app.classList.add("editor-typing");
    if (typingStateTimer) {
      clearTimeout(typingStateTimer);
    }
    typingStateTimer = window.setTimeout(() => {
      ui.app.classList.remove("editor-typing");
      typingStateTimer = null;
    }, TYPING_IDLE_MS);
  }

  function scheduleQuestionPreview() {
    if (questionPreviewTimer) {
      clearTimeout(questionPreviewTimer);
    }
    questionPreviewTimer = window.setTimeout(() => {
      questionPreviewTimer = null;
      renderQuestionPreview();
    }, PREVIEW_DEBOUNCE_MS);
  }

  function scheduleOptionPreview(previewElement, value, hintElement) {
    if (!previewElement) {
      return;
    }
    const pending = optionPreviewTimers.get(previewElement);
    if (pending) {
      clearTimeout(pending);
    }
    const timer = window.setTimeout(() => {
      optionPreviewTimers.delete(previewElement);
      renderOptionPreview(previewElement, value, hintElement);
    }, PREVIEW_DEBOUNCE_MS);
    optionPreviewTimers.set(previewElement, timer);
  }

  function renderQuestionPreview(options = {}) {
    renderMathPreview(ui.questionMathPreview, editor.draft.question, ui.questionMathHint, options);
  }

  function renderOptionPreview(previewElement, value, hintElement, options = {}) {
    renderMathPreview(previewElement, value, hintElement, options);
  }

  function renderQuestionFloatPreview(options = {}) {
    renderMathPreview(ui.questionFloatPreview, floatQuestionState.staged, null, options);
  }

  function renderOptionFloatPreview(options = {}) {
    renderMathPreview(ui.optionFloatPreview, floatOptionEditState.staged, null, options);
  }

  function renderMathPreview(previewElement, value, hintElement, options = {}) {
    if (!previewElement) {
      return;
    }
    const source = value || "";
    previewElement.textContent = toRenderableMathText(source);
    updateLatexHint(hintElement, source, Boolean(options.immediate));
    if (!containsMathSyntax(source)) {
      return;
    }
    if (options.immediate) {
      runMathTypeset(previewElement);
      return;
    }
    queueMathTypeset(previewElement);
  }

  function updateLatexHint(hintElement, value, strictMode) {
    if (!hintElement) {
      return;
    }
    const analysis = analyzeLatex(value, strictMode);
    hintElement.textContent = analysis.message;
    hintElement.dataset.state = analysis.state;
  }

  function analyzeLatex(value, strictMode) {
    const text = String(value || "");
    const trimmed = text.trim();
    if (!trimmed || !containsMathSyntax(trimmed)) {
      return { state: "idle", message: "" };
    }
    const braceBalance = tokenBalance(trimmed, "{", "}");
    if (braceBalance > 0) {
      return strictMode
        ? { state: "error", message: "Missing closing } in LaTeX expression." }
        : { state: "idle", message: "Keep typing to complete braces..." };
    }
    if (braceBalance < 0) {
      return strictMode
        ? { state: "error", message: "Extra } found in LaTeX expression." }
        : { state: "idle", message: "Keep typing to complete braces..." };
    }
    const inlineBalance = tokenBalance(trimmed, "\\(", "\\)");
    if (inlineBalance !== 0) {
      return strictMode
        ? { state: "error", message: "Unbalanced \\( ... \\) delimiter." }
        : { state: "idle", message: "Keep typing to complete delimiters..." };
    }
    const blockBalance = tokenBalance(trimmed, "\\[", "\\]");
    if (blockBalance !== 0) {
      return strictMode
        ? { state: "error", message: "Unbalanced \\[ ... \\] delimiter." }
        : { state: "idle", message: "Keep typing to complete delimiters..." };
    }
    return { state: "ok", message: strictMode ? "LaTeX looks valid." : "" };
  }

  function tokenBalance(text, openToken, closeToken) {
    let balance = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (text.startsWith(openToken, index)) {
        balance += 1;
        index += openToken.length - 1;
        continue;
      }
      if (text.startsWith(closeToken, index)) {
        balance -= 1;
        index += closeToken.length - 1;
      }
    }
    return balance;
  }

  function containsMathSyntax(value) {
    const text = String(value || "").trim();
    if (!text) {
      return false;
    }
    return hasExplicitMathDelimiters(text) || looksLikeLatex(text);
  }

  function toRenderableMathText(value) {
    const text = String(value || "");
    const trimmed = text.trim();
    if (!trimmed) {
      return text;
    }
    if (hasExplicitMathDelimiters(trimmed)) {
      return text;
    }
    if (looksLikeLatex(trimmed)) {
      return "\\(" + text + "\\)";
    }
    return text;
  }

  function hasExplicitMathDelimiters(text) {
    if (text.includes("\\(") || text.includes("\\[") || text.includes("$$")) {
      return true;
    }
    return hasPairedSingleDollar(text);
  }

  function hasPairedSingleDollar(text) {
    let count = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] !== "$") {
        continue;
      }
      const prev = index > 0 ? text[index - 1] : "";
      const next = index < text.length - 1 ? text[index + 1] : "";
      if (prev === "\\" || next === "$") {
        continue;
      }
      count += 1;
    }
    return count >= 2;
  }

  function looksLikeLatex(text) {
    return /\\[a-zA-Z]+/.test(text) || /\\[^a-zA-Z\s]/.test(text) || /[{}^_]/.test(text);
  }

  function emptyDraft() {
    return {
      question: "",
      topic: "",
      difficulty: "medium",
      marks: 1,
      tags: "",
      explanation: "",
      options: ["", "", "", ""],
      correctIndex: 0
    };
  }

  function sanitizeDifficulty(value) {
    const candidate = String(value || "").trim().toLowerCase();
    if (candidate === "easy" || candidate === "medium" || candidate === "hard") {
      return candidate;
    }
    return "medium";
  }

  function sanitizeMarks(value) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    return 1;
  }

  function sanitizeNegativeMarks(value) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed * 100) / 100;
    }
    return 0;
  }

  function parseTagText(input) {
    const parts = String(input || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set(parts));
  }

  function tagsToText(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return "";
    }
    return tags.join(", ");
  }

  function draftFromQuestion(question) {
    return {
      question: question.question,
      topic: question.topic || "",
      difficulty: sanitizeDifficulty(question.difficulty),
      marks: sanitizeMarks(question.marks),
      tags: tagsToText(question.tags),
      explanation: question.explanation || "",
      options: question.options.slice(),
      correctIndex: question.correctIndex
    };
  }

  function normalizeQuestionRecord(input, options = {}) {
    if (!input || typeof input !== "object") {
      return null;
    }
    const questionText = String(input.question || input.text || "").trim();
    const optionList = Array.isArray(input.options)
      ? input.options.map((opt) => String(opt || "").trim()).filter(Boolean)
      : [];
    if (!questionText || optionList.length < MIN_OPTIONS || optionList.length > MAX_OPTIONS) {
      return null;
    }
    const correctIndex = Number.isInteger(input.correctIndex)
      ? input.correctIndex
      : Number.isInteger(input.answerIndex)
        ? input.answerIndex
        : typeof input.correctAnswer === "string"
          ? optionList.indexOf(String(input.correctAnswer).trim())
          : -1;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= optionList.length) {
      return null;
    }
    const nowIso = new Date().toISOString();
    const shouldRegenerateId = Boolean(options.regenerateId);
    const idValue = shouldRegenerateId ? uid() : String(input.id || uid());
    return {
      id: idValue,
      question: questionText,
      options: optionList,
      correctIndex,
      topic: String(input.topic || "").trim(),
      difficulty: sanitizeDifficulty(input.difficulty),
      marks: sanitizeMarks(input.marks),
      tags: Array.isArray(input.tags) ? input.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : parseTagText(input.tags),
      explanation: String(input.explanation || "").trim(),
      createdAt: String(input.createdAt || nowIso),
      updatedAt: String(input.updatedAt || nowIso)
    };
  }

  function resetDraft() {
    editor.draft = emptyDraft();
    editor.snapshot = JSON.stringify(editor.draft);
    editor.dirty = false;
    editor.activeInput = ui.questionInput;
    renderEditor();
  }

  function scheduleHistoryFromDraft() {
    if (historySuspended) {
      return;
    }
    if (historyTimer) {
      clearTimeout(historyTimer);
    }
    historyTimer = window.setTimeout(() => {
      historyTimer = null;
      if (!editor.dirty) {
        return;
      }
      schedulePersistAppState();
    }, HISTORY_DEBOUNCE_MS);
  }

  function syncDirty() {
    editor.dirty = JSON.stringify(editor.draft) !== editor.snapshot;
    if (editor.dirty) {
      updateSaveState("unsaved");
    }
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
    ui.editorScroll.classList.add("preview-only-main");
    ui.app.classList.add("editor-preview-mode");
    closeAllEditorFloats();
    window.requestAnimationFrame(() => {
      ui.questionMathPreview.tabIndex = 0;
      ui.questionMathPreview.setAttribute("role", "button");
      ui.questionMathPreview.focus();
    });
  }

  function closeEditor(checkDirty) {
    if (checkDirty && !confirmDiscard()) {
      return false;
    }
    closeAllEditorFloats(true);
    ui.editorScroll.classList.remove("preview-only-main");
    ui.app.classList.remove("editor-preview-mode");
    if (questionPreviewTimer) {
      clearTimeout(questionPreviewTimer);
      questionPreviewTimer = null;
    }
    ui.app.classList.remove("editor-open");
    ui.app.classList.remove("editor-typing");
    ui.editorPanel.setAttribute("aria-hidden", "true");
    return true;
  }

  function updateEditorFloatVisibility() {
    const anyOpen = editorFloatActive !== null;
    ui.editorFloatBackdrop.hidden = !anyOpen;
    ui.questionFloatCard.hidden = editorFloatActive !== "question";
    ui.optionEditFloatCard.hidden = editorFloatActive !== "optionEdit";
  }

  function closeAllEditorFloats(discard = false) {
    if (editorFloatActive === "question") {
      closeQuestionFloat(discard);
      return;
    }
    if (editorFloatActive === "optionEdit") {
      closeOptionEditFloat(discard);
      return;
    }
  }

  function closeTopEditorFloat(discardChanges) {
    closeAllEditorFloats(Boolean(discardChanges));
  }

  function openQuestionFloat() {
    if (editorFloatActive) {
      return;
    }
    editorFloatActive = "question";
    floatQuestionState.baseline = String(editor.draft.question || "");
    floatQuestionState.staged = floatQuestionState.baseline;
    floatQuestionState.preSnapshot = editor.snapshot;
    floatQuestionState.preDirty = editor.dirty;
    floatQuestionState.preSaveState = { mode: saveState.mode, at: saveState.at };
    floatQuestionState.returnParent = ui.questionInput.parentElement;
    floatQuestionState.returnNextSibling = ui.questionInput.nextSibling;

    // Move the existing textarea into the floating editor container.
    ui.questionFloatInputMount.innerHTML = "";
    ui.questionFloatInputMount.appendChild(ui.questionInput);
    ui.questionInput.value = floatQuestionState.staged;
    renderQuestionFloatPreview({ immediate: true });

    ui.questionFloatCard.hidden = false;
    ui.optionEditFloatCard.hidden = true;
    ui.editorFloatBackdrop.hidden = false;

    editor.activeInput = ui.questionInput;
    window.requestAnimationFrame(() => {
      ui.questionInput.focus();
      const pos = ui.questionInput.value.length;
      ui.questionInput.setSelectionRange(pos, pos);
    });

    updateEditorFloatVisibility();
  }

  function closeQuestionFloat(discardChanges) {
    if (editorFloatActive !== "question") {
      return;
    }

    if (!discardChanges) {
      editor.draft.question = String(floatQuestionState.staged || "");
      syncDirty();
      scheduleHistoryFromDraft();
      renderQuestionPreview({ immediate: true });
    } else {
      editor.draft.question = String(floatQuestionState.baseline || "");
      editor.snapshot = floatQuestionState.preSnapshot;
      editor.dirty = floatQuestionState.preDirty;
      if (floatQuestionState.preSaveState) {
        saveState.mode = floatQuestionState.preSaveState.mode;
        saveState.at = floatQuestionState.preSaveState.at;
      }
      ui.questionInput.value = editor.draft.question;
      renderQuestionPreview({ immediate: true });
      updateSaveStatePill();
    }

    // Restore textarea back into its original location.
    if (floatQuestionState.returnParent) {
      const next = floatQuestionState.returnNextSibling;
      if (next && next.parentElement === floatQuestionState.returnParent) {
        floatQuestionState.returnParent.insertBefore(ui.questionInput, next);
      } else {
        floatQuestionState.returnParent.appendChild(ui.questionInput);
      }
    }

    editorFloatActive = null;
    editor.activeInput = null;
    ui.questionFloatInputMount.innerHTML = "";
    updateEditorFloatVisibility();
  }

  function openOptionEditFloat(optionIndex) {
    if (editorFloatActive) {
      return;
    }

    const textarea = ui.optionList.querySelector('textarea.option-textarea[data-option-index="' + String(optionIndex) + '"]');
    if (!textarea) {
      return;
    }

    editorFloatActive = "optionEdit";
    floatOptionEditState.optionIndex = optionIndex;
    floatOptionEditState.baseline = String(editor.draft.options[optionIndex] || "");
    floatOptionEditState.staged = floatOptionEditState.baseline;
    floatOptionEditState.preSnapshot = editor.snapshot;
    floatOptionEditState.preDirty = editor.dirty;
    floatOptionEditState.preSaveState = { mode: saveState.mode, at: saveState.at };

    floatOptionEditState.returnParent = textarea.parentElement;
    floatOptionEditState.returnNextSibling = textarea.nextSibling;

    ui.optionEditFloatInputMount.innerHTML = "";
    ui.optionEditFloatInputMount.appendChild(textarea);
    textarea.value = floatOptionEditState.staged;
    renderOptionFloatPreview({ immediate: true });
    refreshOptionFloatButtons();
    setOptionMathTargetsVisible(false);

    ui.optionEditFloatCard.hidden = false;
    ui.questionFloatCard.hidden = true;
    ui.editorFloatBackdrop.hidden = false;

    editor.activeInput = textarea;
    window.requestAnimationFrame(() => {
      textarea.focus();
      const pos = textarea.value.length;
      textarea.setSelectionRange(pos, pos);
    });

    updateEditorFloatVisibility();
  }

  function closeOptionEditFloat(discardChanges) {
    if (editorFloatActive !== "optionEdit") {
      return;
    }

    const optionIndex = floatOptionEditState.optionIndex;
    const textarea = ui.optionEditFloatInputMount.querySelector('textarea.option-textarea[data-option-index="' + String(optionIndex) + '"]');

    if (!discardChanges) {
      editor.draft.options[optionIndex] = String(floatOptionEditState.staged || "");
      syncDirty();
      scheduleHistoryFromDraft();
      const preview = ui.optionList.querySelector('.math-preview.option-preview[data-option-index="' + String(optionIndex) + '"]');
      const hint = ui.optionList.querySelector('.math-hint[data-option-index="' + String(optionIndex) + '"]');
      if (preview && hint) {
        renderOptionPreview(preview, editor.draft.options[optionIndex], hint, { immediate: true });
      } else if (preview) {
        renderOptionPreview(preview, editor.draft.options[optionIndex], null, { immediate: true });
      }
    } else if (textarea) {
      editor.draft.options[optionIndex] = String(floatOptionEditState.baseline || "");
      editor.snapshot = floatOptionEditState.preSnapshot;
      editor.dirty = floatOptionEditState.preDirty;
      if (floatOptionEditState.preSaveState) {
        saveState.mode = floatOptionEditState.preSaveState.mode;
        saveState.at = floatOptionEditState.preSaveState.at;
      }

      textarea.value = editor.draft.options[optionIndex];

      const preview = ui.optionList.querySelector('.math-preview.option-preview[data-option-index="' + String(optionIndex) + '"]');
      const hint = ui.optionList.querySelector('.math-hint[data-option-index="' + String(optionIndex) + '"]');
      if (preview && hint) {
        renderOptionPreview(preview, textarea.value, hint, { immediate: true });
      } else if (preview) {
        renderOptionPreview(preview, textarea.value, null, { immediate: true });
      }
      updateSaveStatePill();
    }

    if (floatOptionEditState.returnParent && textarea) {
      const next = floatOptionEditState.returnNextSibling;
      if (next && next.parentElement === floatOptionEditState.returnParent) {
        floatOptionEditState.returnParent.insertBefore(textarea, next);
      } else {
        floatOptionEditState.returnParent.appendChild(textarea);
      }
    }

    clearOptionMathHoldState();
    setOptionMathTargetsVisible(false);
    editorFloatActive = null;
    editor.activeInput = null;
    ui.optionEditFloatInputMount.innerHTML = "";
    updateEditorFloatVisibility();
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
    editor.draft = draftFromQuestion(question);
    editor.snapshot = JSON.stringify(editor.draft);
    editor.dirty = false;
    editor.activeInput = ui.questionInput;
    renderEditor();
    openEditor();
  }

  function renderEditor() {
    ui.questionInput.value = editor.draft.question;
    ui.topicInput.value = editor.draft.topic || "";
    ui.difficultySelect.value = sanitizeDifficulty(editor.draft.difficulty);
    ui.marksInput.value = String(sanitizeMarks(editor.draft.marks));
    ui.tagsInput.value = editor.draft.tags || "";
    ui.explanationInput.value = editor.draft.explanation || "";

    ui.optionList.innerHTML = "";
    renderQuestionPreview({ immediate: true });

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
        scheduleHistoryFromDraft();
      });

      const input = document.createElement("textarea");
      input.rows = 1;
      input.className = "option-textarea";
      input.placeholder = "Option " + String.fromCharCode(65 + index);
      input.value = optionText;
      input.dataset.optionIndex = String(index);
      input.addEventListener("input", (event) => {
        scheduleAutoResizeTextarea(event.target);
        const nextValue = event.target.value;
        if (editorFloatActive === "optionEdit" && floatOptionEditState.optionIndex === index) {
          floatOptionEditState.staged = nextValue;
          markEditorTyping();
          renderOptionFloatPreview();
          return;
        }
        editor.draft.options[index] = nextValue;
        markEditorTyping();
        scheduleOptionPreview(preview, nextValue, hint);
        syncDirty();
        scheduleHistoryFromDraft();
      });
      input.addEventListener("blur", () => {
        if (editorFloatActive === "optionEdit" && floatOptionEditState.optionIndex === index) {
          renderOptionFloatPreview({ immediate: true });
          return;
        }
        renderOptionPreview(preview, input.value, hint, { immediate: true });
      });
      input.addEventListener("keydown", onOptionInputKeydown);
      input.addEventListener("focus", () => {
        editor.activeInput = input;
        refreshOptionToolbar();
      });
      autoResizeTextarea(input);

      const optionContent = document.createElement("div");
      optionContent.className = "option-content";

      const preview = document.createElement("div");
      preview.className = "math-preview option-preview";
      preview.dataset.optionIndex = String(index);
      preview.setAttribute("role", "button");
      preview.tabIndex = 0;
      preview.addEventListener("click", () => {
        if (!ui.app.classList.contains("editor-preview-mode")) {
          return;
        }
        openOptionEditFloat(index);
      });
      preview.addEventListener("keydown", (event) => {
        if (!ui.app.classList.contains("editor-preview-mode")) {
          return;
        }
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        openOptionEditFloat(index);
      });
      const hint = document.createElement("p");
      hint.className = "math-hint";
      hint.setAttribute("aria-live", "polite");
      hint.dataset.optionIndex = String(index);
      renderOptionPreview(preview, optionText, hint);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "option-delete-btn";
      del.textContent = "Delete";
      del.disabled = editor.draft.options.length <= MIN_OPTIONS;
      del.addEventListener("click", () => removeOption(index));

      optionContent.append(input, preview, hint);
      row.append(radio, optionContent, del);
      ui.optionList.appendChild(row);
    });

    if (!editor.activeInput || !ui.form.contains(editor.activeInput)) {
      editor.activeInput = ui.questionInput;
    }
    refreshOptionToolbar();
  }

  function addOption() {
    if (editor.draft.options.length >= MAX_OPTIONS) {
      status("Maximum 6 options allowed.", "error");
      return;
    }
    editor.draft.options.push("");
    renderEditor();
    syncDirty();
    scheduleHistoryFromDraft();
    const optionInputs = getOptionInputs();
    const nextInput = optionInputs[optionInputs.length - 1];
    if (nextInput && !ui.app.classList.contains("editor-preview-mode")) {
      nextInput.focus();
      nextInput.setSelectionRange(0, 0);
      return;
    }
    const previews = ui.optionList.querySelectorAll(".math-preview.option-preview");
    const nextPreview = previews[previews.length - 1];
    if (nextPreview && ui.app.classList.contains("editor-preview-mode")) {
      nextPreview.focus();
    }
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
    const optionInput = event.currentTarget;
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
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

  function getActiveOptionIndex() {
    const active = resolveActiveEditorInput();
    if (!(active instanceof HTMLTextAreaElement) || !active.classList.contains("option-textarea")) {
      return -1;
    }
    const index = Number.parseInt(active.dataset.optionIndex || "", 10);
    return Number.isInteger(index) ? index : -1;
  }

  function moveActiveOption(direction) {
    if (direction !== -1 && direction !== 1) {
      return;
    }
    const currentIndex = getActiveOptionIndex();
    if (currentIndex < 0) {
      status("Focus an option row to move it.", "error");
      return;
    }
    const targetIndex = moveOptionByIndex(currentIndex, direction);
    if (targetIndex < 0) {
      return;
    }
    focusOptionInput(targetIndex, "end");
  }

  function moveOptionByIndex(optionIndex, direction) {
    if (direction !== -1 && direction !== 1) {
      return -1;
    }
    const targetIndex = optionIndex + direction;
    if (targetIndex < 0 || targetIndex >= editor.draft.options.length) {
      status(direction < 0 ? "Option is already at the top." : "Option is already at the bottom.");
      return -1;
    }

    const currentValue = editor.draft.options[optionIndex];
    editor.draft.options[optionIndex] = editor.draft.options[targetIndex];
    editor.draft.options[targetIndex] = currentValue;

    if (editor.draft.correctIndex === optionIndex) {
      editor.draft.correctIndex = targetIndex;
    } else if (editor.draft.correctIndex === targetIndex) {
      editor.draft.correctIndex = optionIndex;
    }

    renderEditor();
    syncDirty();
    scheduleHistoryFromDraft();
    status("Option moved.", "success");
    return targetIndex;
  }

  function refreshOptionFloatButtons() {
    const index = floatOptionEditState.optionIndex;
    const total = editor.draft.options.length;
    const valid = Number.isInteger(index) && index >= 0 && index < total;
    ui.floatOptionMoveUpBtn.disabled = !valid || index <= 0;
    ui.floatOptionMoveDownBtn.disabled = !valid || index >= total - 1;
    ui.floatOptionDeleteBtn.disabled = !valid || total <= MIN_OPTIONS;
  }

  function onFloatOptionMove(direction) {
    if (editorFloatActive !== "optionEdit") {
      return;
    }
    const optionIndex = floatOptionEditState.optionIndex;
    closeOptionEditFloat(true);
    moveOptionByIndex(optionIndex, direction);
  }

  function onFloatOptionDelete() {
    if (editorFloatActive !== "optionEdit") {
      return;
    }
    const optionIndex = floatOptionEditState.optionIndex;
    closeOptionEditFloat(true);
    removeOption(optionIndex);
  }

  function getQuestionMathUiByHost(host) {
    if (host === "float") {
      return {
        holdBtn: ui.floatQuestionMathHoldBtn,
        targetsWrap: ui.floatQuestionMathTargets,
        symbolsTarget: ui.floatQuestionMathSymbolsTarget,
        structuresTarget: ui.floatQuestionMathStructuresTarget
      };
    }
    return {
      holdBtn: ui.questionMathHoldBtn,
      targetsWrap: ui.questionMathTargets,
      symbolsTarget: ui.questionMathSymbolsTarget,
      structuresTarget: ui.questionMathStructuresTarget
    };
  }

  function clearQuestionMathHoldState() {
    if (questionMathHoldState.holdTimer) {
      clearTimeout(questionMathHoldState.holdTimer);
      questionMathHoldState.holdTimer = null;
    }
    questionMathHoldState.pointerId = null;
    questionMathHoldState.active = false;
    questionMathHoldState.lastClientX = 0;
    questionMathHoldState.lastClientY = 0;
    questionMathHoldState.host = "";
  }

  function setQuestionMathTargetsVisible(show, hostOverride) {
    const host = hostOverride || questionMathHoldState.host;
    const uiRef = getQuestionMathUiByHost(host);
    if (!uiRef.targetsWrap || !uiRef.symbolsTarget || !uiRef.structuresTarget) {
      return;
    }
    uiRef.targetsWrap.classList.toggle("active", show);
    uiRef.targetsWrap.setAttribute("aria-hidden", show ? "false" : "true");
    uiRef.symbolsTarget.classList.remove("is-hover");
    uiRef.structuresTarget.classList.remove("is-hover");
  }

  function getQuestionMathDropTarget(clientX, clientY) {
    const uiRef = getQuestionMathUiByHost(questionMathHoldState.host);
    const root = uiRef.targetsWrap;
    if (!root) {
      return "";
    }
    const hit = document.elementFromPoint(clientX, clientY);
    const target = hit ? hit.closest(".option-math-target[data-math-target]") : null;
    if (!target || !root.contains(target)) {
      return "";
    }
    return target.dataset.mathTarget === "symbols" ? "symbols" : target.dataset.mathTarget === "structures" ? "structures" : "";
  }

  function onQuestionMathHoldPointerDown(event, host) {
    const isInline = host === "inline";
    const isFloat = host === "float";
    const floatContextOk = isFloat && editorFloatActive === "question";
    const inlineContextOk = isInline && editorFloatActive !== "optionEdit";
    if (!window.matchMedia("(max-width: 740px)").matches || (!floatContextOk && !inlineContextOk)) {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    const uiRef = getQuestionMathUiByHost(host);
    if (!uiRef.holdBtn) {
      return;
    }
    event.preventDefault();
    clearQuestionMathHoldState();
    if (typeof uiRef.holdBtn.setPointerCapture === "function") {
      uiRef.holdBtn.setPointerCapture(event.pointerId);
    }
    questionMathHoldState.host = host;
    questionMathHoldState.pointerId = event.pointerId;
    questionMathHoldState.lastClientX = event.clientX;
    questionMathHoldState.lastClientY = event.clientY;
    questionMathHoldState.holdTimer = window.setTimeout(() => {
      questionMathHoldState.holdTimer = null;
      questionMathHoldState.active = true;
      setQuestionMathTargetsVisible(true);
    }, 240);
  }

  function onQuestionMathHoldPointerMove(event) {
    if (event.pointerId !== questionMathHoldState.pointerId) {
      return;
    }
    questionMathHoldState.lastClientX = event.clientX;
    questionMathHoldState.lastClientY = event.clientY;
    if (!questionMathHoldState.active) {
      return;
    }
    event.preventDefault();
    const target = getQuestionMathDropTarget(event.clientX, event.clientY);
    const uiRef = getQuestionMathUiByHost(questionMathHoldState.host);
    if (!uiRef.symbolsTarget || !uiRef.structuresTarget) {
      return;
    }
    uiRef.symbolsTarget.classList.toggle("is-hover", target === "symbols");
    uiRef.structuresTarget.classList.toggle("is-hover", target === "structures");
  }

  function onQuestionMathHoldPointerUp(event) {
    if (questionMathHoldState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const uiRef = getQuestionMathUiByHost(questionMathHoldState.host);
    if (uiRef.holdBtn
      && typeof uiRef.holdBtn.releasePointerCapture === "function"
      && typeof uiRef.holdBtn.hasPointerCapture === "function"
      && uiRef.holdBtn.hasPointerCapture(event.pointerId)) {
      uiRef.holdBtn.releasePointerCapture(event.pointerId);
    }
    const active = questionMathHoldState.active;
    const pointerX = Number.isFinite(event.clientX) && event.clientX !== 0 ? event.clientX : questionMathHoldState.lastClientX;
    const pointerY = Number.isFinite(event.clientY) && event.clientY !== 0 ? event.clientY : questionMathHoldState.lastClientY;
    const target = active ? getQuestionMathDropTarget(pointerX, pointerY) : "";
    const activeHost = questionMathHoldState.host;
    clearQuestionMathHoldState();
    setQuestionMathTargetsVisible(false, activeHost);
    if (target === "symbols") {
      openMathTools("symbols");
    } else if (target === "structures") {
      openMathTools("structures");
    }
  }

  function onQuestionMathHoldPointerCancel(event) {
    if (questionMathHoldState.pointerId !== event.pointerId) {
      return;
    }
    const uiRef = getQuestionMathUiByHost(questionMathHoldState.host);
    if (uiRef.holdBtn
      && typeof uiRef.holdBtn.releasePointerCapture === "function"
      && typeof uiRef.holdBtn.hasPointerCapture === "function"
      && uiRef.holdBtn.hasPointerCapture(event.pointerId)) {
      uiRef.holdBtn.releasePointerCapture(event.pointerId);
    }
    const activeHost = questionMathHoldState.host;
    clearQuestionMathHoldState();
    setQuestionMathTargetsVisible(false, activeHost);
  }

  function clearOptionMathHoldState() {
    if (optionMathHoldState.holdTimer) {
      clearTimeout(optionMathHoldState.holdTimer);
      optionMathHoldState.holdTimer = null;
    }
    optionMathHoldState.pointerId = null;
    optionMathHoldState.active = false;
    optionMathHoldState.lastClientX = 0;
    optionMathHoldState.lastClientY = 0;
  }

  function setOptionMathTargetsVisible(show) {
    ui.floatOptionMathTargets.classList.toggle("active", show);
    ui.floatOptionMathTargets.setAttribute("aria-hidden", show ? "false" : "true");
    ui.floatOptionMathSymbolsTarget.classList.remove("is-hover");
    ui.floatOptionMathStructuresTarget.classList.remove("is-hover");
  }

  function getOptionMathDropTarget(clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    const target = hit ? hit.closest(".option-math-target[data-math-target]") : null;
    if (!target) {
      return "";
    }
    return target.dataset.mathTarget === "symbols" ? "symbols" : target.dataset.mathTarget === "structures" ? "structures" : "";
  }

  function onOptionMathHoldPointerDown(event) {
    if (!window.matchMedia("(max-width: 740px)").matches || editorFloatActive !== "optionEdit") {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();
    clearOptionMathHoldState();
    if (typeof ui.floatOptionMathHoldBtn.setPointerCapture === "function") {
      ui.floatOptionMathHoldBtn.setPointerCapture(event.pointerId);
    }
    optionMathHoldState.pointerId = event.pointerId;
    optionMathHoldState.lastClientX = event.clientX;
    optionMathHoldState.lastClientY = event.clientY;
    optionMathHoldState.holdTimer = window.setTimeout(() => {
      optionMathHoldState.holdTimer = null;
      optionMathHoldState.active = true;
      setOptionMathTargetsVisible(true);
    }, 240);
  }

  function onOptionMathHoldPointerMove(event) {
    if (event.pointerId !== optionMathHoldState.pointerId) {
      return;
    }
    optionMathHoldState.lastClientX = event.clientX;
    optionMathHoldState.lastClientY = event.clientY;
    if (!optionMathHoldState.active) {
      return;
    }
    event.preventDefault();
    const target = getOptionMathDropTarget(event.clientX, event.clientY);
    ui.floatOptionMathSymbolsTarget.classList.toggle("is-hover", target === "symbols");
    ui.floatOptionMathStructuresTarget.classList.toggle("is-hover", target === "structures");
  }

  function onOptionMathHoldPointerUp(event) {
    if (optionMathHoldState.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    if (typeof ui.floatOptionMathHoldBtn.releasePointerCapture === "function"
      && typeof ui.floatOptionMathHoldBtn.hasPointerCapture === "function"
      && ui.floatOptionMathHoldBtn.hasPointerCapture(event.pointerId)) {
      ui.floatOptionMathHoldBtn.releasePointerCapture(event.pointerId);
    }
    const active = optionMathHoldState.active;
    const pointerX = Number.isFinite(event.clientX) && event.clientX !== 0 ? event.clientX : optionMathHoldState.lastClientX;
    const pointerY = Number.isFinite(event.clientY) && event.clientY !== 0 ? event.clientY : optionMathHoldState.lastClientY;
    const target = active ? getOptionMathDropTarget(pointerX, pointerY) : "";
    clearOptionMathHoldState();
    setOptionMathTargetsVisible(false);
    if (target === "symbols") {
      openMathTools("symbols");
    } else if (target === "structures") {
      openMathTools("structures");
    }
  }

  function onOptionMathHoldPointerCancel(event) {
    if (optionMathHoldState.pointerId !== event.pointerId) {
      return;
    }
    if (typeof ui.floatOptionMathHoldBtn.releasePointerCapture === "function"
      && typeof ui.floatOptionMathHoldBtn.hasPointerCapture === "function"
      && ui.floatOptionMathHoldBtn.hasPointerCapture(event.pointerId)) {
      ui.floatOptionMathHoldBtn.releasePointerCapture(event.pointerId);
    }
    clearOptionMathHoldState();
    setOptionMathTargetsVisible(false);
  }

  function refreshOptionToolbar() {
    const optionCount = editor.draft.options.length;
    const activeIndex = getActiveOptionIndex();
    const hasActiveOption = activeIndex >= 0 && activeIndex < optionCount;
    ui.optionMoveUpBtn.disabled = !hasActiveOption || activeIndex <= 0;
    ui.optionMoveDownBtn.disabled = !hasActiveOption || activeIndex >= optionCount - 1;
    if (!hasActiveOption) {
      ui.optionToolbarHint.textContent = "Focus an option to move it.";
      return;
    }
    ui.optionToolbarHint.textContent = "Selected: Option " + String.fromCharCode(65 + activeIndex) + " (row " + (activeIndex + 1) + " of " + optionCount + ")";
  }

  function focusOptionInput(index, caret) {
    const optionInputs = getOptionInputs();
    const input = optionInputs[index];
    if (!input) {
      return;
    }
    input.focus();
    editor.activeInput = input;
    const position = caret === "end" ? input.value.length : 0;
    input.setSelectionRange(position, position);
    refreshOptionToolbar();
  }

  function autoResizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.max(40, textarea.scrollHeight) + "px";
  }

  function scheduleAutoResizeTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }
    const pendingFrame = resizeFrameTimers.get(textarea);
    if (pendingFrame) {
      window.cancelAnimationFrame(pendingFrame);
    }
    const frame = window.requestAnimationFrame(() => {
      resizeFrameTimers.delete(textarea);
      autoResizeTextarea(textarea);
    });
    resizeFrameTimers.set(textarea, frame);
  }

  function focusQuestionInput(caret) {
    ui.questionInput.focus();
    editor.activeInput = ui.questionInput;
    const position = caret === "end" ? ui.questionInput.value.length : 0;
    ui.questionInput.setSelectionRange(position, position);
    refreshOptionToolbar();
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
    scheduleHistoryFromDraft();
  }

  function cancelEdit() {
    if (!confirmDiscard()) {
      return;
    }
    if (selectedQuestionId) {
      const current = questions.find((item) => item.id === selectedQuestionId);
      if (current) {
        editor.draft = draftFromQuestion(current);
      } else {
        selectedQuestionId = null;
        editor.draft = emptyDraft();
      }
    } else {
      editor.draft = emptyDraft();
    }
    editor.snapshot = JSON.stringify(editor.draft);
    editor.dirty = false;
    editor.activeInput = ui.questionInput;
    renderEditor();
    closeEditor(false);
  }

  function validateDraft() {
    const question = editor.draft.question.trim();
    const options = editor.draft.options.map((option) => option.trim());
    const topic = editor.draft.topic.trim();
    const difficulty = sanitizeDifficulty(editor.draft.difficulty);
    const marks = sanitizeMarks(editor.draft.marks);
    const tags = parseTagText(editor.draft.tags);
    const explanation = editor.draft.explanation.trim();

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
        correctIndex: editor.draft.correctIndex,
        topic,
        difficulty,
        marks,
        tags,
        explanation
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

    recordHistoryBeforeMutation();

    if (selectedQuestionId) {
      const index = questions.findIndex((item) => item.id === selectedQuestionId);
      if (index >= 0) {
        questions[index] = {
          ...questions[index],
          ...result.payload,
          updatedAt: new Date().toISOString()
        };
      } else {
        selectedQuestionId = null;
      }
    }

    if (!selectedQuestionId) {
      const nowIso = new Date().toISOString();
      const created = {
        id: uid(),
        ...result.payload,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      questions.push(created);
      selectedQuestionId = created.id;
    }

    const current = questions.find((item) => item.id === selectedQuestionId);
    if (current) {
      editor.draft = draftFromQuestion(current);
      editor.snapshot = JSON.stringify(editor.draft);
      editor.dirty = false;
    }

    renderAll();
    closeEditor(false);
    schedulePersistAppState();
    status("Question saved.", "success");
  }

  function uid() {
    return "q_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function renderAll() {
    pruneSelectedQuestionIds();
    renderTopicFilterOptions();
    const duplicateMap = buildDuplicateMap(questions);
    const filteredQuestions = getFilteredQuestions(questions, duplicateMap);
    renderCards(filteredQuestions, duplicateMap);
    renderStats(questions, duplicateMap, filteredQuestions.length);
    const totalCount = questions.length;
    const selectedCount = selectedQuestionIds.size;
    ui.count.textContent = totalCount + (totalCount === 1 ? " question" : " questions");
    ui.selectedCount.textContent = selectedCount + (selectedCount === 1 ? " selected" : " selected");
    schedulePersistAppState();
    updateHistoryButtons();
  }

  function renderCards(viewList, duplicateMap) {
    ui.cards.innerHTML = "";
    if (questions.length === 0) {
      const empty = document.createElement("article");
      empty.className = "empty-card";
      empty.innerHTML = "<h3>No questions yet</h3><p>Use System Controls to add your first question.</p>";
      ui.cards.appendChild(empty);
      return;
    }

    if (!Array.isArray(viewList) || viewList.length === 0) {
      const empty = document.createElement("article");
      empty.className = "empty-card";
      empty.innerHTML = "<h3>No matching questions</h3><p>Adjust filters to see results.</p>";
      ui.cards.appendChild(empty);
      return;
    }

    viewList.forEach((question) => {
      const card = document.createElement("article");
      const cardClasses = ["question-card"];
      if (selectedQuestionIds.has(question.id)) {
        cardClasses.push("selected");
      }
      if (duplicateMap.get(question.id)) {
        cardClasses.push("duplicate");
      }
      card.className = cardClasses.join(" ");
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
      order.textContent = "#" + (questions.findIndex((item) => item.id === question.id) + 1);
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
      meta.textContent = question.options.length + " options | " + sanitizeMarks(question.marks) + " mark(s)";

      const badges = document.createElement("div");
      badges.className = "card-badges";
      if (question.topic) {
        const topicBadge = document.createElement("span");
        topicBadge.className = "badge";
        topicBadge.textContent = question.topic;
        badges.appendChild(topicBadge);
      }
      const levelBadge = document.createElement("span");
      levelBadge.className = "badge level-" + sanitizeDifficulty(question.difficulty);
      levelBadge.textContent = sanitizeDifficulty(question.difficulty);
      badges.appendChild(levelBadge);
      if (Array.isArray(question.tags) && question.tags.length > 0) {
        question.tags.slice(0, 3).forEach((tag) => {
          const tagBadge = document.createElement("span");
          tagBadge.className = "badge";
          tagBadge.textContent = "#" + tag;
          badges.appendChild(tagBadge);
        });
      }

      const optionsList = document.createElement("ul");
      optionsList.className = "card-options";
      question.options.forEach((option, optionIndex) => {
        const optionItem = document.createElement("li");
        optionItem.className = "card-option";
        optionItem.textContent = String.fromCharCode(65 + optionIndex) + ". " + toRenderableMathText(option);
        optionsList.appendChild(optionItem);
      });

      head.append(label, edit);
      card.append(head, preview, meta, badges, optionsList);
      ui.cards.appendChild(card);
      if (containsMathSyntax(question.question) || question.options.some((option) => containsMathSyntax(option))) {
        queueMathTypeset(card);
      }
    });
  }

  function renderTopicFilterOptions() {
    const currentValue = ui.topicFilterSelect.value;
    const topics = Array.from(new Set(
      questions
        .map((item) => String(item.topic || "").trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
    ui.topicFilterSelect.innerHTML = "<option value=\"\">All Topics</option>";
    topics.forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      ui.topicFilterSelect.appendChild(option);
    });
    if (topics.includes(currentValue)) {
      ui.topicFilterSelect.value = currentValue;
    } else if (!topics.includes(filters.topic)) {
      filters.topic = "";
      ui.topicFilterSelect.value = "";
    } else {
      ui.topicFilterSelect.value = filters.topic;
    }
  }

  function buildDuplicateMap(list) {
    const groups = new Map();
    list.forEach((item) => {
      const key = String(item.question || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (!key) {
        return;
      }
      const group = groups.get(key) || [];
      group.push(item.id);
      groups.set(key, group);
    });
    const duplicateMap = new Map();
    groups.forEach((ids) => {
      if (ids.length < 2) {
        return;
      }
      ids.forEach((id) => duplicateMap.set(id, true));
    });
    return duplicateMap;
  }

  function getFilteredQuestions(list, duplicateMap) {
    const query = String(filters.query || "").trim().toLowerCase();
    return list.filter((item) => {
      if (filters.topic && item.topic !== filters.topic) {
        return false;
      }
      if (filters.difficulty && sanitizeDifficulty(item.difficulty) !== filters.difficulty) {
        return false;
      }
      if (filters.duplicatesOnly && !duplicateMap.get(item.id)) {
        return false;
      }
      if (!query) {
        return true;
      }
      const text = [
        item.question,
        item.topic,
        (item.tags || []).join(" "),
        item.options.join(" ")
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }

  function renderStats(fullList, duplicateMap, filteredCount) {
    const easyCount = fullList.filter((item) => sanitizeDifficulty(item.difficulty) === "easy").length;
    const mediumCount = fullList.filter((item) => sanitizeDifficulty(item.difficulty) === "medium").length;
    const hardCount = fullList.filter((item) => sanitizeDifficulty(item.difficulty) === "hard").length;
    let totalMarks = 0;
    fullList.forEach((item) => {
      totalMarks += sanitizeMarks(item.marks);
    });
    const health = buildHealthSummary(fullList, duplicateMap);
    const cards = [
      { title: "Filtered", value: String(filteredCount) },
      { title: "Duplicates", value: String(duplicateMap.size) },
      { title: "Difficulty", value: "E " + easyCount + " / M " + mediumCount + " / H " + hardCount },
      { title: "Total Marks", value: String(totalMarks) },
      { title: "Missing Topics", value: String(health.missingTopics) },
      { title: "Missing Explanations", value: String(health.missingExplanations) },
      { title: "Readiness", value: health.readiness + "%" }
    ];
    ui.statsGrid.innerHTML = "";
    cards.forEach((item) => {
      const card = document.createElement("article");
      card.className = "stat-card";
      const title = document.createElement("h3");
      title.textContent = item.title;
      const value = document.createElement("p");
      value.textContent = item.value;
      card.append(title, value);
      ui.statsGrid.appendChild(card);
    });
  }

  function buildHealthSummary(list, duplicateMap) {
    const missingTopics = list.filter((item) => !String(item.topic || "").trim()).length;
    const missingExplanations = list.filter((item) => !String(item.explanation || "").trim()).length;
    const duplicateCount = duplicateMap ? duplicateMap.size : 0;
    const checks = Math.max(1, (list.length * 2) + Math.max(1, duplicateCount));
    const issueScore = missingTopics + missingExplanations + duplicateCount;
    const readiness = Math.max(0, Math.round(((checks - issueScore) / checks) * 100));
    return {
      missingTopics,
      missingExplanations,
      duplicateCount,
      readiness
    };
  }

  function pruneSelectedQuestionIds() {
    const validIds = new Set(questions.map((item) => item.id));
    selectedQuestionIds.forEach((id) => {
      if (!validIds.has(id)) {
        selectedQuestionIds.delete(id);
      }
    });
    if (selectedQuestionId && !validIds.has(selectedQuestionId)) {
      selectedQuestionId = null;
    }
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
    renderAll();
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
    recordHistoryBeforeMutation();
    const [moved] = questions.splice(from, 1);
    const insertAt = from < to ? to : to + 1;
    questions.splice(insertAt, 0, moved);
    schedulePersistAppState();
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
    recordHistoryBeforeMutation();
    questions = questions.filter((item) => item.id !== selectedQuestionId);
    selectedQuestionIds.delete(selectedQuestionId);
    selectedQuestionId = null;
    resetDraft();
    closeEditor(false);
    renderAll();
    schedulePersistAppState();
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
    recordHistoryBeforeMutation();
    questions = questions.filter((item) => !selectedQuestionIds.has(item.id));
    if (selectedQuestionId && selectedQuestionIds.has(selectedQuestionId)) {
      selectedQuestionId = null;
      resetDraft();
      closeEditor(false);
    }
    selectedQuestionIds = new Set();
    renderAll();
    schedulePersistAppState();
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
        const importResult = normalizeImportPayload(payload);
        if (importResult.items.length === 0) {
          status("No valid questions found in JSON.", "error");
          showImportReport(importResult.report);
          return;
        }
        recordHistoryBeforeMutation();
        questions = [...questions, ...importResult.items];
        renderAll();
        schedulePersistAppState();
        status(importResult.items.length + " question(s) appended from JSON.", "success");
        showImportReport(importResult.report);
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
    const report = {
      total: list.length,
      imported: 0,
      rejected: 0,
      reasons: []
    };
    const items = [];
    list.forEach((item, index) => {
      const result = normalizeImportItem(item, { regenerateId: true, withReason: true });
      if (result.item) {
        items.push(result.item);
        report.imported += 1;
      } else {
        report.rejected += 1;
        if (result.reason) {
          report.reasons.push("Item " + (index + 1) + ": " + result.reason);
        }
      }
    });
    return { items, report };
  }

  function normalizeImportItem(item, options = {}) {
    const normalized = normalizeQuestionRecord(item, { regenerateId: Boolean(options.regenerateId) });
    if (normalized) {
      return { item: normalized, reason: "" };
    }
    if (!options.withReason) {
      return { item: null, reason: "" };
    }
    if (!item || typeof item !== "object") {
      return { item: null, reason: "Invalid object." };
    }
    if (!item.question && !item.text) {
      return { item: null, reason: "Missing question text." };
    }
    if (!Array.isArray(item.options)) {
      return { item: null, reason: "Options must be an array." };
    }
    return { item: null, reason: "Invalid options or correct answer index." };
  }

  async function exportSelectedJson() {
    const selected = questions.filter((item) => selectedQuestionIds.has(item.id));
    if (selected.length === 0) {
      status("No selected questions for export.", "error");
      return;
    }
    await exportJson(selected, "selected-questions.json");
  }

  async function exportJson(list, fileName) {
    if (list.length === 0) {
      status("No questions available for export.", "error");
      return;
    }
    const output = list.map((item) => ({
      id: item.id,
      question: item.question,
      options: item.options.slice(),
      correctIndex: item.correctIndex,
      topic: item.topic || "",
      difficulty: sanitizeDifficulty(item.difficulty),
      marks: sanitizeMarks(item.marks),
      tags: Array.isArray(item.tags) ? item.tags.slice() : [],
      explanation: item.explanation || "",
      createdAt: item.createdAt || "",
      updatedAt: item.updatedAt || ""
    }));
    const payload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      questions: output
    };
    const mode = await download(fileName, JSON.stringify(payload, null, 2), "application/json");
    statusAfterFileExport(mode, fileName, "JSON export ready.");
  }

  async function exportAnswerKeyJson() {
    if (questions.length === 0) {
      status("No questions available for answer key export.", "error");
      return;
    }
    const key = questions.map((item, index) => ({
      number: index + 1,
      id: item.id,
      topic: item.topic || "",
      difficulty: sanitizeDifficulty(item.difficulty),
      marks: sanitizeMarks(item.marks),
      correctIndex: item.correctIndex,
      correctOption: item.options[item.correctIndex] || ""
    }));
    const mode = await download("answer-key.json", JSON.stringify(key, null, 2), "application/json");
    statusAfterFileExport(mode, "answer-key.json", "Answer key export ready.");
  }

  function onExamConfigChange() {
    examConfig.preset = ui.examPresetSelect.value in EXAM_PRESETS ? ui.examPresetSelect.value : "quick";
    examConfig.security.fullscreen = Boolean(ui.securityFullscreenToggle.checked);
    examConfig.security.navWarn = Boolean(ui.securityNavWarnToggle.checked);
    examConfig.security.token = Boolean(ui.securityTokenToggle.checked);
    examConfig.branding.institution = ui.institutionInput.value.trim();
    examConfig.branding.subject = ui.subjectInput.value.trim();
    examConfig.branding.examCode = ui.examCodeInput.value.trim();
    examConfig.branding.showStudentInfo = Boolean(ui.studentInfoToggle.checked);
    examConfig.marking.negative = sanitizeNegativeMarks(ui.negativeMarksInput.value);
    schedulePersistAppState();
  }

  function applyExamConfigToControls() {
    if (!(examConfig.preset in EXAM_PRESETS)) {
      examConfig.preset = "quick";
    }
    ui.examPresetSelect.value = examConfig.preset;
    ui.securityFullscreenToggle.checked = Boolean(examConfig.security.fullscreen);
    ui.securityNavWarnToggle.checked = Boolean(examConfig.security.navWarn);
    ui.securityTokenToggle.checked = Boolean(examConfig.security.token);
    ui.institutionInput.value = examConfig.branding.institution || "";
    ui.subjectInput.value = examConfig.branding.subject || "";
    ui.examCodeInput.value = examConfig.branding.examCode || "";
    ui.studentInfoToggle.checked = examConfig.branding.showStudentInfo !== false;
    ui.negativeMarksInput.value = String(sanitizeNegativeMarks(examConfig.marking.negative));
  }

  function onFilterChange() {
    filters.query = ui.questionSearchInput.value.trim();
    filters.topic = ui.topicFilterSelect.value;
    filters.difficulty = ui.difficultyFilterSelect.value;
    filters.duplicatesOnly = ui.showDuplicatesToggle.checked;
    renderAll();
  }

  function applyFiltersToControls() {
    ui.questionSearchInput.value = filters.query;
    ui.topicFilterSelect.value = filters.topic;
    ui.difficultyFilterSelect.value = filters.difficulty;
    ui.showDuplicatesToggle.checked = filters.duplicatesOnly;
  }

  function assignTagToSelected() {
    if (selectedQuestionIds.size === 0) {
      status("Select questions before assigning tags.", "error");
      return;
    }
    const entered = window.prompt("Enter tag to append for selected questions");
    if (entered === null) {
      return;
    }
    const tag = entered.trim();
    if (!tag) {
      status("Tag cannot be empty.", "error");
      return;
    }
    recordHistoryBeforeMutation();
    let changed = 0;
    questions = questions.map((item) => {
      if (!selectedQuestionIds.has(item.id)) {
        return item;
      }
      const tags = Array.isArray(item.tags) ? item.tags.slice() : [];
      if (tags.includes(tag)) {
        return item;
      }
      changed += 1;
      return {
        ...item,
        tags: tags.concat(tag),
        updatedAt: new Date().toISOString()
      };
    });
    renderAll();
    schedulePersistAppState();
    status("Tag applied to " + changed + " question(s).", "success");
  }

  function cloneSelectedQuestions() {
    const selected = questions.filter((item) => selectedQuestionIds.has(item.id));
    if (selected.length === 0) {
      status("Select questions to clone.", "error");
      return;
    }
    recordHistoryBeforeMutation();
    const nowIso = new Date().toISOString();
    const clones = selected.map((item) => ({
      ...item,
      id: uid(),
      createdAt: nowIso,
      updatedAt: nowIso
    }));
    questions = questions.concat(clones);
    selectedQuestionIds = new Set(clones.map((item) => item.id));
    renderAll();
    schedulePersistAppState();
    status(clones.length + " question(s) cloned.", "success");
  }

  function shuffleSelectedQuestions() {
    const indices = [];
    const selectedItems = [];
    questions.forEach((item, index) => {
      if (selectedQuestionIds.has(item.id)) {
        indices.push(index);
        selectedItems.push(item);
      }
    });
    if (selectedItems.length < 2) {
      status("Select at least 2 questions to shuffle.", "error");
      return;
    }
    recordHistoryBeforeMutation();
    const shuffled = shuffleArray(selectedItems.slice());
    indices.forEach((index, itemPos) => {
      questions[index] = shuffled[itemPos];
    });
    renderAll();
    schedulePersistAppState();
    status("Selected questions shuffled.", "success");
  }

  function shuffleArray(arr) {
    for (let index = arr.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const temp = arr[index];
      arr[index] = arr[randomIndex];
      arr[randomIndex] = temp;
    }
    return arr;
  }

  function generateExamFile() {
    if (questions.length === 0) {
      status("Add questions before creating exam file.", "error");
      return;
    }
    const preflight = runPreflightValidation();
    if (preflight.errors.length > 0 || preflight.warnings.length > 0) {
      pendingExamCreation = () => {
        createExamFileAfterPreflight();
      };
      showPreflight(preflight);
      return;
    }
    createExamFileAfterPreflight();
  }

  async function createExamFileAfterPreflight() {
    const enteredTitle = window.prompt("Enter exam title", DEFAULT_EXAM_TITLE);
    if (enteredTitle === null) {
      return;
    }
    const examTitle = enteredTitle.trim() || DEFAULT_EXAM_TITLE;
    const examData = questions.map((item) => ({
      id: item.id,
      question: item.question,
      options: item.options.slice(),
      correctIndex: item.correctIndex,
      topic: item.topic || "",
      difficulty: sanitizeDifficulty(item.difficulty),
      marks: sanitizeMarks(item.marks),
      tags: Array.isArray(item.tags) ? item.tags.slice() : [],
      explanation: item.explanation || ""
    }));
    const htmlBase = buildExamHtml(examTitle, examData, examConfig);
    const safeTitle = JSON.stringify(examTitle);
    const safeData = JSON.stringify(examData).replace(/</g, "\\u003c");
    const safeConfig = JSON.stringify(examConfig && typeof examConfig === "object" ? examConfig : {
      preset: "quick",
      security: { fullscreen: false, navWarn: true, token: true },
      branding: { institution: "", subject: "", examCode: "", showStudentInfo: true },
      marking: { negative: 0 }
    }).replace(/</g, "\\u003c");
    const html = await applyExamExternalAssets(htmlBase, {
      safeTitle,
      safeData,
      safeConfig
    });
    const mode = await download("exam.html", html, "text/html");
    closeModal(ui.preflightModal);
    statusAfterFileExport(mode, "exam.html", "Standalone exam file ready.");
  }

  function runPreflightValidation() {
    const errors = [];
    const warnings = [];
    if (questions.length === 0) {
      errors.push("No questions available.");
    }
    const duplicateMap = buildDuplicateMap(questions);
    const health = buildHealthSummary(questions, duplicateMap);
    if (duplicateMap.size > 0) {
      warnings.push(duplicateMap.size + " duplicate question(s) detected.");
    }
    questions.forEach((item, index) => {
      if (item.options.length < MIN_OPTIONS || item.options.length > MAX_OPTIONS) {
        errors.push("Q" + (index + 1) + ": option count must be between " + MIN_OPTIONS + " and " + MAX_OPTIONS + ".");
      }
      if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex >= item.options.length) {
        errors.push("Q" + (index + 1) + ": invalid correct answer index.");
      }
      if (!item.question.trim()) {
        errors.push("Q" + (index + 1) + ": missing question text.");
      }
      if (!item.topic) {
        warnings.push("Q" + (index + 1) + ": topic is empty.");
      }
    });
    return { errors, warnings, readiness: health.readiness, health };
  }

  function showPreflight(preflight) {
    const fragment = document.createDocumentFragment();
    const summary = document.createElement("p");
    summary.innerHTML = "<strong>Publish readiness</strong>: " + preflight.readiness + "%";
    fragment.appendChild(summary);
    if (preflight.errors.length > 0) {
      const title = document.createElement("p");
      title.innerHTML = "<strong>Blocking errors</strong>";
      fragment.appendChild(title);
      const list = document.createElement("ul");
      preflight.errors.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      fragment.appendChild(list);
    }
    if (preflight.warnings.length > 0) {
      const title = document.createElement("p");
      title.innerHTML = "<strong>Warnings</strong>";
      fragment.appendChild(title);
      const list = document.createElement("ul");
      preflight.warnings.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      fragment.appendChild(list);
    }
    if (preflight.errors.length === 0 && preflight.warnings.length === 0) {
      const ok = document.createElement("p");
      ok.textContent = "No issues found.";
      fragment.appendChild(ok);
    }
    ui.preflightContent.innerHTML = "";
    ui.preflightContent.appendChild(fragment);
    ui.continuePreflightBtn.disabled = preflight.errors.length > 0;
    openModal(ui.preflightModal);
  }

  function continuePreflight() {
    closeModal(ui.preflightModal);
    if (typeof pendingExamCreation === "function") {
      const next = pendingExamCreation;
      pendingExamCreation = null;
      next();
    }
  }

  function cancelPreflight() {
    pendingExamCreation = null;
    closeModal(ui.preflightModal);
    status("Exam generation cancelled.");
  }

  async function fetchText(url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res || !res.ok) {
        return null;
      }
      return await res.text();
    } catch (_error) {
      return null;
    }
  }

  function replaceExamStyle(html, cssText) {
    if (typeof html !== "string" || !cssText) {
      return html;
    }
    return html.replace(/<style>[\s\S]*?<\/style>/m, "<style>\n" + cssText + "\n</style>");
  }

  function replaceExamRuntimeScript(html, runtimeJs) {
    if (typeof html !== "string" || !runtimeJs) {
      return html;
    }
    const marker = "const examTitle =";
    const idx = html.indexOf(marker);
    if (idx === -1) {
      return html;
    }
    const scriptStart = html.lastIndexOf("<script", idx);
    if (scriptStart === -1) {
      return html;
    }
    const tagClose = html.indexOf(">", scriptStart);
    const scriptEnd = html.indexOf("</script>", idx);
    if (tagClose === -1 || scriptEnd === -1) {
      return html;
    }
    return html.slice(0, tagClose + 1) + "\n" + runtimeJs + "\n" + html.slice(scriptEnd);
  }

  async function applyExamExternalAssets(htmlBase, payload) {
    const cssUrl = "css/exam-runtime/exam-runtime.css";
    const runtimeUrl = "js/exam-runtime/exam-runtime.js";

    const [cssText, runtimeText] = await Promise.all([fetchText(cssUrl), fetchText(runtimeUrl)]);
    if (!cssText || !runtimeText) {
      return htmlBase;
    }

    const runtimeJs = String(runtimeText)
      .replace(/__EXAM_TITLE__/g, payload.safeTitle)
      .replace(/__EXAM_DATA__/g, payload.safeData)
      .replace(/__EXAM_CONFIG__/g, payload.safeConfig);

    let html = htmlBase;
    html = replaceExamStyle(html, String(cssText));
    html = replaceExamRuntimeScript(html, runtimeJs);
    return html;
  }

  async function download(fileName, content, mime) {
    try {
      const el = document.querySelector("script[data-legacy-admin='true']");
      const base = el && el.src ? el.src : "";
      const modHref = base
        ? new URL("../../platform/nativeFileExport.js", base).href
        : "./js/platform/nativeFileExport.js";
      const mod = await import(modHref);
      if (mod && typeof mod.shareFileNative === "function") {
        const native = await mod.shareFileNative(fileName, content);
        if (native === "share-file" || native === "cancelled") {
          return native;
        }
      }
    } catch (e) {
      /* Web / desktop: Capacitor vendor not present */
    }

    const blob = new Blob([content], { type: mime + ";charset=utf-8" });

    const anchorDownload = () => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
      try {
        const file = new File([blob], fileName, { type: mime || "application/octet-stream" });
        const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] });
        if (canShareFiles) {
          await navigator.share({ files: [file], title: fileName });
          return "share-file";
        }
      } catch (err) {
        if (err && err.name === "AbortError") {
          return "cancelled";
        }
      }
      try {
        const str = typeof content === "string" ? content : String(content);
        if (str.length > 0 && str.length < 900000) {
          const canShareText = !navigator.canShare || navigator.canShare({ text: str });
          if (canShareText) {
            await navigator.share({ title: fileName, text: str });
            return "share-text";
          }
        }
      } catch (err2) {
        if (err2 && err2.name === "AbortError") {
          return "cancelled";
        }
      }
    }

    anchorDownload();
    return "download";
  }

  function statusAfterFileExport(mode, fileName, savedLabel) {
    if (mode === "cancelled") {
      status("Export cancelled — nothing was saved.", "info");
      return;
    }
    if (mode === "share-file" || mode === "share-text") {
      status(
        "In the share sheet, pick where to save " + fileName + " (e.g. Files, Drive, or Save to Downloads). The app does not choose a folder for you.",
        "success"
      );
      return;
    }
    status(savedLabel + " Look in your browser's Downloads folder for " + fileName + ".", "success");
  }

  async function download(fileName, content, mime) {
    try {
      const el = document.querySelector("script[data-legacy-admin='true']");
      const base = el && el.src ? el.src : "";
      const modHref = base
        ? new URL("../../platform/nativeFileExport.js", base).href
        : "./js/platform/nativeFileExport.js";
      const mod = await import(modHref);
      const nativeSave =
        mod && typeof mod.saveFileNative === "function"
          ? mod.saveFileNative
          : mod && typeof mod.shareFileNative === "function"
            ? mod.shareFileNative
            : null;
      if (nativeSave) {
        const native = await nativeSave(fileName, content, mime);
        if (native && typeof native === "object" && native.mode) {
          return native;
        }
        if (native === "share-file" || native === "share-text" || native === "cancelled") {
          return { mode: native };
        }
        if (native === "error") {
          return { mode: "error" };
        }
        if (native === "native-download") {
          return { mode: "native-download" };
        }
        if (native === "download") {
          return { mode: "download" };
        }
        if (native !== null) {
          return native;
        }
      }
    } catch (e) {
      /* Web / desktop: Capacitor vendor not present */
    }

    const blob = new Blob([content], { type: mime + ";charset=utf-8" });

    const anchorDownload = () => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof File !== "undefined") {
      try {
        const file = new File([blob], fileName, { type: mime || "application/octet-stream" });
        const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] });
        if (canShareFiles) {
          await navigator.share({ files: [file], title: fileName });
          return { mode: "share-file" };
        }
      } catch (err) {
        if (err && err.name === "AbortError") {
          return { mode: "cancelled" };
        }
      }
      try {
        const str = typeof content === "string" ? content : String(content);
        if (str.length > 0 && str.length < 900000) {
          const canShareText = !navigator.canShare || navigator.canShare({ text: str });
          if (canShareText) {
            await navigator.share({ title: fileName, text: str });
            return { mode: "share-text" };
          }
        }
      } catch (err2) {
        if (err2 && err2.name === "AbortError") {
          return { mode: "cancelled" };
        }
      }
    }

    anchorDownload();
    return { mode: "download" };
  }

  function statusAfterFileExport(result, fileName, savedLabel) {
    const mode = result && typeof result === "object" ? result.mode : result;
    if (mode === "cancelled") {
      status("Export cancelled - nothing was saved.", "info");
      return;
    }
    if (mode === "error") {
      const detail =
        result && typeof result.message === "string" && result.message.trim()
          ? " " + result.message.trim()
          : "";
      status("Couldn't save " + fileName + "." + detail, "error");
      return;
    }
    if (mode === "native-download") {
      const pathLabel =
        result && typeof result.pathLabel === "string" && result.pathLabel.trim()
          ? result.pathLabel.trim()
          : "Downloads/" + fileName;
      status(savedLabel + " Saved to " + pathLabel + ".", "success");
      return;
    }
    if (mode === "share-file" || mode === "share-text") {
      status(
        "In the share sheet, pick where to save " + fileName + " (e.g. Files, Drive, or Save to Downloads). The app does not choose a folder for you.",
        "success"
      );
      return;
    }
    status(savedLabel + " Look in your browser's Downloads folder for " + fileName + ".", "success");
  }

  function status(message, type = "info") {
    if (statusTimer) {
      clearTimeout(statusTimer);
    }
    ui.status.textContent = message;
    ui.status.dataset.type = type;
    appendStatusLog(message, type);
    showToast(message, type);
    statusTimer = setTimeout(() => {
      ui.status.textContent = "";
      ui.status.dataset.type = "info";
    }, 4000);
  }

  function appendStatusLog(message, type) {
    const entry = {
      at: new Date().toISOString(),
      message: String(message || ""),
      type: type || "info"
    };
    statusLogItems.unshift(entry);
    if (statusLogItems.length > STATUS_LOG_LIMIT) {
      statusLogItems = statusLogItems.slice(0, STATUS_LOG_LIMIT);
    }
    renderStatusLog();
  }

  function renderStatusLog() {
    ui.statusLog.innerHTML = "";
    if (statusLogItems.length === 0) {
      const empty = document.createElement("p");
      empty.className = "log-item";
      empty.textContent = "No activity yet.";
      ui.statusLog.appendChild(empty);
      return;
    }
    statusLogItems.slice(0, 24).forEach((item) => {
      const p = document.createElement("p");
      p.className = "log-item";
      const time = new Date(item.at);
      const hh = String(time.getHours()).padStart(2, "0");
      const mm = String(time.getMinutes()).padStart(2, "0");
      p.innerHTML = "<strong>" + hh + ":" + mm + "</strong> " + item.message;
      ui.statusLog.appendChild(p);
    });
  }

  function showToast(message, type = "info") {
    if (shouldSuppressToast(type)) {
      return;
    }
    const toast = document.createElement("article");
    toast.className = "toast";
    toast.dataset.type = type;
    toast.dataset.toastId = String(++toastSeed);
    const title = type === "error" ? "Attention" : type === "success" ? "Completed" : "Update";
    toast.innerHTML = "<strong>" + escapeHtml(title) + "</strong><p>" + escapeHtml(message) + "</p>";
    ui.toastStack.prepend(toast);
    const liveToasts = Array.from(ui.toastStack.children);
    liveToasts.slice(TOAST_LIMIT).forEach((item) => item.remove());
    window.setTimeout(() => {
      toast.remove();
    }, 3600);
  }

  function shouldSuppressToast(type) {
    if (window.innerWidth > 740) {
      return false;
    }
    if (!ui.app.classList.contains("editor-open")) {
      return false;
    }
    return type !== "error";
  }

  function updateSaveState(mode, at) {
    saveState.mode = mode === "saving" || mode === "unsaved" ? mode : "saved";
    saveState.at = at || saveState.at;
    updateSaveStatePill();
  }

  function updateSaveStatePill() {
    ui.saveStatePill.dataset.state = saveState.mode;
    if (saveState.mode === "saving") {
      ui.saveStatePill.textContent = "Saving locally...";
      return;
    }
    if (saveState.mode === "unsaved") {
      ui.saveStatePill.textContent = "Unsaved changes";
      return;
    }
    if (saveState.at) {
      ui.saveStatePill.textContent = "Saved " + formatClockTime(saveState.at);
      return;
    }
    ui.saveStatePill.textContent = "Saved locally";
  }

  function formatClockTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "locally";
    }
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return hh + ":" + mm;
  }

  function showImportReport(report) {
    if (!report) {
      return;
    }
    const card = document.createElement("div");
    const summary = document.createElement("p");
    summary.innerHTML = "<strong>Total:</strong> " + report.total
      + " | <strong>Imported:</strong> " + report.imported
      + " | <strong>Rejected:</strong> " + report.rejected;
    card.appendChild(summary);
    if (Array.isArray(report.reasons) && report.reasons.length > 0) {
      const title = document.createElement("p");
      title.innerHTML = "<strong>Rejected reasons</strong>";
      const list = document.createElement("ul");
      report.reasons.slice(0, 30).forEach((reason) => {
        const li = document.createElement("li");
        li.textContent = reason;
        list.appendChild(li);
      });
      card.append(title, list);
    }
    ui.importReportContent.innerHTML = "";
    ui.importReportContent.appendChild(card);
    openModal(ui.importReportModal);
  }

  function buildPrintableHtml(title, bodyContent) {
    const meta = [];
    const printMathSrc = (LOCAL_MATHJAX_SRC || CDN_MATHJAX_SRC).replace(/"/g, "&quot;");
    if (examConfig.branding.institution) {
      meta.push("<strong>Institution:</strong> " + escapeHtml(examConfig.branding.institution));
    }
    if (examConfig.branding.subject) {
      meta.push("<strong>Subject:</strong> " + escapeHtml(examConfig.branding.subject));
    }
    if (examConfig.branding.examCode) {
      meta.push("<strong>Exam Code:</strong> " + escapeHtml(examConfig.branding.examCode));
    }
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title.replace(/</g, "&lt;")}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:22px}
    h1{margin-top:0}
    .meta{margin:0 0 14px;color:#334155;font-size:.95rem}
    .q{margin:0 0 14px;padding:10px;border:1px solid #c9d3e1;border-radius:8px}
    .q h2{margin:0 0 8px;font-size:1rem}
    ol{margin:0;padding-left:20px}
    li{margin:3px 0}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #c9d3e1;padding:6px;text-align:left}
  </style>
  <script defer src="${printMathSrc}"></script>
</head>
<body>
  <h1>${title.replace(/</g, "&lt;")}</h1>
  ${meta.length > 0 ? "<p class='meta'>" + meta.join(" &nbsp;|&nbsp; ") + "</p>" : ""}
  ${bodyContent}
</body>
</html>`;
  }

  function printQuestions() {
    if (questions.length === 0) {
      status("No questions to print.", "error");
      return;
    }
    let body = "";
    questions.forEach((item, index) => {
      body += "<section class='q'>";
      body += "<h2>" + (index + 1) + ". " + escapeHtml(item.question) + "</h2>";
      body += "<ol type='A'>";
      item.options.forEach((option) => {
        body += "<li>" + escapeHtml(option) + "</li>";
      });
      body += "</ol>";
      body += "</section>";
    });
    openPrintWindow(buildPrintableHtml("Question Paper", body));
  }

  function printAnswerKey() {
    if (questions.length === 0) {
      status("No answer key to print.", "error");
      return;
    }
    let body = "<table><thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Marks</th></tr></thead><tbody>";
    questions.forEach((item, index) => {
      body += "<tr>";
      body += "<td>" + (index + 1) + "</td>";
      body += "<td>" + escapeHtml(truncate(item.question, 140)) + "</td>";
      body += "<td>" + escapeHtml(item.options[item.correctIndex] || "") + "</td>";
      body += "<td>" + sanitizeMarks(item.marks) + "</td>";
      body += "</tr>";
    });
    body += "</tbody></table>";
    openPrintWindow(buildPrintableHtml("Answer Key", body));
  }

  function openPrintWindow(content) {
    const schedulePrint = (win, removeFrame) => {
      const printNow = () => {
        if (win.closed) {
          return;
        }
        win.focus();
        let finished = false;
        const cleanup = typeof removeFrame === "function" ? removeFrame : () => {};
        const after = () => {
          if (finished) {
            return;
          }
          finished = true;
          cleanup();
        };
        if (win.addEventListener) {
          win.addEventListener("afterprint", after, { once: true });
        }
        win.print();
        window.setTimeout(after, 4000);
      };
      const startedAt = Date.now();
      const maxWaitMs = 6500;
      const waitForMathAndPrint = () => {
        if (win.closed) {
          return;
        }
        if (win.MathJax && typeof win.MathJax.typesetPromise === "function") {
          win.MathJax.typesetPromise([win.document.body]).catch(() => {}).finally(() => {
            win.setTimeout(printNow, 80);
          });
          return;
        }
        if (Date.now() - startedAt >= maxWaitMs) {
          printNow();
          return;
        }
        win.setTimeout(waitForMathAndPrint, 90);
      };
      win.setTimeout(waitForMathAndPrint, 140);
    };

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Print");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(iframe);
    const iwin = iframe.contentWindow;
    if (iwin && iwin.document) {
      iwin.document.open();
      iwin.document.write(content);
      iwin.document.close();
      schedulePrint(iwin, () => {
        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 500);
      });
      return;
    }
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    const win = window.open("", "_blank");
    if (!win) {
      status("Printing could not open. On Android, allow the print preview or use a desktop browser.", "error");
      return;
    }
    win.document.open();
    win.document.write(content);
    win.document.close();
    schedulePrint(win, () => {
      try {
        win.close();
      } catch (e) {
        /* ignore */
      }
    });
  }

  function openTestHarness() {
    const duplicateMap = buildDuplicateMap(questions);
    const duplicateCount = duplicateMap.size;
    const invalidCount = questions.filter((item) => !item.question || !item.options || item.options.length < MIN_OPTIONS).length;
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MCQ Test Harness</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;color:#111}
.card{border:1px solid #ccd6e4;border-radius:10px;padding:12px;margin-bottom:10px}
.ok{color:#0a7b00}.bad{color:#b42318}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccd6e4;padding:6px;text-align:left}
</style></head><body>
<h1>MCQ Admin Test Harness</h1>
<div class="card"><strong>Total Questions:</strong> ${questions.length}</div>
<div class="card"><strong>Duplicate Questions:</strong> <span class="${duplicateCount > 0 ? "bad" : "ok"}">${duplicateCount}</span></div>
<div class="card"><strong>Invalid Questions:</strong> <span class="${invalidCount > 0 ? "bad" : "ok"}">${invalidCount}</span></div>
<h2>Quick Checklist</h2>
<table><tbody>
<tr><td>Add/Delete/Save</td><td class="ok">Manual smoke test required</td></tr>
<tr><td>Import Append</td><td class="ok">${questions.length > 0 ? "Data present" : "No data yet"}</td></tr>
<tr><td>Exam Generation</td><td class="ok">Use Create Exam File button</td></tr>
</tbody></table>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    status("Test harness opened in a new tab.");
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function hydrateAppState() {
    try {
      const raw = window.localStorage.getItem(APP_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      const normalized = migrateStoredPayload(parsed);
      if (!normalized) {
        return;
      }
      const usedIds = new Set();
      const nextQuestions = [];
      normalized.questions.forEach((item) => {
        const normalizedQuestion = normalizeQuestionRecord(item, { regenerateId: false });
        if (!normalizedQuestion) {
          return;
        }
        if (usedIds.has(normalizedQuestion.id)) {
          normalizedQuestion.id = uid();
        }
        usedIds.add(normalizedQuestion.id);
        nextQuestions.push(normalizedQuestion);
      });
      questions = nextQuestions;
      const questionIdSet = new Set(questions.map((item) => item.id));
      selectedQuestionId = questionIdSet.has(normalized.selectedQuestionId) ? normalized.selectedQuestionId : null;
      selectedQuestionIds = new Set((normalized.selectedQuestionIds || []).filter((id) => questionIdSet.has(id)));
      filters.query = String(normalized.filters.query || "");
      filters.topic = String(normalized.filters.topic || "");
      const difficultyRaw = String(normalized.filters.difficulty || "");
      filters.difficulty = (difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard") ? difficultyRaw : "";
      filters.duplicatesOnly = Boolean(normalized.filters.duplicatesOnly);
      examConfig.preset = normalized.examConfig.preset in EXAM_PRESETS ? normalized.examConfig.preset : "quick";
      examConfig.security.fullscreen = Boolean(normalized.examConfig.security.fullscreen);
      examConfig.security.navWarn = Boolean(normalized.examConfig.security.navWarn);
      examConfig.security.token = Boolean(normalized.examConfig.security.token);
      examConfig.branding = {
        institution: String(normalized.examConfig.branding && normalized.examConfig.branding.institution || "").trim(),
        subject: String(normalized.examConfig.branding && normalized.examConfig.branding.subject || "").trim(),
        examCode: String(normalized.examConfig.branding && normalized.examConfig.branding.examCode || "").trim(),
        showStudentInfo: normalized.examConfig.branding && typeof normalized.examConfig.branding.showStudentInfo === "boolean"
          ? normalized.examConfig.branding.showStudentInfo
          : true
      };
      examConfig.marking = {
        negative: sanitizeNegativeMarks(normalized.examConfig.marking && normalized.examConfig.marking.negative)
      };
      statusLogItems = Array.isArray(normalized.statusLogItems) ? normalized.statusLogItems.slice(0, STATUS_LOG_LIMIT) : [];
      saveState = {
        mode: "saved",
        at: normalized.savedAt || null
      };
    } catch {
      // Ignore corrupted storage.
    }
  }

  function migrateStoredPayload(payload) {
    if (Array.isArray(payload)) {
      return {
        schemaVersion: 1,
        questions: payload,
        selectedQuestionId: null,
        selectedQuestionIds: [],
        filters: { query: "", topic: "", difficulty: "", duplicatesOnly: false },
        examConfig: {
          preset: "quick",
          security: { fullscreen: false, navWarn: true, token: true },
          branding: { institution: "", subject: "", examCode: "", showStudentInfo: true },
          marking: { negative: 0 }
        },
        statusLogItems: []
      };
    }
    if (!payload || typeof payload !== "object") {
      return null;
    }
    return {
      schemaVersion: Number(payload.schemaVersion || 1),
      questions: Array.isArray(payload.questions) ? payload.questions : [],
      selectedQuestionId: payload.selectedQuestionId || null,
      selectedQuestionIds: Array.isArray(payload.selectedQuestionIds) ? payload.selectedQuestionIds : [],
      filters: payload.filters && typeof payload.filters === "object" ? payload.filters : { query: "", topic: "", difficulty: "", duplicatesOnly: false },
      examConfig: payload.examConfig && typeof payload.examConfig === "object"
        ? payload.examConfig
        : {
            preset: "quick",
            security: { fullscreen: false, navWarn: true, token: true },
            branding: { institution: "", subject: "", examCode: "", showStudentInfo: true },
            marking: { negative: 0 }
          },
      statusLogItems: Array.isArray(payload.statusLogItems) ? payload.statusLogItems : []
    };
  }

  function hydrateSnapshots() {
    try {
      const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (!raw) {
        snapshotLibrary = [];
        return;
      }
      const parsed = JSON.parse(raw);
      snapshotLibrary = Array.isArray(parsed) ? parsed.slice(0, 24) : [];
    } catch {
      snapshotLibrary = [];
    }
  }

  function captureAppStatePayload() {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      questions: questions.map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options.slice(),
        correctIndex: item.correctIndex,
        topic: item.topic || "",
        difficulty: sanitizeDifficulty(item.difficulty),
        marks: sanitizeMarks(item.marks),
        tags: Array.isArray(item.tags) ? item.tags.slice() : [],
        explanation: item.explanation || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      })),
      selectedQuestionId,
      selectedQuestionIds: Array.from(selectedQuestionIds),
      filters: { ...filters },
      examConfig: {
        preset: examConfig.preset,
        security: { ...examConfig.security },
        branding: { ...examConfig.branding },
        marking: { ...examConfig.marking }
      },
      statusLogItems: statusLogItems.slice(0, STATUS_LOG_LIMIT)
    };
  }

  function persistSnapshots() {
    try {
      window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshotLibrary.slice(0, 24)));
    } catch {
      // Ignore storage failures.
    }
  }

  function saveSnapshot() {
    const labelInput = window.prompt("Enter a label for this snapshot", "Snapshot " + new Date().toLocaleString());
    if (labelInput === null) {
      return;
    }
    const label = labelInput.trim() || "Snapshot " + new Date().toLocaleString();
    const payload = captureAppStatePayload();
    snapshotLibrary.unshift({
      id: uid(),
      label,
      createdAt: new Date().toISOString(),
      payload
    });
    if (snapshotLibrary.length > 24) {
      snapshotLibrary = snapshotLibrary.slice(0, 24);
    }
    persistSnapshots();
    renderSnapshotLibrary();
    status("Snapshot saved.", "success");
  }

  function renderSnapshotLibrary() {
    ui.snapshotContent.innerHTML = "";
    if (!Array.isArray(snapshotLibrary) || snapshotLibrary.length === 0) {
      const empty = document.createElement("p");
      empty.className = "snapshot-empty";
      empty.textContent = "No snapshots saved yet.";
      ui.snapshotContent.appendChild(empty);
      return;
    }
    const list = document.createElement("div");
    list.className = "snapshot-list";
    snapshotLibrary.forEach((item) => {
      const row = document.createElement("article");
      row.className = "snapshot-item";
      row.innerHTML = "<strong>" + escapeHtml(item.label) + "</strong><span>Saved " + escapeHtml(formatClockTime(item.createdAt)) + " on " + escapeHtml(new Date(item.createdAt).toLocaleDateString()) + "</span>";
      const actions = document.createElement("div");
      actions.className = "snapshot-actions";
      actions.innerHTML = ""
        + "<button type='button' class='secondary-btn' data-snapshot-action='restore' data-snapshot-id='" + escapeHtml(item.id) + "'>Restore</button>"
        + "<button type='button' class='ghost-btn' data-snapshot-action='delete' data-snapshot-id='" + escapeHtml(item.id) + "'>Delete</button>";
      row.appendChild(actions);
      list.appendChild(row);
    });
    ui.snapshotContent.appendChild(list);
  }

  function openSnapshotLibrary() {
    renderSnapshotLibrary();
    openModal(ui.snapshotModal);
  }

  function onSnapshotContentClick(event) {
    const target = event.target.closest("[data-snapshot-action]");
    if (!target) {
      return;
    }
    const snapshot = snapshotLibrary.find((item) => item.id === target.dataset.snapshotId);
    if (!snapshot) {
      return;
    }
    if (target.dataset.snapshotAction === "restore") {
      if (!window.confirm("Restore this snapshot? Current unsaved changes will be replaced.")) {
        return;
      }
      const normalized = migrateStoredPayload(snapshot.payload);
      if (!normalized) {
        status("Snapshot is invalid.", "error");
        return;
      }
      applyHistoryState({
        questions: normalized.questions,
        selectedQuestionId: normalized.selectedQuestionId,
        selectedQuestionIds: normalized.selectedQuestionIds
      });
      filters.query = String(normalized.filters.query || "");
      filters.topic = String(normalized.filters.topic || "");
      filters.difficulty = String(normalized.filters.difficulty || "");
      filters.duplicatesOnly = Boolean(normalized.filters.duplicatesOnly);
      examConfig.preset = normalized.examConfig.preset in EXAM_PRESETS ? normalized.examConfig.preset : "quick";
      examConfig.security = { ...examConfig.security, ...(normalized.examConfig.security || {}) };
      examConfig.branding = { ...examConfig.branding, ...(normalized.examConfig.branding || {}) };
      examConfig.marking = { negative: sanitizeNegativeMarks(normalized.examConfig.marking && normalized.examConfig.marking.negative) };
      applyFiltersToControls();
      applyExamConfigToControls();
      renderAll();
      schedulePersistAppState();
      closeModal(ui.snapshotModal);
      status("Snapshot restored.", "success");
      return;
    }
    snapshotLibrary = snapshotLibrary.filter((item) => item.id !== snapshot.id);
    persistSnapshots();
    renderSnapshotLibrary();
    status("Snapshot deleted.");
  }

  function schedulePersistAppState() {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    updateSaveState("saving");
    persistTimer = window.setTimeout(() => {
      persistTimer = null;
      persistAppStateNow();
    }, PERSIST_DEBOUNCE_MS);
  }

  function persistAppStateNow() {
    const payload = captureAppStatePayload();
    try {
      window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
      updateSaveState("saved", payload.savedAt);
    } catch {
      // Ignore storage failures.
    }
  }

  function captureHistoryState() {
    return {
      questions: questions.map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options.slice(),
        correctIndex: item.correctIndex,
        topic: item.topic || "",
        difficulty: sanitizeDifficulty(item.difficulty),
        marks: sanitizeMarks(item.marks),
        tags: Array.isArray(item.tags) ? item.tags.slice() : [],
        explanation: item.explanation || "",
        createdAt: item.createdAt || "",
        updatedAt: item.updatedAt || ""
      })),
      selectedQuestionId,
      selectedQuestionIds: Array.from(selectedQuestionIds)
    };
  }

  function applyHistoryState(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.questions)) {
      return;
    }
    historySuspended = true;
    questions = snapshot.questions.map((item) => normalizeQuestionRecord(item, { regenerateId: false })).filter(Boolean);
    const validIds = new Set(questions.map((item) => item.id));
    selectedQuestionId = validIds.has(snapshot.selectedQuestionId) ? snapshot.selectedQuestionId : null;
    selectedQuestionIds = new Set((snapshot.selectedQuestionIds || []).filter((id) => validIds.has(id)));
    if (selectedQuestionId) {
      const selected = questions.find((item) => item.id === selectedQuestionId);
      editor.draft = selected ? draftFromQuestion(selected) : emptyDraft();
      editor.snapshot = JSON.stringify(editor.draft);
      editor.dirty = false;
      renderEditor();
    } else {
      resetDraft();
    }
    historySuspended = false;
    renderAll();
    schedulePersistAppState();
  }

  function recordHistoryBeforeMutation() {
    if (historySuspended) {
      return;
    }
    history.undo.push(captureHistoryState());
    if (history.undo.length > HISTORY_LIMIT) {
      history.undo.shift();
    }
    history.redo = [];
    updateHistoryButtons();
  }

  function undoState() {
    if (history.undo.length === 0) {
      status("Nothing to undo.", "error");
      return;
    }
    const current = captureHistoryState();
    history.redo.push(current);
    const previous = history.undo.pop();
    applyHistoryState(previous);
    updateHistoryButtons();
    status("Undo applied.", "success");
  }

  function redoState() {
    if (history.redo.length === 0) {
      status("Nothing to redo.", "error");
      return;
    }
    const current = captureHistoryState();
    history.undo.push(current);
    if (history.undo.length > HISTORY_LIMIT) {
      history.undo.shift();
    }
    const next = history.redo.pop();
    applyHistoryState(next);
    updateHistoryButtons();
    status("Redo applied.", "success");
  }

  function updateHistoryButtons() {
    ui.undoBtn.disabled = history.undo.length === 0;
    ui.redoBtn.disabled = history.redo.length === 0;
  }

  function buildExamHtml(examTitle, questionSet, config) {
    const safeTitle = JSON.stringify(examTitle);
    const safeData = JSON.stringify(questionSet).replace(/</g, "\\u003c");
    const safeConfig = JSON.stringify(config && typeof config === "object" ? config : {
      preset: "quick",
      security: { fullscreen: false, navWarn: true, token: true },
      branding: { institution: "", subject: "", examCode: "", showStudentInfo: true },
      marking: { negative: 0 }
    }).replace(/</g, "\\u003c");
    const safeLocalMathSrc = JSON.stringify(LOCAL_MATHJAX_SRC || "");
    const safeCdnMathSrc = JSON.stringify(CDN_MATHJAX_SRC);
    const scriptOpenTag = "<scr" + "ipt>";
    const scriptCloseTag = "</scr" + "ipt>";
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%231d4ed8'/%3E%3Cpath d='M20 18h10l12 28h-8l-2.2-5.8H20.3L18 46h-8l10-28zm2.7 16.4h6.6L26 24.6l-3.3 9.8z' fill='white'/%3E%3C/svg%3E">
  <title>${examTitle.replace(/</g, "&lt;")}</title>
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [["\\\\(", "\\\\)"], ["$", "$"]],
        displayMath: [["\\\\[", "\\\\]"], ["$$", "$$"]],
        processEscapes: true
      },
      options: {
        skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"]
      }
    };
    (function () {
      function addMathScript(src, marker) {
        if (!src) {
          return;
        }
        if (document.querySelector("script[data-mathjax-marker='" + marker + "']")) {
          return;
        }
        var script = document.createElement("script");
        script.defer = true;
        script.src = src;
        script.dataset.mathjaxMarker = marker;
        document.head.appendChild(script);
      }
      if (${safeLocalMathSrc}) {
        addMathScript(${safeLocalMathSrc}, "local");
        window.addEventListener("error", function (event) {
          if (!event || !event.target || event.target.getAttribute("data-mathjax-marker") !== "local") {
            return;
          }
          addMathScript(${safeCdnMathSrc}, "cdn");
        }, true);
      } else {
        addMathScript(${safeCdnMathSrc}, "cdn");
      }
    })();
  </script>
  <style>
    :root{color-scheme:light;--bg:#f3f6fb;--surface:#fff;--soft:#f8faff;--text:#172033;--muted:#5b6880;--border:#d7e0ee;--primary:#1d4ed8;--primaryStrong:#1e40af;--ok:#0f766e;--bad:#b42318;--radius:14px;--shadow:0 12px 28px rgba(15,23,42,.1);--speed:300ms ease;--glass:rgba(255,255,255,.96);--glassSoft:rgba(255,255,255,.94);--overlay:rgba(15,23,42,.35)}
    :root[data-theme="dark"]{color-scheme:dark;--bg:#0b1220;--surface:#101a2d;--soft:#15213a;--text:#e6eefc;--muted:#9ab0d4;--border:#2a3b5a;--primary:#4f8cff;--primaryStrong:#2f6fe9;--ok:#18a295;--bad:#d3453a;--shadow:0 16px 34px rgba(0,0,0,.4);--glass:rgba(16,26,45,.96);--glassSoft:rgba(16,26,45,.95);--overlay:rgba(0,0,0,.46)}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;color:var(--text);font-family:"Segoe UI","SF Pro Text",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;background:radial-gradient(circle at top right,rgba(29,78,216,.12),transparent 35%),radial-gradient(circle at bottom left,rgba(15,118,110,.1),transparent 40%),var(--bg)}
    .root{max-width:980px;margin:0 auto;padding:20px 14px 28px}
    .themeBar{display:flex;justify-content:flex-end;margin:4px 0 10px}
    .themeBtn{border:1px solid var(--border);border-radius:10px;background:linear-gradient(145deg,var(--surface),var(--soft));color:var(--text);padding:.56rem .78rem;font-size:.86rem;font-weight:700;cursor:pointer;transition:transform var(--speed),box-shadow var(--speed),border-color var(--speed)}
    .themeBtn:hover{transform:translateY(-1px);border-color:var(--primary);box-shadow:0 10px 20px rgba(15,23,42,.18)}
    .screen{display:none;animation:fade .22s ease}
    .screen.active{display:block}
    @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .panel{border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow);padding:18px}
    .panel h1,.panel h2,.panel h3{margin-top:0}
    .panel p{color:var(--muted);line-height:1.45}
    .grid{display:grid;gap:14px}
    .field{display:grid;gap:8px}
    label{font-size:.92rem;font-weight:700;color:var(--muted)}
    input[type="number"],input[type="text"]{width:100%;border:1px solid var(--border);border-radius:10px;padding:.62rem .72rem;font-size:1rem;background:var(--surface);color:var(--text)}
    .check{display:flex;align-items:center;gap:8px;color:var(--text);font-weight:600}
    .metaBar{display:grid;gap:8px;margin-bottom:14px}
    .metaCard{border:1px solid var(--border);border-radius:14px;background:linear-gradient(145deg,var(--surface),var(--soft));padding:12px}
    .metaCard strong{display:block;margin-bottom:4px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    .metaCard span{font-size:1rem;font-weight:800;color:var(--text)}
    .studentGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .btn{border:0;border-radius:10px;padding:.72rem 1rem;font-size:.98rem;font-weight:700;cursor:pointer;transition:transform var(--speed),box-shadow var(--speed),background-color var(--speed)}
    .btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.14)}
    .primary{color:#fff;background:var(--primary)}
    .primary:hover{background:var(--primaryStrong)}
    .secondary{color:var(--text);background:#eaf0fb;border:1px solid var(--border)}
    .error{min-height:22px;margin:8px 0 0;color:var(--bad);font-weight:700}
    .timer{position:sticky;top:8px;z-index:20;margin-bottom:12px;border:1px solid var(--border);border-radius:12px;background:var(--glass);backdrop-filter:blur(8px);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:10px;box-shadow:0 10px 20px rgba(15,23,42,.1)}
    .timer h2{margin:0;font-size:1.02rem}
    .timer p{margin:4px 0 0;font-size:.86rem}
    .timerValue{min-width:88px;text-align:right;font-weight:800;font-size:1.35rem;color:var(--primary)}
    .timerValue.warn{color:var(--bad)}
    .examShell{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:14px;align-items:start}
    .navPanel{position:sticky;top:88px;border:1px solid var(--border);border-radius:14px;background:var(--glassSoft);backdrop-filter:blur(8px);padding:12px;box-shadow:0 10px 20px rgba(15,23,42,.08)}
    .navPanel h3{margin:0 0 10px;font-size:.92rem}
    .navGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:8px}
    .navBtn{border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);min-height:44px;font-weight:800;cursor:pointer}
    .navBtn.answered{border-color:rgba(15,118,110,.35);background:rgba(15,118,110,.12)}
    .navBtn.flagged{border-color:rgba(180,35,24,.35);background:rgba(180,35,24,.12)}
    .navBtn.current{border-color:var(--primary);box-shadow:0 0 0 2px rgba(29,78,216,.14)}
    .list{display:grid;gap:12px;margin-bottom:16px}
    .card{border:1px solid var(--border);border-radius:12px;background:var(--surface);box-shadow:0 8px 20px rgba(15,23,42,.08);padding:14px}
    .card h3{margin:0 0 10px;font-size:1rem;line-height:1.35}
    .card h3,.reviewCard h3,.opt span,.reviewOpts li{white-space:pre-wrap}
    .questionHead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
    .flagBtn{border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--muted);padding:.42rem .7rem;font-size:.8rem;font-weight:800;cursor:pointer}
    .flagBtn.active{border-color:rgba(180,35,24,.35);background:rgba(180,35,24,.12);color:var(--bad)}
    .cardMeta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
    .chip{display:inline-flex;align-items:center;padding:.3rem .56rem;border-radius:999px;background:var(--soft);border:1px solid var(--border);font-size:.74rem;font-weight:800;color:var(--muted)}
    .opts{display:grid;gap:8px}
    .opt{display:flex;align-items:center;gap:10px;border:1px solid var(--border);border-radius:10px;background:var(--soft);padding:.62rem .68rem;cursor:pointer;transition:border-color var(--speed),background-color var(--speed)}
    .opt:hover{border-color:rgba(29,78,216,.45);background:rgba(29,78,216,.08)}
    .opt input{width:18px;height:18px;margin:0}
    .submit{display:flex;justify-content:flex-end}
    .scores{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
    .score{border:1px solid var(--border);border-radius:12px;background:var(--soft);padding:12px}
    .score h3{margin:0 0 6px;color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.08em}
    .score p{margin:0;color:var(--text);font-size:1.2rem;font-weight:800}
    .note{margin:0 0 12px;color:var(--muted);font-weight:600}
    .review{display:grid;gap:10px;margin-top:14px}
    .review.hidden{display:none}
    .reviewCard{border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:12px}
    .reviewCard.good{border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.12)}
    .reviewCard.bad{border-color:rgba(180,35,24,.45);background:rgba(180,35,24,.12)}
    .reviewCard h3{margin:0 0 8px;font-size:.98rem}
    .reviewStatus{margin:0 0 10px;font-size:.84rem;font-weight:700}
    .reviewOpts{list-style:none;margin:0;padding:0;display:grid;gap:6px}
    .reviewOpts li{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:.5rem .62rem;font-size:.9rem}

    /* Mobile floating question navigator */
    .navFab{position:fixed;right:16px;bottom:16px;z-index:60;width:54px;height:54px;border-radius:16px;border:1px solid var(--border);background:linear-gradient(145deg,var(--surface),var(--soft));box-shadow:var(--shadow);display:none;align-items:center;justify-content:center;cursor:pointer;color:var(--primary);transition:transform var(--speed),opacity var(--speed),border-color var(--speed)}
    .navFab:hover{transform:translateY(-1px);border-color:rgba(79,140,255,.45)}
    .navFab svg{width:26px;height:26px;display:block}
    .navFloatBackdrop{position:fixed;inset:0;z-index:55;background:var(--overlay);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity var(--speed);display:none}
    .navFloat{position:fixed;right:16px;bottom:84px;z-index:60;width:min(420px,calc(100vw - 32px));max-height:min(60vh,520px);border:1px solid var(--border);border-radius:18px;background:var(--surface);box-shadow:var(--shadow);padding:12px;opacity:0;transform:translateY(10px) scale(.98);pointer-events:none;transition:transform var(--speed),opacity var(--speed);display:none}
    .navFloatHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .navFloatHead h3{margin:0;font-size:.95rem}
    .navFloatClose{border:1px solid var(--border);border-radius:12px;background:var(--soft);color:var(--text);font-weight:900;cursor:pointer;min-width:40px;min-height:36px}
    .navFloatBody{overflow:auto;max-height:calc(min(60vh,520px) - 58px);padding-right:4px}
    :root[data-nav-open="true"] .navFloatBackdrop{opacity:1;pointer-events:auto}
    :root[data-nav-open="true"] .navFloat{opacity:1;transform:none;pointer-events:auto}
    :root[data-nav-open="true"] .navFab{opacity:0;transform:scale(.88);pointer-events:none}

    @media(max-width:980px){
      .navPanel{display:none}
      .navFab{display:flex}
      .navFloat,.navFloatBackdrop{display:block}
    }
    .reviewOpts li.correct{border-color:rgba(15,118,110,.45);background:rgba(15,118,110,.12);font-weight:700}
    .reviewOpts li.incorrect{border-color:rgba(180,35,24,.45);background:rgba(180,35,24,.12);font-weight:700}
    @media(max-width:860px){.root{padding:12px}.scores,.studentGrid,.examShell{grid-template-columns:1fr}.panel{padding:14px}.navPanel{position:static}}
    @media(max-width:620px){.timer{top:0;margin-left:-12px;margin-right:-12px;border-radius:0;padding-left:12px;padding-right:12px}.btn{width:100%}.submit{justify-content:stretch}.opt{padding-top:.72rem;padding-bottom:.72rem}}
  </style>
</head>
<body>
  <div class="root">
    <div class="themeBar"><button type="button" class="themeBtn" id="themeBtn">Dark Theme</button></div>
    <section class="screen active" id="setup">
      <article class="panel">
        <h1 id="setupTitle"></h1>
        <div class="metaBar" id="setupMeta"></div>
        <p>Total available questions: <strong id="setupTotal"></strong></p>
        <div class="grid">
          <div class="studentGrid" id="studentFields">
            <div class="field">
              <label for="studentName">Student Name</label>
              <input type="text" id="studentName" placeholder="Enter student name">
            </div>
            <div class="field">
              <label for="studentRoll">Roll / ID</label>
              <input type="text" id="studentRoll" placeholder="Enter roll number">
            </div>
            <div class="field">
              <label for="studentSection">Section</label>
              <input type="text" id="studentSection" placeholder="Enter section">
            </div>
          </div>
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
        <div class="examShell">
          <aside class="navPanel">
            <h3>Question Navigator</h3>
            <div class="navGrid" id="questionNav"></div>
          </aside>
          <div>
            <div class="list" id="questionList"></div>
            <div class="submit">
              <button type="button" class="btn primary" id="submitBtn">Submit Exam</button>
            </div>
          </div>
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
          <div class="score"><h3>Marks</h3><p id="marksLabel">0</p></div>
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
      const examConfig = ${safeConfig};
      const THEME_KEY = "mcq_exam_theme_v2";
      const PRESETS = {
        quick: { maxQuestions: 10, timeMinutes: 15, shuffleQuestions: true, shuffleOptions: true },
        school: { maxQuestions: 30, timeMinutes: 40, shuffleQuestions: false, shuffleOptions: false },
        mock: { maxQuestions: 80, timeMinutes: 90, shuffleQuestions: true, shuffleOptions: true }
      };
      let selectedQuestions = [];
      let userAnswers = {};
      let flaggedQuestions = {};
      let timerInterval = null;
      let totalSeconds = 0;
      let remainingSeconds = 0;
      let startedAt = 0;
      let endedAt = 0;
      let submitted = false;
      let reviewVisible = false;
      let navViolationCount = 0;
      let attemptToken = "";
      let currentQuestionIndex = 0;
      let studentProfile = { name: "", roll: "", section: "" };

      const ui = {
        setup: document.getElementById("setup"),
        exam: document.getElementById("exam"),
        result: document.getElementById("result"),
        setupTitle: document.getElementById("setupTitle"),
        setupMeta: document.getElementById("setupMeta"),
        setupTotal: document.getElementById("setupTotal"),
        themeBtn: document.getElementById("themeBtn"),
        studentFields: document.getElementById("studentFields"),
        studentName: document.getElementById("studentName"),
        studentRoll: document.getElementById("studentRoll"),
        studentSection: document.getElementById("studentSection"),
        questionCount: document.getElementById("questionCount"),
        shuffleQuestions: document.getElementById("shuffleQuestions"),
        shuffleOptions: document.getElementById("shuffleOptions"),
        timeLimit: document.getElementById("timeLimit"),
        startBtn: document.getElementById("startBtn"),
        setupError: document.getElementById("setupError"),
        activeTitle: document.getElementById("activeTitle"),
        progress: document.getElementById("progress"),
        timerValue: document.getElementById("timerValue"),
        questionNav: document.getElementById("questionNav"),
        questionList: document.getElementById("questionList"),
        submitBtn: document.getElementById("submitBtn"),
        scoreLabel: document.getElementById("scoreLabel"),
        percentLabel: document.getElementById("percentLabel"),
        timeLabel: document.getElementById("timeLabel"),
        marksLabel: document.getElementById("marksLabel"),
        resultNote: document.getElementById("resultNote"),
        toggleReview: document.getElementById("toggleReview"),
        review: document.getElementById("review")
      };

      const floatingNav = {
        enabled: false,
        isNarrow: false,
        fab: null,
        backdrop: null,
        panel: null,
        body: null,
        restoreParent: null,
        restoreNextSibling: null
      };

      init();

      function init() {
        initTheme();
        setupFloatingQuestionNav();
        ui.setupTitle.textContent = examTitle || "MCQ Examination";
        ui.setupTotal.textContent = String(examData.length);
        renderSetupMeta();
        applySetupDefaults();
        if (examData.length > 0) {
          ui.questionCount.max = String(examData.length);
          if (!ui.questionCount.value) {
            ui.questionCount.value = String(Math.min(10, examData.length));
          }
        } else {
          ui.startBtn.disabled = true;
          ui.questionCount.value = "0";
          ui.setupError.textContent = "No questions are embedded in this file.";
        }
        ui.startBtn.addEventListener("click", startExam);
        ui.submitBtn.addEventListener("click", manualSubmit);
        ui.toggleReview.addEventListener("click", toggleReview);
        ui.themeBtn.addEventListener("click", toggleTheme);
        ui.questionNav.addEventListener("click", onQuestionNavClick);
        if (examConfig && examConfig.security && examConfig.security.navWarn) {
          document.addEventListener("visibilitychange", onVisibilityChange);
          window.addEventListener("beforeunload", onBeforeUnload);
        }
        queueTypeset(ui.setup);
      }

      function setupFloatingQuestionNav() {
        // Built exam files are standalone; we create the floating navigator dynamically
        // so we don't have to modify the HTML template.
        if (!ui.questionNav || floatingNav.enabled) {
          return;
        }

        const navPanel = ui.questionNav.closest(".navPanel");
        if (!navPanel) {
          return;
        }

        floatingNav.restoreParent = ui.questionNav.parentElement;
        floatingNav.restoreNextSibling = ui.questionNav.nextSibling;

        const fab = document.createElement("button");
        fab.type = "button";
        fab.className = "navFab";
        fab.id = "questionNavFab";
        fab.setAttribute("aria-label", "Open question navigator");
        fab.innerHTML = [
          "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\">",
          "<path d=\"M5 7h14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>",
          "<path d=\"M5 12h14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>",
          "<path d=\"M5 17h14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>",
          "</svg>"
        ].join("");

        const backdrop = document.createElement("div");
        backdrop.className = "navFloatBackdrop";
        backdrop.id = "questionNavBackdrop";
        backdrop.setAttribute("aria-hidden", "true");

        const panel = document.createElement("section");
        panel.className = "navFloat";
        panel.id = "questionNavFloat";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Question navigator");
        panel.innerHTML = [
          "<header class=\"navFloatHead\">",
          "<h3>Question Navigator</h3>",
          "<button type=\"button\" class=\"navFloatClose\" id=\"questionNavFloatClose\" aria-label=\"Close question navigator\">x</button>",
          "</header>",
          "<div class=\"navFloatBody\" id=\"questionNavFloatBody\"></div>"
        ].join("");

        document.body.append(backdrop, panel, fab);

        floatingNav.enabled = true;
        floatingNav.fab = fab;
        floatingNav.backdrop = backdrop;
        floatingNav.panel = panel;
        floatingNav.body = panel.querySelector("#questionNavFloatBody");

        const closeBtn = panel.querySelector("#questionNavFloatClose");
        fab.addEventListener("click", () => setNavOpen(true));
        backdrop.addEventListener("click", () => setNavOpen(false));
        closeBtn.addEventListener("click", () => setNavOpen(false));
        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            setNavOpen(false);
          }
        });

        window.addEventListener("resize", () => {
          syncNavPlacement();
        });

        syncNavPlacement();
      }

      function setNavOpen(open) {
        if (!floatingNav.enabled) {
          return;
        }
        const shouldOpen = Boolean(open);
        document.documentElement.setAttribute("data-nav-open", shouldOpen ? "true" : "false");
        if (floatingNav.fab) {
          floatingNav.fab.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
        }
      }

      function syncNavPlacement() {
        if (!floatingNav.enabled || !ui.questionNav) {
          return;
        }

        const isNarrow = window.matchMedia && window.matchMedia("(max-width: 980px)").matches;
        floatingNav.isNarrow = Boolean(isNarrow);

        if (floatingNav.isNarrow) {
          if (floatingNav.body && ui.questionNav.parentElement !== floatingNav.body) {
            floatingNav.body.appendChild(ui.questionNav);
          }
        } else if (floatingNav.restoreParent) {
          setNavOpen(false);
          if (ui.questionNav.parentElement !== floatingNav.restoreParent) {
            if (floatingNav.restoreNextSibling && floatingNav.restoreNextSibling.parentNode === floatingNav.restoreParent) {
              floatingNav.restoreParent.insertBefore(ui.questionNav, floatingNav.restoreNextSibling);
            } else {
              floatingNav.restoreParent.appendChild(ui.questionNav);
            }
          }
        }
      }

      function renderSetupMeta() {
        ui.setupMeta.innerHTML = "";
        var items = [];
        if (examConfig && examConfig.branding && examConfig.branding.institution) {
          items.push({ label: "Institution", value: examConfig.branding.institution });
        }
        if (examConfig && examConfig.branding && examConfig.branding.subject) {
          items.push({ label: "Subject", value: examConfig.branding.subject });
        }
        if (examConfig && examConfig.branding && examConfig.branding.examCode) {
          items.push({ label: "Exam Code", value: examConfig.branding.examCode });
        }
        items.forEach(function (item) {
          var card = document.createElement("div");
          card.className = "metaCard";
          var label = document.createElement("strong");
          label.textContent = item.label;
          var value = document.createElement("span");
          value.textContent = item.value;
          card.append(label, value);
          ui.setupMeta.appendChild(card);
        });
        ui.studentFields.hidden = !(examConfig && examConfig.branding && examConfig.branding.showStudentInfo !== false);
      }

      function applySetupDefaults() {
        const presetKey = examConfig && examConfig.preset && PRESETS[examConfig.preset] ? examConfig.preset : "quick";
        const preset = PRESETS[presetKey];
        ui.questionCount.value = String(Math.min(examData.length, preset.maxQuestions));
        ui.timeLimit.value = String(preset.timeMinutes);
        ui.shuffleQuestions.checked = Boolean(preset.shuffleQuestions);
        ui.shuffleOptions.checked = Boolean(preset.shuffleOptions);
      }

      function initTheme() {
        var stored = null;
        try {
          stored = window.localStorage.getItem(THEME_KEY);
        } catch (_error) {
          stored = null;
        }
        var initial = (stored === "dark" || stored === "light")
          ? stored
          : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        applyTheme(initial);
      }

      function toggleTheme() {
        var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        var next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        try {
          window.localStorage.setItem(THEME_KEY, next);
        } catch (_error) {
          // Ignore storage errors.
        }
      }

      function applyTheme(theme) {
        var normalized = theme === "dark" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", normalized);
        ui.themeBtn.textContent = normalized === "dark" ? "Light Theme" : "Dark Theme";
      }

      function onVisibilityChange() {
        if (submitted || ui.exam.classList.contains("active") === false) {
          return;
        }
        if (document.visibilityState !== "hidden") {
          return;
        }
        navViolationCount += 1;
        if (navViolationCount <= 2) {
          window.alert("Warning: tab switching is tracked during this exam.");
          return;
        }
        window.alert("Exam auto-submitted due to repeated tab switches.");
        submitExam("auto");
      }

      function onBeforeUnload(event) {
        if (submitted || ui.exam.classList.contains("active") === false) {
          return;
        }
        event.preventDefault();
        event.returnValue = "";
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
        flaggedQuestions = {};
        submitted = false;
        reviewVisible = false;
        totalSeconds = setup.minutes * 60;
        remainingSeconds = totalSeconds;
        startedAt = Date.now();
        endedAt = 0;
        navViolationCount = 0;
        attemptToken = "";
        currentQuestionIndex = 0;
        studentProfile = {
          name: ui.studentName ? ui.studentName.value.trim() : "",
          roll: ui.studentRoll ? ui.studentRoll.value.trim() : "",
          section: ui.studentSection ? ui.studentSection.value.trim() : ""
        };
        if (examConfig && examConfig.security && examConfig.security.token) {
          attemptToken = "AT-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
        }
        renderExam();
        switchScreen("exam");
        syncNavPlacement();
        maybeEnterFullscreen();
        updateTimer();
        startTimer();
      }

      function maybeEnterFullscreen() {
        if (!examConfig || !examConfig.security || !examConfig.security.fullscreen) {
          return;
        }
        if (!document.documentElement.requestFullscreen) {
          return;
        }
        document.documentElement.requestFullscreen().catch(function () {
          window.alert("Fullscreen could not be enabled. Continue with caution.");
        });
      }

      function selectQuestions(count, shuffleQuestionsFlag, shuffleOptionsFlag) {
        const base = examData.map((question, index) => ({
          id: question.id || "q_" + (index + 1),
          question: question.question,
          options: Array.isArray(question.options) ? question.options.slice() : [],
          correctIndex: question.correctIndex,
          marks: Number.isInteger(question.marks) && question.marks > 0 ? question.marks : 1,
          explanation: question.explanation || "",
          topic: question.topic || "",
          difficulty: question.difficulty || "medium",
          tags: Array.isArray(question.tags) ? question.tags.slice() : []
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
          correctIndex,
          marks: question.marks,
          explanation: question.explanation,
          topic: question.topic,
          difficulty: question.difficulty,
          tags: question.tags
        };
      }

      function renderExam() {
        ui.activeTitle.textContent = examTitle || "MCQ Examination";
        var marksTotal = selectedQuestions.reduce(function (sum, item) {
          return sum + (Number.isInteger(item.marks) && item.marks > 0 ? item.marks : 1);
        }, 0);
        updateExamProgress(marksTotal);
        ui.questionList.innerHTML = "";
        selectedQuestions.forEach((question, qIndex) => {
          const card = document.createElement("article");
          card.className = "card";
          card.id = "question-card-" + qIndex;
          const head = document.createElement("div");
          head.className = "questionHead";
          const title = document.createElement("h3");
          title.textContent = (qIndex + 1) + ". " + toRenderableMathText(question.question);
          const flagBtn = document.createElement("button");
          flagBtn.type = "button";
          flagBtn.className = "flagBtn" + (flaggedQuestions[qIndex] ? " active" : "");
          flagBtn.dataset.flagQuestion = String(qIndex);
          flagBtn.textContent = flaggedQuestions[qIndex] ? "Flagged" : "Flag";
          head.append(title, flagBtn);
          const meta = document.createElement("div");
          meta.className = "cardMeta";
          const markChip = document.createElement("span");
          markChip.className = "chip";
          markChip.textContent = (Number.isInteger(question.marks) ? question.marks : 1) + " mark";
          meta.appendChild(markChip);
          if (question.topic) {
            const topicChip = document.createElement("span");
            topicChip.className = "chip";
            topicChip.textContent = question.topic;
            meta.appendChild(topicChip);
          }
          const opts = document.createElement("div");
          opts.className = "opts";
          question.options.forEach((optionText, oIndex) => {
            const label = document.createElement("label");
            label.className = "opt";
            const input = document.createElement("input");
            input.type = "radio";
            input.name = "question-" + qIndex;
            input.checked = userAnswers[qIndex] === oIndex;
            input.addEventListener("change", () => {
              userAnswers[qIndex] = oIndex;
              currentQuestionIndex = qIndex;
              syncQuestionState();
            });
            const span = document.createElement("span");
            span.textContent = toRenderableMathText(optionText);
            label.append(input, span);
            opts.appendChild(label);
          });
          card.append(head, meta, opts);
          ui.questionList.appendChild(card);
        });
        ui.questionList.querySelectorAll("[data-flag-question]").forEach(function (button) {
          button.addEventListener("click", function () {
            toggleFlagged(Number.parseInt(button.dataset.flagQuestion || "0", 10));
          });
        });
        renderQuestionNav();
        queueTypeset(ui.questionList);
      }

      function updateExamProgress(marksTotal) {
        var answeredCount = Object.keys(userAnswers).length;
        var flaggedCount = Object.keys(flaggedQuestions).filter(function (key) { return flaggedQuestions[key]; }).length;
        ui.progress.textContent = "Questions: " + selectedQuestions.length + " | Marks: " + marksTotal + " | Answered: " + answeredCount + " | Flagged: " + flaggedCount;
      }

      function renderQuestionNav() {
        ui.questionNav.innerHTML = "";
        selectedQuestions.forEach(function (_question, index) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "navBtn";
          button.dataset.navQuestion = String(index);
          button.textContent = String(index + 1);
          if (Object.prototype.hasOwnProperty.call(userAnswers, index)) {
            button.classList.add("answered");
          }
          if (flaggedQuestions[index]) {
            button.classList.add("flagged");
          }
          if (currentQuestionIndex === index) {
            button.classList.add("current");
          }
          ui.questionNav.appendChild(button);
        });
      }

      function onQuestionNavClick(event) {
        var button = event.target.closest("[data-nav-question]");
        if (!button) {
          return;
        }
        currentQuestionIndex = Number.parseInt(button.dataset.navQuestion || "0", 10);
        var target = document.getElementById("question-card-" + currentQuestionIndex);
        renderQuestionNav();
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (floatingNav.enabled && floatingNav.isNarrow) {
          setNavOpen(false);
        }
      }

      function toggleFlagged(index) {
        if (!Number.isInteger(index) || index < 0 || index >= selectedQuestions.length) {
          return;
        }
        flaggedQuestions[index] = !flaggedQuestions[index];
        currentQuestionIndex = index;
        syncQuestionState();
      }

      function syncQuestionState() {
        renderExam();
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

      function formatMarksValue(value) {
        var numeric = Number(value || 0);
        if (!Number.isFinite(numeric)) {
          return "0";
        }
        var rounded = Math.round(numeric * 100) / 100;
        if (Math.abs(rounded) < 0.005) {
          rounded = 0;
        }
        if (Number.isInteger(rounded)) {
          return String(rounded);
        }
        return rounded.toFixed(2).replace(/\.?0+$/, "");
      }

      function buildStudentLabel() {
        var parts = [];
        if (studentProfile.name) {
          parts.push(studentProfile.name);
        }
        if (studentProfile.roll) {
          parts.push("Roll " + studentProfile.roll);
        }
        if (studentProfile.section) {
          parts.push("Section " + studentProfile.section);
        }
        return parts.join(" | ");
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
        let earnedMarks = 0;
        let totalMarks = 0;
        let wrongCount = 0;
        const negativeMarks = examConfig && examConfig.marking ? Number(examConfig.marking.negative || 0) : 0;
        const details = selectedQuestions.map((question, index) => {
          const answer = Object.prototype.hasOwnProperty.call(userAnswers, index) ? userAnswers[index] : null;
          const isCorrect = answer === question.correctIndex;
          const marks = Number.isInteger(question.marks) && question.marks > 0 ? question.marks : 1;
          totalMarks += marks;
          if (isCorrect) {
            correctCount += 1;
            earnedMarks += marks;
          } else if (answer !== null && negativeMarks > 0) {
            wrongCount += 1;
            earnedMarks -= negativeMarks;
          }
          return {
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            marks,
            explanation: question.explanation || "",
            topic: question.topic || "",
            flagged: Boolean(flaggedQuestions[index]),
            answer,
            isCorrect
          };
        });
        const total = selectedQuestions.length;
        const percent = total === 0 ? 0 : (correctCount / total) * 100;
        const elapsed = Math.min(totalSeconds, Math.max(0, Math.round((endedAt - startedAt) / 1000)));
        return { correctCount, total, percent, elapsed, details, earnedMarks, totalMarks, wrongCount, negativeMarks };
      }

      function renderResult(result, mode) {
        ui.scoreLabel.textContent = result.correctCount + "/" + result.total;
        ui.percentLabel.textContent = result.percent.toFixed(1) + "%";
        ui.timeLabel.textContent = formatTime(result.elapsed);
        ui.marksLabel.textContent = formatMarksValue(result.earnedMarks) + "/" + formatMarksValue(result.totalMarks);
        const notes = [];
        notes.push(mode === "auto" ? "Auto-submitted because timer reached zero." : "Submitted manually.");
        var studentLabel = buildStudentLabel();
        if (studentLabel) {
          notes.push("Candidate: " + studentLabel + ".");
        }
        notes.push("Marks: " + formatMarksValue(result.earnedMarks) + "/" + formatMarksValue(result.totalMarks) + ".");
        if (result.negativeMarks > 0 && result.wrongCount > 0) {
          notes.push("Negative marking applied: " + formatMarksValue(result.negativeMarks) + " x " + result.wrongCount + " wrong answer" + (result.wrongCount === 1 ? "" : "s") + ".");
        }
        var flaggedCount = result.details.filter(function (item) { return item.flagged; }).length;
        if (flaggedCount > 0) {
          notes.push("Flagged questions: " + flaggedCount + ".");
        }
        if (examConfig && examConfig.branding && examConfig.branding.examCode) {
          notes.push("Exam code: " + examConfig.branding.examCode + ".");
        }
        if (attemptToken) {
          notes.push("Attempt token: " + attemptToken + ".");
        }
        if (navViolationCount > 0) {
          notes.push("Tab switch warnings: " + navViolationCount + ".");
        }
        ui.resultNote.textContent = notes.join(" ");
        renderReview(result.details);
        reviewVisible = false;
        ui.review.classList.add("hidden");
        ui.toggleReview.textContent = "Show Correct Answers";
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        }
      }

      function renderReview(details) {
        ui.review.innerHTML = "";
        details.forEach((item, index) => {
          const card = document.createElement("article");
          card.className = "reviewCard " + (item.isCorrect ? "good" : "bad");
          const title = document.createElement("h3");
          title.textContent = (index + 1) + ". " + toRenderableMathText(item.question) + " (" + item.marks + " mark)";
          const status = document.createElement("p");
          status.className = "reviewStatus";
          status.textContent = item.answer === null ? "Not answered" : item.isCorrect ? "Correct" : "Incorrect";
          const list = document.createElement("ul");
          list.className = "reviewOpts";
          item.options.forEach((optionText, optionIndex) => {
            const li = document.createElement("li");
            li.textContent = toRenderableMathText(optionText);
            if (optionIndex === item.correctIndex) {
              li.classList.add("correct");
            }
            if (item.answer === optionIndex && optionIndex !== item.correctIndex) {
              li.classList.add("incorrect");
            }
            list.appendChild(li);
          });
          card.append(title, status, list);
          if (item.explanation) {
            const explanation = document.createElement("p");
            explanation.className = "reviewStatus";
            explanation.textContent = "Explanation: " + toRenderableMathText(item.explanation);
            card.appendChild(explanation);
          }
          ui.review.appendChild(card);
        });
        queueTypeset(ui.review);
      }

      function toggleReview() {
        reviewVisible = !reviewVisible;
        ui.review.classList.toggle("hidden", !reviewVisible);
        ui.toggleReview.textContent = reviewVisible ? "Hide Correct Answers" : "Show Correct Answers";
        if (reviewVisible) {
          queueTypeset(ui.review);
        }
      }

      function queueTypeset(target, attempt) {
        var tries = Number.isInteger(attempt) ? attempt : 0;
        if (!target || !window.MathJax) {
          return;
        }
        if (typeof window.MathJax.typesetPromise === "function") {
          window.MathJax.typesetPromise([target]).catch(function () {});
          return;
        }
        if (typeof window.MathJax.typeset === "function") {
          try {
            window.MathJax.typeset([target]);
          } catch (_error) {
            // Ignore transient parse/render errors while users type or load partial content.
          }
          return;
        }
        if (tries < 8) {
          window.setTimeout(function () {
            queueTypeset(target, tries + 1);
          }, 250);
        }
      }

      function toRenderableMathText(value) {
        var text = String(value || "");
        var trimmed = text.trim();
        if (!trimmed) {
          return text;
        }
        if (hasExplicitMathDelimiters(trimmed)) {
          return text;
        }
        if (looksLikeLatex(trimmed)) {
          return "\\\\(" + text + "\\\\)";
        }
        return text;
      }

      function hasExplicitMathDelimiters(text) {
        if (text.indexOf("\\\\(") !== -1 || text.indexOf("\\\\[") !== -1 || text.indexOf("$$") !== -1) {
          return true;
        }
        return hasPairedSingleDollar(text);
      }

      function hasPairedSingleDollar(text) {
        var count = 0;
        for (var index = 0; index < text.length; index += 1) {
          if (text[index] !== "$") {
            continue;
          }
          var prev = index > 0 ? text[index - 1] : "";
          var next = index < text.length - 1 ? text[index + 1] : "";
          if (prev === "\\\\" || next === "$") {
            continue;
          }
          count += 1;
        }
        return count >= 2;
      }

      function looksLikeLatex(text) {
        return /\\\\[a-zA-Z]+/.test(text) || /\\\\[^a-zA-Z\\s]/.test(text) || /[{}^_]/.test(text);
      }

      function switchScreen(name) {
        ui.setup.classList.remove("active");
        ui.exam.classList.remove("active");
        ui.result.classList.remove("active");
        if (name === "setup") {
          ui.setup.classList.add("active");
          queueTypeset(ui.setup);
        } else if (name === "exam") {
          ui.exam.classList.add("active");
          syncNavPlacement();
          queueTypeset(ui.exam);
        } else {
          ui.result.classList.add("active");
          queueTypeset(ui.result);
        }
      }
    })();
  ${scriptCloseTag}
</body>
</html>`;
  }
})();
