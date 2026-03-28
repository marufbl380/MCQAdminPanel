import { DEFAULT_SHORTCUTS } from "./constants.js";

export const appState = {
  questions: [],
  selectedQuestionId: null,
  selectedQuestionIds: new Set(),

  editorFloatActive: null, // "question" | "optionAction" | "optionEdit"
  floatQuestionState: {
    baseline: "",
    returnParent: null,
    returnNextSibling: null,
    preSnapshot: "",
    preDirty: false,
    preSaveState: null
  },
  floatOptionActionState: { optionIndex: -1 },
  floatOptionEditState: {
    optionIndex: -1,
    baseline: "",
    returnParent: null,
    returnNextSibling: null,
    preSnapshot: "",
    preDirty: false,
    preSaveState: null
  },

  editor: {
    draft: null, // initialized by editor feature
    snapshot: "",
    dirty: false,
    dragId: null,
    activeInput: null
  },

  filters: {
    query: "",
    topic: "",
    difficulty: "",
    duplicatesOnly: false
  },

  examConfig: {
    preset: "quick",
    security: { fullscreen: false, navWarn: true, token: true },
    branding: { institution: "", subject: "", examCode: "", showStudentInfo: true },
    marking: { negative: 0 }
  },

  shortcuts: { ...DEFAULT_SHORTCUTS },
  statusLogItems: [],
  snapshotLibrary: [],

  timers: {
    persistTimer: null,
    historyTimer: null,
    statusTimer: null,
    typingStateTimer: null,
    questionPreviewTimer: null
  },

  historySuspended: false,
  history: { undo: [], redo: [] },

  pendingExamCreation: null,
  activeModal: null,

  saveState: { mode: "saved", at: null },

  toastSeed: 0,

  weakTimers: {
    optionPreviewTimers: new WeakMap(),
    resizeFrameTimers: new WeakMap(),
    typesetTimers: new WeakMap()
  }
};

