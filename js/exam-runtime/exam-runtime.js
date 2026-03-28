(() => {
      "use strict";
      const examTitle = __EXAM_TITLE__;
      const examData = __EXAM_DATA__;
      const examConfig = __EXAM_CONFIG__;
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

        let resizeTimer = 0;
        window.addEventListener("resize", () => {
          if (resizeTimer) {
            window.clearTimeout(resizeTimer);
          }
          resizeTimer = window.setTimeout(syncNavPlacement, 120);
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
