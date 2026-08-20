(function () {
  "use strict";

  const STORAGE_KEY = "schoolmate.schedule.v1";
  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const TEXT = {
    days: { monday: "Понедельник", tuesday: "Вторник", wednesday: "Среда", thursday: "Четверг", friday: "Пятница" },
    daysShort: { monday: "Пн", tuesday: "Вт", wednesday: "Ср", thursday: "Чт", friday: "Пт" },
    noLessons: "Сегодня уроков нет 🎉",
    emptyDay: "На этот день уроков пока нет",
    saved: "Расписание сохранено",
    resetConfirm: "Сбросить расписание и вернуть демонстрационные данные?",
    resetDone: "Расписание сброшено"
  };

  const DEFAULT_SCHEDULE = {
    monday: [lesson("08:00", "Математика"), lesson("08:55", "Польский язык"), lesson("09:50", "Английский язык"), lesson("10:45", "Физкультура"), lesson("11:40", "Информатика")],
    tuesday: [lesson("08:00", "Польский язык"), lesson("08:55", "Математика"), lesson("09:50", "Природа"), lesson("10:45", "Музыка"), lesson("11:40", "Английский язык")],
    wednesday: [lesson("08:00", "Английский язык"), lesson("08:55", "Математика"), lesson("09:50", "Польский язык"), lesson("10:45", "Информатика")],
    thursday: [lesson("08:00", "Математика"), lesson("08:55", "Польский язык"), lesson("09:50", "Английский язык"), lesson("10:45", "Физкультура"), lesson("11:40", "Природа")],
    friday: [lesson("08:00", "Польский язык"), lesson("08:55", "Математика"), lesson("09:50", "ИЗО"), lesson("10:45", "Физкультура")]
  };

  let schedule = loadSchedule();
  let selectedDay = getTodayKey() || "monday";
  let editorDraft = null;
  let toastTimer;
  const app = document.querySelector("#app");

  function lesson(time, subject) { return { id: createId(), time, subject }; }
  function createId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clone(data) { return JSON.parse(JSON.stringify(data)); }

  function normalizeSchedule(value) {
    const result = {};
    DAYS.forEach((day) => {
      result[day] = Array.isArray(value && value[day])
        ? value[day].filter((item) => item && typeof item.subject === "string" && typeof item.time === "string").map((item) => ({ id: item.id || createId(), subject: item.subject, time: item.time }))
        : [];
    });
    return result;
  }

  function loadSchedule() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? normalizeSchedule(JSON.parse(stored)) : clone(DEFAULT_SCHEDULE);
    } catch (error) {
      console.warn("Не удалось прочитать расписание:", error);
      return clone(DEFAULT_SCHEDULE);
    }
  }

  function saveSchedule(nextSchedule) {
    schedule = normalizeSchedule(nextSchedule);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  }

  function getTodayKey() {
    const jsDay = new Date().getDay();
    return [null, "monday", "tuesday", "wednesday", "thursday", "friday", null][jsDay];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function formatDate(date, includeWeekday) {
    const options = includeWeekday ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "long" };
    const value = new Intl.DateTimeFormat("ru-RU", options).format(date);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function lessonList(items, emptyText) {
    if (!items.length) return `<div class="empty-state"><span aria-hidden="true">🌤️</span><strong>${escapeHtml(emptyText)}</strong><p>Можно отдохнуть или запланировать что-нибудь интересное.</p></div>`;
    return `<ol class="lesson-list">${items.map((item, index) => `<li class="lesson-row"><time class="lesson-time" datetime="${escapeHtml(item.time)}">${escapeHtml(item.time)}</time><span class="lesson-subject">${escapeHtml(item.subject)}</span><span class="lesson-number" aria-label="Урок ${index + 1}">${index + 1}</span></li>`).join("")}</ol>`;
  }

  function renderToday() {
    const today = getTodayKey();
    const lessons = today ? schedule[today] : [];
    app.innerHTML = `
      <section class="hero">
        <div class="hero-copy"><p class="eyebrow">Твой школьный помощник</p><h1>${formatDate(new Date(), true)}</h1><p class="lead">Посмотри, какие уроки ждут тебя сегодня.</p></div>
        <div class="hero-art" aria-hidden="true"><div class="hero-art-inner"><span class="big-emoji">📚</span><strong>Всё по плану!</strong></div></div>
      </section>
      <section class="card" aria-labelledby="today-title">
        <div class="section-heading"><h2 id="today-title">Сегодня</h2><span class="count-badge">${lessons.length} ${pluralLessons(lessons.length)}</span></div>
        ${lessonList(lessons, TEXT.noLessons)}
        <div class="actions"><a class="btn btn-primary" href="#schedule">📅 Расписание</a><a class="btn btn-secondary" href="#edit">✏️ Редактировать</a></div>
      </section>`;
  }

  function pluralLessons(count) {
    const mod10 = count % 10, mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "урок";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "урока";
    return "уроков";
  }

  function dayTabs() {
    const today = getTodayKey();
    return `<div class="day-tabs" role="tablist" aria-label="Дни недели">${DAYS.map((day) => `<button class="day-tab${day === selectedDay ? " active" : ""}${day === today ? " is-today" : ""}" role="tab" aria-selected="${day === selectedDay}" data-day="${day}">${TEXT.daysShort[day]}</button>`).join("")}</div>`;
  }

  function renderSchedule() {
    const lessons = schedule[selectedDay];
    app.innerHTML = `<h1 class="page-title">Расписание</h1>${dayTabs()}<section class="card"><div class="section-heading"><h2>${TEXT.days[selectedDay]}</h2><span class="count-badge">${lessons.length} ${pluralLessons(lessons.length)}</span></div>${lessonList(lessons, TEXT.emptyDay)}<div class="actions"><a class="btn btn-secondary" href="#edit">✏️ Изменить</a></div></section>`;
  }

  function renderEditor() {
    if (!editorDraft) editorDraft = clone(schedule);
    const items = editorDraft[selectedDay];
    app.innerHTML = `<h1 class="page-title">Редактор</h1>${dayTabs()}<section class="card"><div class="section-heading"><h2>${TEXT.days[selectedDay]}</h2><span class="count-badge">Изменения не сохранены</span></div><div class="editor-list">${items.length ? items.map(editorRow).join("") : `<div class="empty-state"><span aria-hidden="true">✏️</span><strong>${TEXT.emptyDay}</strong><p>Добавь первый урок кнопкой ниже.</p></div>`}</div><div class="actions"><button class="btn btn-secondary" data-action="add">＋ Добавить урок</button><button class="btn btn-primary" data-action="save">Сохранить</button><a class="btn btn-danger" href="#schedule">Отмена</a></div></section>`;
  }

  function editorRow(item, index, items) {
    return `<div class="editor-row" data-index="${index}"><label><span class="sr-only">Время урока ${index + 1}</span><input class="field" data-field="time" type="time" value="${escapeHtml(item.time)}" aria-label="Время урока ${index + 1}"></label><label><span class="sr-only">Название урока ${index + 1}</span><input class="field" data-field="subject" type="text" maxlength="60" value="${escapeHtml(item.subject)}" placeholder="Название предмета" aria-label="Название урока ${index + 1}"></label><div class="row-controls"><button class="icon-btn" data-action="up" aria-label="Переместить урок вверх" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-btn" data-action="down" aria-label="Переместить урок вниз" ${index === items.length - 1 ? "disabled" : ""}>↓</button><button class="icon-btn delete" data-action="delete" aria-label="Удалить урок">×</button></div></div>`;
  }

  function renderSettings() {
    app.innerHTML = `<h1 class="page-title">Настройки</h1><div class="settings-grid"><section class="card"><p class="eyebrow">Расписание</p><h2>Настрой свой учебный день</h2><p class="lead">Добавляй предметы, меняй время и порядок уроков.</p><div class="actions"><a class="btn btn-primary" href="#edit">✏️ Редактировать</a></div></section><section class="card"><p class="eyebrow">Данные</p><h2>Начать заново</h2><p class="lead">Верни демонстрационное расписание. Твои изменения будут удалены.</p><div class="actions"><button class="btn btn-danger" data-action="reset">Сбросить расписание</button></div></section><section class="card"><p class="eyebrow">О приложении</p><h2>SchoolMate</h2><p class="lead">Простой помощник для школьных будней.</p><p><span class="version">Версия 0.1</span></p></section></div>`;
  }

  function getRoute() {
    const route = location.hash.replace("#", "") || "today";
    return ["today", "schedule", "settings", "edit"].includes(route) ? route : "today";
  }

  function render() {
    const route = getRoute();
    if (route !== "edit") editorDraft = null;
    if (route === "today") renderToday();
    if (route === "schedule") renderSchedule();
    if (route === "settings") renderSettings();
    if (route === "edit") renderEditor();
    document.querySelectorAll(".bottom-nav a").forEach((link) => link.classList.toggle("active", link.dataset.route === route || (route === "edit" && link.dataset.route === "settings")));
    window.scrollTo(0, 0);
  }

  function updateDraftFromInputs() {
    document.querySelectorAll(".editor-row").forEach((row) => {
      const item = editorDraft[selectedDay][Number(row.dataset.index)];
      item.time = row.querySelector('[data-field="time"]').value;
      item.subject = row.querySelector('[data-field="subject"]').value;
    });
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  app.addEventListener("click", (event) => {
    const dayButton = event.target.closest("[data-day]");
    if (dayButton) {
      if (getRoute() === "edit") updateDraftFromInputs();
      selectedDay = dayButton.dataset.day;
      render();
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "reset") {
      if (window.confirm(TEXT.resetConfirm)) { saveSchedule(clone(DEFAULT_SCHEDULE)); showToast(TEXT.resetDone); renderSettings(); }
      return;
    }
    if (getRoute() !== "edit") return;
    updateDraftFromInputs();
    const row = actionButton.closest(".editor-row");
    const index = row ? Number(row.dataset.index) : -1;
    const items = editorDraft[selectedDay];
    if (action === "add") items.push(lesson("08:00", ""));
    if (action === "delete") items.splice(index, 1);
    if (action === "up" && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
    if (action === "down" && index < items.length - 1) [items[index + 1], items[index]] = [items[index], items[index + 1]];
    if (action === "save") {
      const invalid = DAYS.some((day) => editorDraft[day].some((item) => !item.subject.trim() || !item.time));
      if (invalid) { showToast("Заполни название и время каждого урока"); return; }
      DAYS.forEach((day) => editorDraft[day].forEach((item) => { item.subject = item.subject.trim(); }));
      saveSchedule(editorDraft);
      editorDraft = null;
      showToast(TEXT.saved);
      location.hash = "schedule";
      return;
    }
    renderEditor();
    if (action === "add") document.querySelector('.editor-row:last-child [data-field="subject"]')?.focus();
  });

  window.addEventListener("hashchange", render);
  document.querySelector("#header-date").textContent = formatDate(new Date(), false);
  render();
})();
