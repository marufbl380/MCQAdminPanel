export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const PREVIEW_LEN = 100;
export const DEFAULT_EXAM_TITLE = "MCQ Examination";

export const MATH_CURSOR_TOKEN = "__CURSOR__";
export const MATH_NEXT_1 = "__NEXT1__";
export const MATH_NEXT_2 = "__NEXT2__";
export const MATH_NEXT_3 = "__NEXT3__";

// Set this to a vendored MathJax path if you ship a local bundle with the project.
export const LOCAL_MATHJAX_SRC = "./vendor/mathjax/es5/tex-mml-chtml.js";
export const CDN_MATHJAX_SRC = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";

export const THEME_STORAGE_KEY = "mcq_admin_theme_v2";
export const CONTRAST_STORAGE_KEY = "mcq_admin_contrast_v1";
export const APP_STORAGE_KEY = "mcq_admin_state_v2";
export const SHORTCUTS_STORAGE_KEY = "mcq_admin_shortcuts_v1";
export const SNAPSHOT_STORAGE_KEY = "mcq_admin_snapshots_v1";

export const HISTORY_LIMIT = 120;
export const STATUS_LOG_LIMIT = 120;
export const TOAST_LIMIT = 4;
export const CURRENT_SCHEMA_VERSION = 2;

export const PREVIEW_DEBOUNCE_MS = 280;
export const TYPING_IDLE_MS = 220;
export const PERSIST_DEBOUNCE_MS = 260;
export const HISTORY_DEBOUNCE_MS = 360;

export const EXAM_PRESETS = {
  quick: { label: "Quick Quiz", maxQuestions: 10, timeMinutes: 15, shuffleQuestions: true, shuffleOptions: true },
  school: { label: "School Test", maxQuestions: 30, timeMinutes: 40, shuffleQuestions: false, shuffleOptions: false },
  mock: { label: "Full Mock", maxQuestions: 80, timeMinutes: 90, shuffleQuestions: true, shuffleOptions: true }
};

export const DEFAULT_SHORTCUTS = {
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

export const MATH_STRUCTURE_GROUPS = [
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

export const MATH_SYMBOL_GROUPS = [
  {
    title: "Greek",
    items: [
      { label: "α", insert: "\\alpha " },
      { label: "β", insert: "\\beta " },
      { label: "γ", insert: "\\gamma " },
      { label: "θ", insert: "\\theta " },
      { label: "λ", insert: "\\lambda " },
      { label: "π", insert: "\\pi " },
      { label: "σ", insert: "\\sigma " },
      { label: "φ", insert: "\\phi " },
      { label: "ω", insert: "\\omega " },
      { label: "Δ", insert: "\\Delta " }
    ]
  },
  {
    title: "Operators",
    items: [
      { label: "×", insert: "\\times " },
      { label: "÷", insert: "\\div " },
      { label: "±", insert: "\\pm " },
      { label: "⋅", insert: "\\cdot " },
      { label: "∗", insert: "\\ast " },
      { label: "⊗", insert: "\\otimes " },
      { label: "⊕", insert: "\\oplus " },
      { label: "∞", insert: "\\infty " }
    ]
  },
  {
    title: "Relations",
    items: [
      { label: "≠", insert: "\\neq " },
      { label: "≤", insert: "\\leq " },
      { label: "≥", insert: "\\geq " },
      { label: "≈", insert: "\\approx " },
      { label: "≡", insert: "\\equiv " },
      { label: "∼", insert: "\\sim " },
      { label: "∝", insert: "\\propto " }
    ]
  },
  {
    title: "Sets",
    items: [
      { label: "∈", insert: "\\in " },
      { label: "∉", insert: "\\notin " },
      { label: "⊂", insert: "\\subset " },
      { label: "⊆", insert: "\\subseteq " },
      { label: "∪", insert: "\\cup " },
      { label: "∩", insert: "\\cap " },
      { label: "∅", insert: "\\emptyset " },
      { label: "ℝ", insert: "\\mathbb{R} " },
      { label: "ℕ", insert: "\\mathbb{N} " },
      { label: "ℤ", insert: "\\mathbb{Z} " }
    ]
  },
  {
    title: "Logic",
    items: [
      { label: "∀", insert: "\\forall " },
      { label: "∃", insert: "\\exists " },
      { label: "¬", insert: "\\neg " },
      { label: "∧", insert: "\\land " },
      { label: "∨", insert: "\\lor " },
      { label: "⇒", insert: "\\Rightarrow " },
      { label: "⇔", insert: "\\Leftrightarrow " },
      { label: "⊢", insert: "\\vdash " }
    ]
  },
  {
    title: "Arrows",
    items: [
      { label: "→", insert: "\\to " },
      { label: "←", insert: "\\leftarrow " },
      { label: "↔", insert: "\\leftrightarrow " },
      { label: "↦", insert: "\\mapsto " },
      { label: "↑", insert: "\\uparrow " },
      { label: "↓", insert: "\\downarrow " }
    ]
  },
  {
    title: "Misc",
    items: [
      { label: "∂", insert: "\\partial " },
      { label: "∇", insert: "\\nabla " },
      { label: "∠", insert: "\\angle " },
      { label: "⊥", insert: "\\perp " },
      { label: "∥", insert: "\\parallel " },
      { label: "°", insert: "^{\\circ}" }
    ]
  }
];

