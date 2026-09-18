/**
 * app.js — Lógica principal do Agendado Abner
 * ------------------------------------------------------------
 * Organizado em seções:
 *   1. Estado e utilitários gerais
 *   2. Formulário de configuração do plano (compartilhado entre
 *      o modal de onboarding e a página Configurações)
 *   3. Navegação entre views
 *   4. Dashboard
 *   5. Agenda
 *   6. Calendário
 *   7. Conteúdos
 *   8. Redação
 *   9. Revisões e Simulados
 *  10. Relatórios
 *  11. Cronômetro de estudo
 *  12. Modais utilitários (confirmação, toast, genérico)
 *  13. Inicialização
 * ------------------------------------------------------------
 */

/* ======================= 1. ESTADO E UTILITÁRIOS ======================= */

const App = {
  config: null,
  tasks: [],
  contentStatus: {},
  redacoes: [],
  simulados: [],
  revisoes: [],
  history: [],
  currentView: 'dashboard',
  calendarRefDate: new Date(),
  calendarMode: 'mes',
  contentAreaFilter: 'todas',
};

function todayISO() { return Scheduler.dateToISO(new Date()); }

function fmtDateBR(iso) {
  if (!iso) return '—';
  const d = Scheduler.isoToDate(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateLong(iso) {
  const d = Scheduler.isoToDate(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function minutesToHuman(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h}h${String(m).padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

function daysBetween(isoA, isoB) {
  const a = Scheduler.toDateOnly(Scheduler.isoToDate(isoA));
  const b = Scheduler.toDateOnly(Scheduler.isoToDate(isoB));
  return Math.round((b - a) / 86400000);
}

function saveConfig() { Storage.set(STORAGE_KEYS.CONFIG, App.config); }
function saveTasks() { Storage.set(STORAGE_KEYS.TASKS, App.tasks); }
function saveContentStatus() { Storage.set(STORAGE_KEYS.CONTENT_STATUS, App.contentStatus); }
function saveRedacoes() { Storage.set(STORAGE_KEYS.REDACOES, App.redacoes); }
function saveSimulados() { Storage.set(STORAGE_KEYS.SIMULADOS, App.simulados); }
function saveRevisoes() { Storage.set(STORAGE_KEYS.REVISOES, App.revisoes); }
function saveHistory() { Storage.set(STORAGE_KEYS.HISTORY, App.history); }

/** Status "efetivo" de uma tarefa, calculado no momento da leitura
 *  (uma tarefa pendente cuja data já passou é tratada como atrasada,
 *  sem precisar reescrever o dado salvo). */
function effectiveStatus(task) {
  if (task.status === 'Concluído' || task.status === 'Reagendado') return task.status;
  if (task.date < todayISO() && task.status !== 'Concluído') return 'Atrasado';
  return task.status;
}

function getContentStatusEntry(topicId) {
  return App.contentStatus[topicId] || {
    status: CONTENT_STATUS.NAO_INICIADO,
    priority: 'normal',
    difficulty: 'medio',
    questionsSolved: 0,
    notes: ''
  };
}

function setContentStatusEntry(topicId, patch) {
  const current = getContentStatusEntry(topicId);
  App.contentStatus[topicId] = { ...current, ...patch };
  saveContentStatus();
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ======================= 2. FORMULÁRIO DE CONFIGURAÇÃO ======================= */

function buildWeekdayPicker(container, selected) {
  container.innerHTML = '';
  WEEKDAYS.forEach(wd => {
    const chip = el(`<button type="button" class="weekday-chip" data-value="${wd.value}">${wd.short}</button>`);
    if (selected.includes(wd.value)) chip.classList.add('is-active');
    chip.addEventListener('click', () => chip.classList.toggle('is-active'));
    container.appendChild(chip);
  });
}

function getSelectedWeekdays(container) {
  return [...container.querySelectorAll('.weekday-chip.is-active')].map(b => Number(b.dataset.value));
}

function fillDaySelect(selectEl, selectedValue) {
  selectEl.innerHTML = '<option value="">Nenhum</option>' +
    WEEKDAYS.map(wd => `<option value="${wd.value}">${wd.label}</option>`).join('');
  if (selectedValue !== null && selectedValue !== undefined) selectEl.value = String(selectedValue);
}

function defaultConfig() {
  const start = new Date();
  const exam = new Date(); exam.setMonth(exam.getMonth() + 4);
  return {
    studentName: 'Abner',
    startDate: Scheduler.dateToISO(start),
    examDate: Scheduler.dateToISO(exam),
    preferredStartTime: '08:00',
    dailyMinutes: 120,
    subjectsPerDay: 2,
    breakMinutes: 10,
    studyDays: [1, 2, 3, 4, 5, 6],
    revisionDay: 6,
    simuladoDay: 0
  };
}

/** Popula um <form> de configuração (usado tanto no modal de onboarding
 * quanto na página Configurações) a partir de um objeto de config. */
function fillConfigForm(prefix, cfg) {
  $(`#${prefix}Nome`).value = cfg.studentName || '';
  $(`#${prefix}Inicio`).value = cfg.startDate || '';
  $(`#${prefix}Prova`).value = cfg.examDate || '';
  $(`#${prefix}Horario`).value = cfg.preferredStartTime || '08:00';
  $(`#${prefix}Pausa`).value = cfg.breakMinutes ?? 10;
  $(`#${prefix}SubjectsPerDay`).value = String(cfg.subjectsPerDay || 2);

  const durSelect = $(`#${prefix}Duracao`);
  const presetValues = ['60', '90', '120', '150', '180'];
  if (presetValues.includes(String(cfg.dailyMinutes))) {
    durSelect.value = String(cfg.dailyMinutes);
    $(`#${prefix}DuracaoCustomWrap`).hidden = true;
  } else {
    durSelect.value = 'custom';
    $(`#${prefix}DuracaoCustomWrap`).hidden = false;
    $(`#${prefix}DuracaoCustom`).value = cfg.dailyMinutes || 60;
  }

  buildWeekdayPicker($(`#${prefix}Weekdays`), cfg.studyDays || [1,2,3,4,5,6]);
  fillDaySelect($(`#${prefix}RevisionDay`), cfg.revisionDay);
  fillDaySelect($(`#${prefix}SimuladoDay`), cfg.simuladoDay);
}

function wireDurationToggle(prefix) {
  const durSelect = $(`#${prefix}Duracao`);
  durSelect.addEventListener('change', () => {
    $(`#${prefix}DuracaoCustomWrap`).hidden = durSelect.value !== 'custom';
  });
}

function readConfigForm(prefix) {
  const durSelect = $(`#${prefix}Duracao`);
  const dailyMinutes = durSelect.value === 'custom'
    ? Number($(`#${prefix}DuracaoCustom`).value)
    : Number(durSelect.value);

  return {
    studentName: $(`#${prefix}Nome`).value.trim() || 'Estudante',
    startDate: $(`#${prefix}Inicio`).value,
    examDate: $(`#${prefix}Prova`).value,
    preferredStartTime: $(`#${prefix}Horario`).value || '08:00',
    dailyMinutes,
    subjectsPerDay: Number($(`#${prefix}SubjectsPerDay`).value),
    breakMinutes: Number($(`#${prefix}Pausa`).value) || 0,
    studyDays: getSelectedWeekdays($(`#${prefix}Weekdays`)),
    revisionDay: $(`#${prefix}RevisionDay`).value === '' ? null : Number($(`#${prefix}RevisionDay`).value),
    simuladoDay: $(`#${prefix}SimuladoDay`).value === '' ? null : Number($(`#${prefix}SimuladoDay`).value),
  };
}

function validateConfigForm(cfg, prefix) {
  const errors = [];
  const errorBox = $(`#${prefix}DuracaoError`);
  if (!cfg.dailyMinutes || cfg.dailyMinutes < 60) {
    errors.push('duracao');
    if (errorBox) errorBox.hidden = false;
  } else if (errorBox) errorBox.hidden = true;

  if (!cfg.startDate || !cfg.examDate) errors.push('datas');
  if (cfg.examDate && cfg.startDate && cfg.examDate < cfg.startDate) {
    errors.push('ordem-datas');
    toast('A data da prova precisa ser depois da data de início.');
  }
  if (!cfg.studyDays.length) {
    errors.push('dias');
    toast('Selecione ao menos um dia da semana para estudar.');
  }
  return errors;
}

/** Gera (ou regera) o cronograma completo a partir da config atual,
 * preservando o histórico de tarefas passadas (antes de hoje). */
function generateOrRegenerateSchedule(cfg, { preservePast = true } = {}) {
  const priorityIds = Object.entries(App.contentStatus)
    .filter(([, v]) => v.difficulty === 'dificil' || v.status === CONTENT_STATUS.PRECISA_REVISAR)
    .map(([id]) => id);

  const queue = getInterleavedTopics();
  const newTasks = Scheduler.generateSchedule(cfg, queue, priorityIds);

  if (preservePast && App.tasks.length) {
    const cutoff = todayISO();
    const past = App.tasks.filter(t => t.date < cutoff);
    App.tasks = [...past, ...newTasks.filter(t => t.date >= cutoff)];
  } else {
    App.tasks = newTasks;
  }
  saveTasks();
}

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $all(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

/* ======================= 3. NAVEGAÇÃO ======================= */

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  agenda: 'Minha Agenda',
  calendario: 'Calendário',
  conteudos: 'Conteúdos',
  redacao: 'Redação',
  revisoes: 'Revisões e Simulados',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações'
};

function goToView(viewName) {
  if (!VIEW_TITLES[viewName]) return;
  App.currentView = viewName;
  $all('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === viewName));
  $all('.nav-item[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === viewName));
  $all('.bottom-nav__item[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === viewName));
  $('#pageTitle').textContent = VIEW_TITLES[viewName];
  closeSidebar();
  renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function renderCurrentView() {
  switch (App.currentView) {
    case 'dashboard': renderDashboard(); break;
    case 'agenda': renderAgenda(); break;
    case 'calendario': renderCalendar(); break;
    case 'conteudos': renderConteudos(); break;
    case 'redacao': renderRedacao(); break;
    case 'revisoes': renderRevisoes(); break;
    case 'relatorios': renderRelatorios(); break;
    case 'configuracoes': renderConfiguracoes(); break;
  }
}

function openSidebar() { $('#sidebar').classList.add('is-open'); $('#sidebarOverlay').classList.add('is-open'); }
function closeSidebar() { $('#sidebar').classList.remove('is-open'); $('#sidebarOverlay').classList.remove('is-open'); }

/* ======================= 4. DASHBOARD ======================= */

function renderTaskCard(task, opts = {}) {
  const status = effectiveStatus(task);
  const card = el(`
    <div class="task-card" data-status="${status}" data-task-id="${task.id}">
      <div class="task-card__time">${task.startTime}</div>
      <div class="task-card__body">
        <div class="task-card__title">${escapeHtml(task.topic || task.subject)}</div>
        <div class="task-card__meta">
          <span class="badge badge--${status.replace(' ', '-')}">${status}</span>
          <span>${escapeHtml(task.area)} · ${escapeHtml(task.activityType)} · ${minutesToHuman(task.durationMinutes)}</span>
        </div>
      </div>
      <div class="task-card__actions"></div>
    </div>
  `);

  const actions = $('.task-card__actions', card);
  if (status !== 'Concluído') {
    const startBtn = el(`<button class="icon-btn" title="Iniciar estudo">▶</button>`);
    startBtn.addEventListener('click', (e) => { e.stopPropagation(); openTimerModal(task.id); });
    actions.appendChild(startBtn);

    const doneBtn = el(`<button class="icon-btn" title="Marcar como concluído">✔</button>`);
    doneBtn.addEventListener('click', (e) => { e.stopPropagation(); markTaskDone(task.id); });
    actions.appendChild(doneBtn);
  }
  card.addEventListener('click', () => openTaskModal(task.id));
  if (opts.compact) card.querySelector('.task-card__meta span:last-child')?.remove();
  return card;
}

function markTaskDone(taskId, minutesStudied = null) {
  const task = App.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.status = 'Concluído';
  const minutes = minutesStudied ?? task.durationMinutes;
  App.history.push({ id: Scheduler.uid(), taskId, date: todayISO(), minutes, topicId: task.topicId, areaId: task.areaId });
  saveTasks(); saveHistory();
  if (task.topicId) {
    const entry = getContentStatusEntry(task.topicId);
    if (entry.status === CONTENT_STATUS.NAO_INICIADO) setContentStatusEntry(task.topicId, { status: CONTENT_STATUS.ESTUDANDO });
  }
  toast('Estudo marcado como concluído! 🎉');
  renderCurrentView();
}

function computeOverallProgress() {
  const relevant = App.tasks.filter(t => t.activityType !== 'Descanso');
  if (!relevant.length) return 0;
  const done = relevant.filter(t => t.status === 'Concluído').length;
  return Math.round((done / relevant.length) * 100);
}

function computeAreaProgress() {
  const byArea = {};
  Object.values(ENEM_AREAS).forEach(a => byArea[a.id] = { name: a.short, color: a.color, total: 0, done: 0 });
  App.tasks.forEach(t => {
    if (!byArea[t.areaId]) return;
    byArea[t.areaId].total++;
    if (t.status === 'Concluído') byArea[t.areaId].done++;
  });
  return byArea;
}

function computeWeekHours() {
  const start = new Date(); start.setDate(start.getDate() - start.getDay());
  const startISO = Scheduler.dateToISO(start);
  const minutes = App.history.filter(h => h.date >= startISO).reduce((a, h) => a + h.minutes, 0);
  return (minutes / 60).toFixed(1);
}

function renderDashboard() {
  if (!App.config) return;
  $('#greetingText').textContent = `Olá, ${App.config.studentName}! Vamos estudar hoje?`;

  const today = todayISO();
  const daysLeft = Math.max(0, daysBetween(today, App.config.examDate));
  $('#statDaysLeft').textContent = daysLeft;
  $('#statProgress').textContent = computeOverallProgress() + '%';
  $('#statWeekHours').textContent = computeWeekHours() + 'h';

  const overdueTasks = App.tasks.filter(t => effectiveStatus(t) === 'Atrasado');
  $('#statOverdue').textContent = overdueTasks.length;

  $('#todayDateChip').textContent = fmtDateLong(today);
  const todayTasks = App.tasks.filter(t => t.date === today).sort((a,b) => a.startTime.localeCompare(b.startTime));
  const todayList = $('#todayTasksList'); todayList.innerHTML = '';
  if (!todayTasks.length) {
    todayList.appendChild(el(`<p style="color:var(--text-muted);font-size:13.5px;padding:6px 0;">Nenhum estudo agendado para hoje. Configure seu plano para gerar a agenda.</p>`));
  } else {
    todayTasks.forEach(t => todayList.appendChild(renderTaskCard(t)));
  }

  const overdueList = $('#overdueTasksList'); overdueList.innerHTML = '';
  overdueTasks.slice(0, 8).forEach(t => overdueList.appendChild(renderTaskCard(t)));

  const nextTask = App.tasks
    .filter(t => t.status === 'Pendente' && t.date >= today)
    .sort((a,b) => (a.date+a.startTime).localeCompare(b.date+b.startTime))[0];
  $('#nextTopicBox').innerHTML = nextTask
    ? `<strong>${escapeHtml(nextTask.topic || nextTask.subject)}</strong><br><span style="color:var(--text-secondary);font-size:13px">${escapeHtml(nextTask.area)} · ${fmtDateBR(nextTask.date)} às ${nextTask.startTime}</span>`
    : 'Nenhum conteúdo pendente. 🎉';

  Charts.donutChart($('#dashDonut'), { value: computeOverallProgress(), max: 100, color: '--accent', label: 'concluído' });

  const areaProgress = computeAreaProgress();
  const legend = $('#areaProgressLegend'); legend.innerHTML = '';
  Object.values(areaProgress).forEach(a => {
    const pct = a.total ? Math.round((a.done / a.total) * 100) : 0;
    legend.appendChild(el(`<span><i class="dot" style="background:${a.color}"></i>${a.name}: ${pct}%</span>`));
  });
}

/* ======================= 5. AGENDA ======================= */

function populateAgendaFilters() {
  const statusSel = $('#agendaFilterStatus');
  if (statusSel.options.length <= 1) {
    Object.values(TASK_STATUS).forEach(s => statusSel.appendChild(el(`<option value="${s}">${s}</option>`)));
  }
  const areaSel = $('#agendaFilterArea');
  if (areaSel.options.length <= 1) {
    Object.values(ENEM_AREAS).forEach(a => areaSel.appendChild(el(`<option value="${a.id}">${a.short}</option>`)));
    areaSel.appendChild(el(`<option value="redacao">Redação</option>`));
    areaSel.appendChild(el(`<option value="geral">Simulado</option>`));
  }
}

function renderAgenda() {
  populateAgendaFilters();
  const dateInput = $('#agendaDatePicker');
  if (!dateInput.value) dateInput.value = todayISO();

  const statusFilter = $('#agendaFilterStatus').value;
  const areaFilter = $('#agendaFilterArea').value;
  const date = dateInput.value;

  let items = App.tasks.filter(t => t.date === date);
  if (statusFilter) items = items.filter(t => effectiveStatus(t) === statusFilter);
  if (areaFilter) items = items.filter(t => t.areaId === areaFilter);
  items.sort((a,b) => a.startTime.localeCompare(b.startTime));

  const list = $('#agendaList'); list.innerHTML = '';
  if (!items.length) {
    list.appendChild(el(`<p style="color:var(--text-muted);font-size:13.5px;">Nenhum estudo para este filtro/data.</p>`));
  } else {
    items.forEach(t => list.appendChild(renderTaskCard(t)));
  }
}

function wireAgendaEvents() {
  $('#agendaDatePicker').addEventListener('change', renderAgenda);
  $('#agendaTodayBtn').addEventListener('click', () => { $('#agendaDatePicker').value = todayISO(); renderAgenda(); });
  $('#agendaFilterStatus').addEventListener('change', renderAgenda);
  $('#agendaFilterArea').addEventListener('change', renderAgenda);
}

/* ======================= 6. CALENDÁRIO ======================= */

function dotColorForTask(task) {
  const status = effectiveStatus(task);
  if (status === 'Atrasado') return 'var(--danger)';
  if (status === 'Concluído') return 'var(--success)';
  if (task.activityType === 'Revisão') return 'var(--warning)';
  if (task.activityType === 'Redação') return '#8E6BC7';
  if (task.activityType === 'Simulado') return '#E08A3C';
  return 'var(--accent)';
}

function renderCalendar() {
  const grid = $('#calendarGrid');
  grid.className = 'calendar-grid mode-' + App.calendarMode;
  grid.innerHTML = '';
  const ref = App.calendarRefDate;

  if (App.calendarMode === 'mes') {
    $('#calLabel').textContent = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    WEEKDAYS.forEach(wd => grid.appendChild(el(`<div class="cal-weekday-label">${wd.short}</div>`)));

    const firstOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth); gridStart.setDate(gridStart.getDate() - startOffset);

    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart); d.setDate(d.getDate() + i);
      grid.appendChild(buildCalDay(d, d.getMonth() !== ref.getMonth()));
    }
  } else if (App.calendarMode === 'semana') {
    const start = new Date(ref); start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(end.getDate() + 6);
    $('#calLabel').textContent = `${fmtDateBR(Scheduler.dateToISO(start))} – ${fmtDateBR(Scheduler.dateToISO(end))}`;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      grid.appendChild(buildCalDay(d, false, true));
    }
  } else {
    $('#calLabel').textContent = fmtDateLong(Scheduler.dateToISO(ref));
    grid.appendChild(buildCalDay(ref, false, true));
  }
}

function buildCalDay(date, isOtherMonth, showTasks = false) {
  const iso = Scheduler.dateToISO(date);
  const isToday = iso === todayISO();
  const dayTasks = App.tasks.filter(t => t.date === iso);
  const day = el(`<div class="cal-day ${isToday ? 'is-today' : ''} ${isOtherMonth ? 'is-other-month' : ''}">
    <span class="cal-day__num">${date.getDate()}</span>
    <div class="cal-day__dots"></div>
  </div>`);

  const dotsWrap = $('.cal-day__dots', day);
  if (showTasks) {
    dayTasks.sort((a,b) => a.startTime.localeCompare(b.startTime)).forEach(t => {
      const row = el(`<div class="task-card" data-status="${effectiveStatus(t)}" style="margin-bottom:6px;">
        <div class="task-card__time">${t.startTime}</div>
        <div class="task-card__body">
          <div class="task-card__title">${escapeHtml(t.topic || t.subject)}</div>
          <div class="task-card__meta"><span class="badge badge--${effectiveStatus(t).replace(' ','-')}">${effectiveStatus(t)}</span></div>
        </div>
      </div>`);
      row.addEventListener('click', (e) => { e.stopPropagation(); openTaskModal(t.id); });
      dotsWrap.appendChild(row);
    });
    dotsWrap.style.flexDirection = 'column';
  } else {
    dayTasks.slice(0, 6).forEach(t => {
      dotsWrap.appendChild(el(`<span class="cal-dot" style="background:${dotColorForTask(t)}"></span>`));
    });
    if (dayTasks.length > 6) day.appendChild(el(`<span class="cal-day__more">+${dayTasks.length - 6}</span>`));
    day.addEventListener('click', () => openDayModal(iso));
  }
  return day;
}

function openDayModal(iso) {
  const dayTasks = App.tasks.filter(t => t.date === iso).sort((a,b) => a.startTime.localeCompare(b.startTime));
  const body = $('#taskModalBody');
  $('#taskModalTitle').textContent = fmtDateLong(iso);
  body.innerHTML = '';
  if (!dayTasks.length) {
    body.appendChild(el(`<p style="color:var(--text-muted)">Nenhum estudo agendado para este dia.</p>`));
  } else {
    const list = el(`<div class="task-list task-list--full"></div>`);
    dayTasks.forEach(t => list.appendChild(renderTaskCard(t)));
    body.appendChild(list);
  }
  showModal('#taskModalOverlay');
}

function wireCalendarEvents() {
  $('#calPrev').addEventListener('click', () => shiftCalendar(-1));
  $('#calNext').addEventListener('click', () => shiftCalendar(1));
  $all('#calModeSeg .seg__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      App.calendarMode = btn.dataset.mode;
      $all('#calModeSeg .seg__btn').forEach(b => b.classList.toggle('is-active', b === btn));
      renderCalendar();
    });
  });
}

function shiftCalendar(dir) {
  const ref = App.calendarRefDate;
  if (App.calendarMode === 'mes') ref.setMonth(ref.getMonth() + dir);
  else if (App.calendarMode === 'semana') ref.setDate(ref.getDate() + dir * 7);
  else ref.setDate(ref.getDate() + dir);
  renderCalendar();
}

/* ======================= 7. CONTEÚDOS ======================= */

function renderAreaTabs() {
  const tabs = $('#areaTabs');
  if (tabs.children.length) return;
  tabs.innerHTML = '';
  const allBtn = el(`<button class="tabs__btn is-active" data-area="todas">Todas as áreas</button>`);
  tabs.appendChild(allBtn);
  Object.values(ENEM_AREAS).forEach(area => {
    tabs.appendChild(el(`<button class="tabs__btn" data-area="${area.id}">${area.short}</button>`));
  });
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tabs__btn'); if (!btn) return;
    App.contentAreaFilter = btn.dataset.area;
    $all('.tabs__btn', tabs).forEach(b => b.classList.toggle('is-active', b === btn));
    renderContentList();
  });
}

function populateContentFilters() {
  const statusSel = $('#contentFilterStatus');
  if (statusSel.options.length <= 1) {
    Object.values(CONTENT_STATUS).forEach(s => statusSel.appendChild(el(`<option value="${s}">${s}</option>`)));
  }
}

function renderConteudos() {
  renderAreaTabs();
  populateContentFilters();
  renderContentList();
}

function renderContentList() {
  const search = $('#contentSearch').value.trim().toLowerCase();
  const statusFilter = $('#contentFilterStatus').value;
  const diffFilter = $('#contentFilterDifficulty').value;

  const all = getAllTopicsFlat().filter(t => App.contentAreaFilter === 'todas' || t.areaId === App.contentAreaFilter);
  const filtered = all.filter(t => {
    const entry = getContentStatusEntry(t.topicId);
    if (search && !t.topicName.toLowerCase().includes(search) && !t.subjectName.toLowerCase().includes(search)) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    if (diffFilter && entry.difficulty !== diffFilter) return false;
    return true;
  });

  const grid = $('#contentList'); grid.innerHTML = '';
  if (!filtered.length) {
    grid.appendChild(el(`<p style="color:var(--text-muted)">Nenhum conteúdo encontrado.</p>`));
    return;
  }

  filtered.forEach(t => {
    const entry = getContentStatusEntry(t.topicId);
    const pct = { [CONTENT_STATUS.NAO_INICIADO]: 0, [CONTENT_STATUS.ESTUDANDO]: 40,
      [CONTENT_STATUS.PRECISA_REVISAR]: 60, [CONTENT_STATUS.REVISADO]: 80, [CONTENT_STATUS.DOMINADO]: 100 }[entry.status];

    const card = el(`
      <div class="content-card">
        <div class="content-card__top">
          <div>
            <div class="content-card__title">${escapeHtml(t.topicName)}</div>
            <div class="content-card__sub">${escapeHtml(t.subjectName)} · ${escapeHtml(t.areaName)}</div>
          </div>
        </div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%;background:${t.color}"></div></div>
        <div class="content-card__row">
          <select class="input status-select">
            ${Object.values(CONTENT_STATUS).map(s => `<option value="${s}" ${s===entry.status?'selected':''}>${s}</option>`).join('')}
          </select>
          <select class="input diff-select">
            <option value="facil" ${entry.difficulty==='facil'?'selected':''}>Fácil</option>
            <option value="medio" ${entry.difficulty==='medio'?'selected':''}>Médio</option>
            <option value="dificil" ${entry.difficulty==='dificil'?'selected':''}>Difícil</option>
          </select>
        </div>
        <div class="content-card__row">
          <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--text-secondary);flex:1">
            Questões resolvidas
            <input type="number" min="0" class="input questions-input" value="${entry.questionsSolved || 0}" style="width:64px;padding:4px 6px;">
          </label>
        </div>
        <textarea class="input notes-input" rows="2" placeholder="Observações...">${escapeHtml(entry.notes || '')}</textarea>
      </div>
    `);

    $('.status-select', card).addEventListener('change', (e) => setContentStatusEntry(t.topicId, { status: e.target.value }));
    $('.diff-select', card).addEventListener('change', (e) => setContentStatusEntry(t.topicId, { difficulty: e.target.value }));
    $('.questions-input', card).addEventListener('change', (e) => setContentStatusEntry(t.topicId, { questionsSolved: Number(e.target.value) || 0 }));
    $('.notes-input', card).addEventListener('change', (e) => setContentStatusEntry(t.topicId, { notes: e.target.value }));

    grid.appendChild(card);
  });
}

function wireConteudosEvents() {
  $('#contentSearch').addEventListener('input', renderContentList);
  $('#contentFilterStatus').addEventListener('change', renderContentList);
  $('#contentFilterDifficulty').addEventListener('change', renderContentList);
}

/* ======================= 8. REDAÇÃO ======================= */

function competencyTotal(r) {
  return ['c1','c2','c3','c4','c5'].reduce((a,k) => a + (Number(r.notas?.[k]) || 0), 0);
}

function renderRedacao() {
  const list = $('#redacaoList'); list.innerHTML = '';
  const sorted = [...App.redacoes].sort((a,b) => b.date.localeCompare(a.date));

  $('#redCount').textContent = App.redacoes.length;
  $('#redCorrigidas').textContent = App.redacoes.filter(r => r.corrigida).length;
  const corrigidas = App.redacoes.filter(r => r.corrigida);
  const media = corrigidas.length ? Math.round(corrigidas.reduce((a,r) => a + competencyTotal(r), 0) / corrigidas.length) : null;
  $('#redMedia').textContent = media !== null ? media : '–';

  if (!sorted.length) {
    list.appendChild(el(`<p style="color:var(--text-muted)">Nenhuma redação registrada ainda.</p>`));
  } else {
    sorted.forEach(r => {
      const card = el(`
        <div class="task-card" data-status="${r.corrigida ? 'Concluído' : 'Pendente'}">
          <div class="task-card__time">${fmtDateBR(r.date)}</div>
          <div class="task-card__body">
            <div class="task-card__title">${escapeHtml(r.tema || 'Sem tema definido')}</div>
            <div class="task-card__meta">
              <span class="badge badge--${r.corrigida ? 'Concluído' : 'Pendente'}">${r.corrigida ? 'Corrigida' : 'Aguardando correção'}</span>
              ${r.corrigida ? `<span>Nota: ${competencyTotal(r)}/1000</span>` : ''}
            </div>
          </div>
          <div class="task-card__actions">
            <button class="icon-btn" title="Excluir">🗑</button>
          </div>
        </div>`);
      $('.icon-btn', card).addEventListener('click', () => {
        confirmAction('Excluir redação?', 'Esta ação não pode ser desfeita.', () => {
          App.redacoes = App.redacoes.filter(x => x.id !== r.id);
          saveRedacoes(); renderRedacao();
        });
      });
      list.appendChild(card);
    });
  }

  const chartData = sorted.filter(r => r.corrigida).sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
  Charts.lineChart($('#redacaoChart'), {
    labels: chartData.map(r => fmtDateBR(r.date).slice(0,5)),
    values: chartData.map(r => competencyTotal(r)),
    color: '--purple'
  });
}

function openNovaRedacaoModal() {
  const body = `
    <form class="qform" id="redacaoForm">
      <label class="field"><span>Data</span><input type="date" id="rTemaData" class="input" value="${todayISO()}" required></label>
      <label class="field"><span>Tema</span><input type="text" id="rTema" class="input" placeholder="Ex: Desafios da educação digital no Brasil" required></label>
      <label class="field"><span>Observações</span><textarea id="rObs" class="input" rows="2"></textarea></label>
      <label class="field" style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="rCorrigida" style="width:auto;"> <span>Já corrigida</span></label>
      <div id="rCompetencias" class="qform-row" hidden>
        ${[1,2,3,4,5].map(n => `<label class="field"><span>Competência ${n} (0-200)</span><input type="number" id="rC${n}" class="input" min="0" max="200" step="20" value="0"></label>`).join('')}
      </div>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" id="rCancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar redação</button>
      </div>
    </form>`;
  openGenericModal('Nova redação', body);

  $('#rCorrigida').addEventListener('change', (e) => $('#rCompetencias').hidden = !e.target.checked);
  $('#rCancel').addEventListener('click', closeAllModals);
  $('#redacaoForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const corrigida = $('#rCorrigida').checked;
    App.redacoes.push({
      id: Scheduler.uid(),
      date: $('#rTemaData').value,
      tema: $('#rTema').value.trim(),
      observacoes: $('#rObs').value.trim(),
      corrigida,
      notas: corrigida ? { c1:+$('#rC1').value, c2:+$('#rC2').value, c3:+$('#rC3').value, c4:+$('#rC4').value, c5:+$('#rC5').value } : {}
    });
    saveRedacoes();
    closeAllModals();
    toast('Redação registrada!');
    renderRedacao();
  });
}

/* ======================= 9. REVISÕES E SIMULADOS ======================= */

function renderRevisoes() {
  const simList = $('#simuladoList'); simList.innerHTML = '';
  const sortedSim = [...App.simulados].sort((a,b) => b.date.localeCompare(a.date));
  if (!sortedSim.length) {
    simList.appendChild(el(`<p style="color:var(--text-muted)">Nenhum simulado registrado ainda.</p>`));
  } else {
    sortedSim.forEach(s => {
      const totalAcertos = Object.values(s.areas).reduce((a,v) => a + v.acertos, 0);
      const totalQuestoes = Object.values(s.areas).reduce((a,v) => a + v.total, 0);
      const card = el(`
        <div class="task-card" data-status="Concluído">
          <div class="task-card__time">${fmtDateBR(s.date)}</div>
          <div class="task-card__body">
            <div class="task-card__title">Simulado — ${totalAcertos}/${totalQuestoes} acertos (${Math.round(totalAcertos/totalQuestoes*100)}%)</div>
            <div class="task-card__meta"><span>Tempo: ${minutesToHuman(s.tempoGasto || 0)}</span></div>
          </div>
          <div class="task-card__actions"><button class="icon-btn" title="Excluir">🗑</button></div>
        </div>`);
      $('.icon-btn', card).addEventListener('click', () => {
        confirmAction('Excluir simulado?', '', () => { App.simulados = App.simulados.filter(x => x.id !== s.id); saveSimulados(); renderRevisoes(); });
      });
      simList.appendChild(card);
    });
  }

  const revList = $('#revisaoList'); revList.innerHTML = '';
  const sortedRev = [...App.revisoes].sort((a,b) => a.date.localeCompare(b.date));
  if (!sortedRev.length) {
    revList.appendChild(el(`<p style="color:var(--text-muted)">Nenhuma revisão avulsa agendada.</p>`));
  } else {
    sortedRev.forEach(r => {
      const card = el(`
        <div class="task-card" data-status="Pendente">
          <div class="task-card__time">${fmtDateBR(r.date)}</div>
          <div class="task-card__body">
            <div class="task-card__title">${escapeHtml(r.descricao)}</div>
            <div class="task-card__meta"><span>${r.tipo}</span></div>
          </div>
          <div class="task-card__actions"><button class="icon-btn" title="Excluir">🗑</button></div>
        </div>`);
      $('.icon-btn', card).addEventListener('click', () => {
        confirmAction('Excluir revisão?', '', () => { App.revisoes = App.revisoes.filter(x => x.id !== r.id); saveRevisoes(); renderRevisoes(); });
      });
      revList.appendChild(card);
    });
  }

  const last = sortedSim[0];
  if (last) {
    const areaNames = Object.keys(last.areas);
    Charts.barChart($('#simuladoChart'), {
      labels: areaNames.map(a => AREA_LABELS[a] || a),
      values: areaNames.map(a => Math.round(last.areas[a].acertos / last.areas[a].total * 100)),
      colors: areaNames.map(a => ENEM_AREAS[a]?.color || '--accent'),
      maxValue: 100, suffix: '%'
    });
  } else {
    Charts.barChart($('#simuladoChart'), { labels: [], values: [] });
  }

  const evol = [...App.simulados].sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
  Charts.lineChart($('#simuladoEvolChart'), {
    labels: evol.map(s => fmtDateBR(s.date).slice(0,5)),
    values: evol.map(s => {
      const acertos = Object.values(s.areas).reduce((a,v) => a + v.acertos, 0);
      const total = Object.values(s.areas).reduce((a,v) => a + v.total, 0);
      return total ? Math.round(acertos/total*100) : 0;
    }),
    color: '--accent'
  });
}

const AREA_LABELS = { linguagens: 'Linguagens', matematica: 'Matemática', natureza: 'C. Natureza', humanas: 'C. Humanas' };

function openNovoSimuladoModal() {
  const body = `
    <form class="qform" id="simForm">
      <label class="field"><span>Data</span><input type="date" id="sData" class="input" value="${todayISO()}" required></label>
      <label class="field"><span>Tempo gasto (minutos)</span><input type="number" id="sTempo" class="input" min="0" value="180"></label>
      ${Object.entries(AREA_LABELS).map(([id, label]) => `
        <div class="qform-row">
          <label class="field"><span>${label} — acertos</span><input type="number" id="sAc_${id}" class="input" min="0" value="0"></label>
          <label class="field"><span>${label} — total questões</span><input type="number" id="sTo_${id}" class="input" min="0" value="45"></label>
        </div>`).join('')}
      <label class="field"><span>Observações</span><textarea id="sObs" class="input" rows="2"></textarea></label>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" id="sCancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar simulado</button>
      </div>
    </form>`;
  openGenericModal('Registrar simulado', body);
  $('#sCancel').addEventListener('click', closeAllModals);
  $('#simForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const areas = {};
    Object.keys(AREA_LABELS).forEach(id => {
      areas[id] = { acertos: +$(`#sAc_${id}`).value || 0, total: +$(`#sTo_${id}`).value || 0 };
    });
    App.simulados.push({ id: Scheduler.uid(), date: $('#sData').value, tempoGasto: +$('#sTempo').value || 0, areas, observacoes: $('#sObs').value.trim() });
    saveSimulados(); closeAllModals(); toast('Simulado registrado!'); renderRevisoes();
  });
}

function openNovaRevisaoModal() {
  const body = `
    <form class="qform" id="revForm">
      <label class="field"><span>Data</span><input type="date" id="revData" class="input" value="${todayISO()}" required></label>
      <label class="field"><span>Tipo</span>
        <select id="revTipo" class="input">
          <option>Revisão semanal</option><option>Revisão mensal</option><option>Revisão de conteúdos errados</option>
        </select>
      </label>
      <label class="field"><span>Descrição</span><input type="text" id="revDesc" class="input" placeholder="Ex: Revisar funções e geometria" required></label>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" id="revCancel">Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar revisão</button>
      </div>
    </form>`;
  openGenericModal('Nova revisão', body);
  $('#revCancel').addEventListener('click', closeAllModals);
  $('#revForm').addEventListener('submit', (e) => {
    e.preventDefault();
    App.revisoes.push({ id: Scheduler.uid(), date: $('#revData').value, tipo: $('#revTipo').value, descricao: $('#revDesc').value.trim() });
    saveRevisoes(); closeAllModals(); toast('Revisão agendada!'); renderRevisoes();
  });
}

/* ======================= 10. RELATÓRIOS ======================= */

function renderRelatorios() {
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = Scheduler.dateToISO(d);
    const minutes = App.history.filter(h => h.date === iso).reduce((a,h) => a + h.minutes, 0);
    last7.push({ label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), hours: +(minutes/60).toFixed(1) });
  }
  Charts.barChart($('#repHorasChart'), { labels: last7.map(x => x.label), values: last7.map(x => x.hours), suffix: 'h' });

  const areaProgress = computeAreaProgress();
  const areaEntries = Object.values(areaProgress);
  Charts.barChart($('#repAreaChart'), {
    labels: areaEntries.map(a => a.name),
    values: areaEntries.map(a => a.total ? Math.round(a.done/a.total*100) : 0),
    colors: areaEntries.map(a => a.color), maxValue: 100, suffix: '%'
  });

  const relevant = App.tasks.filter(t => t.activityType !== 'Descanso');
  $('#repConcluidos').textContent = relevant.filter(t => t.status === 'Concluído').length;
  $('#repPendentes').textContent = relevant.filter(t => effectiveStatus(t) === 'Pendente').length;
  $('#repAtrasados').textContent = relevant.filter(t => effectiveStatus(t) === 'Atrasado').length;

  Charts.donutChart($('#repDonut'), { value: computeOverallProgress(), max: 100, color: '--success', label: 'do plano' });

  const evolSim = [...App.simulados].sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
  Charts.lineChart($('#repSimuladoChart'), {
    labels: evolSim.map(s => fmtDateBR(s.date).slice(0,5)),
    values: evolSim.map(s => {
      const ac = Object.values(s.areas).reduce((a,v)=>a+v.acertos,0), to = Object.values(s.areas).reduce((a,v)=>a+v.total,0);
      return to ? Math.round(ac/to*100) : 0;
    }), color: '--orange'
  });

  const evolRed = [...App.redacoes].filter(r => r.corrigida).sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
  Charts.lineChart($('#repRedacaoChart'), {
    labels: evolRed.map(r => fmtDateBR(r.date).slice(0,5)),
    values: evolRed.map(r => competencyTotal(r)), color: '--purple'
  });
}

/* ======================= 11. CONFIGURAÇÕES ======================= */

function renderConfiguracoes() {
  fillConfigForm('cfg', App.config);
}

function wireConfiguracoesEvents() {
  wireDurationToggle('cfg');

  $('#configForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cfg = readConfigForm('cfg');
    const errors = validateConfigForm(cfg, 'cfg');
    if (errors.length) { if (errors.includes('duracao')) toast('Seu planejamento precisa ter no mínimo 1 hora de estudo por dia.'); return; }

    const applyChanges = () => {
      App.config = cfg; saveConfig();
      generateOrRegenerateSchedule(cfg, { preservePast: true });
      toast('Plano de estudos atualizado!');
      goToView('dashboard');
    };

    if (App.tasks.length) {
      confirmAction('Regerar plano de estudos?',
        'As tarefas futuras serão recalculadas com as novas configurações. O histórico de estudos já realizados será mantido.',
        applyChanges);
    } else {
      applyChanges();
    }
  });

  $('#btnExport').addEventListener('click', () => {
    const dump = Storage.exportAll();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `agendado-abner-backup-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Backup exportado.');
  });

  $('#btnImport').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dump = JSON.parse(reader.result);
        Storage.importAll(dump);
        toast('Dados importados. Recarregando...');
        setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        toast('Arquivo inválido. Verifique o backup exportado.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#btnClearAll').addEventListener('click', () => {
    confirmAction('Apagar todos os dados?', 'Isso removerá seu plano, agenda, redações, simulados e histórico. Esta ação não pode ser desfeita.', () => {
      Storage.clearAll();
      toast('Dados apagados. Recarregando...');
      setTimeout(() => window.location.reload(), 900);
    });
  });
}

/* ======================= 12. CRONÔMETRO DE ESTUDO ======================= */

const Timer = {
  interval: null,

  get() { return Storage.get(STORAGE_KEYS.TIMER, null); },
  set(state) { Storage.set(STORAGE_KEYS.TIMER, state); },
  clear() { Storage.remove(STORAGE_KEYS.TIMER); },

  elapsedMs(state) {
    if (!state) return 0;
    return state.accumulatedMs + (state.running ? Date.now() - state.startedAt : 0);
  },

  start(taskId) {
    const existing = this.get();
    if (existing && existing.taskId !== taskId) {
      // Finaliza automaticamente a sessão anterior antes de iniciar uma nova
      this.finish(existing.taskId, true);
    }
    const current = this.get();
    if (current && current.taskId === taskId) {
      if (!current.running) { current.running = true; current.startedAt = Date.now(); this.set(current); }
      return current;
    }
    const state = { taskId, startedAt: Date.now(), accumulatedMs: 0, running: true };
    this.set(state);
    return state;
  },

  pause() {
    const state = this.get(); if (!state || !state.running) return;
    state.accumulatedMs += Date.now() - state.startedAt;
    state.running = false;
    this.set(state);
  },

  resume() {
    const state = this.get(); if (!state || state.running) return;
    state.running = true; state.startedAt = Date.now();
    this.set(state);
  },

  reset() {
    const state = this.get(); if (!state) return;
    state.accumulatedMs = 0; state.startedAt = Date.now();
    this.set(state);
  },

  finish(taskId, silent = false) {
    const state = this.get();
    if (!state || state.taskId !== taskId) return;
    const totalMs = this.elapsedMs(state);
    const minutes = Math.max(1, Math.round(totalMs / 60000));
    markTaskDone(taskId, minutes);
    this.clear();
    if (!silent) toast(`Sessão registrada: ${minutesToHuman(minutes)} estudados.`);
  }
};

function formatHMS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function openTimerModal(taskId) {
  const task = App.tasks.find(t => t.id === taskId);
  if (!task) return;
  const state = Timer.start(taskId);
  $('#timerTaskTitle').textContent = task.topic || task.subject;
  $('#timerTaskSubtitle').textContent = `${task.area} · ${task.activityType} · previsto: ${minutesToHuman(task.durationMinutes)}`;
  updateTimerDisplay();

  clearInterval(Timer.interval);
  Timer.interval = setInterval(updateTimerDisplay, 1000);

  const pauseBtn = $('#timerPauseBtn');
  pauseBtn.textContent = state.running ? '⏸ Pausar' : '▶ Continuar';

  showModal('#timerModalOverlay');
  if (task.status === 'Pendente') { task.status = 'Em andamento'; saveTasks(); }
}

function updateTimerDisplay() {
  const state = Timer.get();
  if (!state) { $('#timerDisplay').textContent = '00:00:00'; return; }
  $('#timerDisplay').textContent = formatHMS(Timer.elapsedMs(state));
}

function wireTimerEvents() {
  $('#timerPauseBtn').addEventListener('click', () => {
    const state = Timer.get(); if (!state) return;
    if (state.running) { Timer.pause(); $('#timerPauseBtn').textContent = '▶ Continuar'; }
    else { Timer.resume(); $('#timerPauseBtn').textContent = '⏸ Pausar'; }
    updateTimerDisplay();
  });
  $('#timerResetBtn').addEventListener('click', () => { Timer.reset(); updateTimerDisplay(); });
  $('#timerFinishBtn').addEventListener('click', () => {
    const state = Timer.get(); if (!state) return;
    clearInterval(Timer.interval);
    Timer.finish(state.taskId);
    closeAllModals();
    renderCurrentView();
  });
  $('#timerCloseBtn').addEventListener('click', () => { clearInterval(Timer.interval); closeAllModals(); });
}

/* ======================= 13. MODAIS UTILITÁRIOS ======================= */

function showModal(selector) { $(selector).hidden = false; }
function closeAllModals() { $all('.modal-overlay').forEach(m => m.hidden = true); }

function openGenericModal(title, bodyHtml) {
  $('#genericModalTitle').textContent = title;
  $('#genericModalBody').innerHTML = bodyHtml;
  showModal('#genericModalOverlay');
}

function confirmAction(title, text, onConfirm) {
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  showModal('#confirmModalOverlay');
  const okBtn = $('#confirmOkBtn');
  const cancelBtn = $('#confirmCancelBtn');
  const cleanup = () => { okBtn.replaceWith(okBtn.cloneNode(true)); cancelBtn.replaceWith(cancelBtn.cloneNode(true)); };
  cleanup();
  $('#confirmOkBtn').addEventListener('click', () => { closeAllModals(); onConfirm(); });
  $('#confirmCancelBtn').addEventListener('click', closeAllModals);
}

function openTaskModal(taskId) {
  const task = App.tasks.find(t => t.id === taskId);
  if (!task) return;
  const status = effectiveStatus(task);
  $('#taskModalTitle').textContent = task.topic || task.subject;
  $('#taskModalBody').innerHTML = `
    <div class="qform">
      <p style="color:var(--text-secondary);font-size:13.5px;">
        ${fmtDateLong(task.date)} · ${task.startTime} – ${task.endTime} · ${escapeHtml(task.area)} · ${escapeHtml(task.activityType)}
      </p>
      <span class="badge badge--${status.replace(' ','-')}" style="width:fit-content;">${status}</span>
      <label class="field"><span>Observações</span><textarea id="taskNotes" class="input" rows="3">${escapeHtml(task.notes || '')}</textarea></label>
      <label class="field"><span>Reagendar para</span><input type="date" id="taskReschedule" class="input" value="${task.date}"></label>
      <div class="modal__actions" style="flex-wrap:wrap;">
        <button class="btn btn--ghost btn--sm" id="taskSaveNotes">💾 Salvar observação</button>
        <button class="btn btn--ghost btn--sm" id="taskRescheduleBtn">📅 Reagendar</button>
        ${status !== 'Concluído' ? `<button class="btn btn--ghost btn--sm" id="taskStartBtn">▶ Iniciar estudo</button>
        <button class="btn btn--primary btn--sm" id="taskDoneBtn">✔ Concluir</button>` : ''}
        <button class="btn btn--danger btn--sm" id="taskDeleteBtn">🗑 Excluir</button>
      </div>
    </div>`;

  $('#taskSaveNotes').addEventListener('click', () => {
    task.notes = $('#taskNotes').value; saveTasks(); toast('Observação salva.');
  });
  $('#taskRescheduleBtn').addEventListener('click', () => {
    const newDate = $('#taskReschedule').value;
    if (!newDate) return;
    task.date = newDate; task.status = 'Reagendado'; saveTasks();
    toast('Estudo reagendado.'); closeAllModals(); renderCurrentView();
  });
  if (status !== 'Concluído') {
    $('#taskStartBtn').addEventListener('click', () => { closeAllModals(); openTimerModal(task.id); });
    $('#taskDoneBtn').addEventListener('click', () => { markTaskDone(task.id); closeAllModals(); });
  }
  $('#taskDeleteBtn').addEventListener('click', () => {
    confirmAction('Excluir este estudo?', 'Esta ação não pode ser desfeita.', () => {
      App.tasks = App.tasks.filter(t => t.id !== task.id); saveTasks();
      closeAllModals(); renderCurrentView(); toast('Estudo excluído.');
    });
  });

  showModal('#taskModalOverlay');
}

function wireGlobalModalEvents() {
  $all('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.hidden = true; });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });
}

/* ======================= 14. INICIALIZAÇÃO ======================= */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  $('#theme-label').textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  Storage.set(STORAGE_KEYS.THEME, theme);
}

function wireNavigation() {
  $all('.nav-item[data-view]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.view === 'mais') return;
    closeAllModals();
    goToView(btn.dataset.view);
  }));
  $all('.bottom-nav__item').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.view === 'mais') { showModal('#maisModalOverlay'); return; }
    goToView(btn.dataset.view);
  }));
  $('#btnFecharMais').addEventListener('click', closeAllModals);
  $('#btn-open-menu').addEventListener('click', openSidebar);
  $('#sidebarOverlay').addEventListener('click', closeSidebar);
  $('#btn-theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
  $('#btn-start-today').addEventListener('click', () => {
    const today = todayISO();
    const next = App.tasks.find(t => t.date === today && t.status !== 'Concluído');
    if (next) openTimerModal(next.id);
    else { goToView('agenda'); toast('Nenhum estudo pendente para hoje.'); }
  });
}

function runOnboardingIfNeeded() {
  if (App.config) return false;
  const cfg = defaultConfig();
  const mount = $('#setupFormMount');
  mount.innerHTML = `
    <form id="setupForm" class="form-grid">
      <label class="field field--full"><span>Nome do estudante</span><input type="text" id="setupNome" class="input" required></label>
      <label class="field"><span>Data de início dos estudos</span><input type="date" id="setupInicio" class="input" required></label>
      <label class="field"><span>Data da prova do ENEM</span><input type="date" id="setupProva" class="input" required></label>
      <label class="field"><span>Horário preferencial</span><input type="time" id="setupHorario" class="input" required></label>
      <label class="field">
        <span>Duração diária de estudo</span>
        <select id="setupDuracao" class="input">
          <option value="60">1 hora</option><option value="90">1 hora e 30 minutos</option>
          <option value="120" selected>2 horas</option><option value="180">3 horas</option>
          <option value="custom">Personalizado</option>
        </select>
      </label>
      <label class="field" id="setupDuracaoCustomWrap" hidden><span>Minutos (mín. 60)</span><input type="number" id="setupDuracaoCustom" class="input" min="60" step="5" value="60"></label>
      <p class="field-error" id="setupDuracaoError" hidden>Seu planejamento precisa ter no mínimo 1 hora de estudo por dia.</p>
      <label class="field"><span>Matérias por dia</span>
        <select id="setupSubjectsPerDay" class="input"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select>
      </label>
      <label class="field"><span>Pausa entre matérias (min)</span><input type="number" id="setupPausa" class="input" min="0" step="5" value="10"></label>
      <fieldset class="field field--full"><legend>Dias disponíveis para estudar</legend><div class="weekday-picker" id="setupWeekdays"></div></fieldset>
      <label class="field"><span>Dia de revisão</span><select id="setupRevisionDay" class="input"></select></label>
      <label class="field"><span>Dia de simulado</span><select id="setupSimuladoDay" class="input"></select></label>
      <div class="field field--full form-actions">
        <button type="submit" class="btn btn--primary btn--block">Gerar minha agenda de estudos</button>
      </div>
    </form>`;

  fillConfigForm('setup', cfg);
  wireDurationToggle('setup');
  $('#setupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newCfg = readConfigForm('setup');
    const errors = validateConfigForm(newCfg, 'setup');
    if (errors.length) return;
    App.config = newCfg; saveConfig();
    generateOrRegenerateSchedule(newCfg, { preservePast: false });
    Storage.set(STORAGE_KEYS.ONBOARDED, true);
    $('#setupModalOverlay').hidden = true;
    toast('Sua agenda foi gerada! Bons estudos, ' + newCfg.studentName + '! 🎯');
    goToView('dashboard');
  });

  $('#setupModalOverlay').hidden = false;
  return true;
}

function loadState() {
  App.config = Storage.get(STORAGE_KEYS.CONFIG, null);
  App.tasks = Storage.get(STORAGE_KEYS.TASKS, []);
  App.contentStatus = Storage.get(STORAGE_KEYS.CONTENT_STATUS, {});
  App.redacoes = Storage.get(STORAGE_KEYS.REDACOES, []);
  App.simulados = Storage.get(STORAGE_KEYS.SIMULADOS, []);
  App.revisoes = Storage.get(STORAGE_KEYS.REVISOES, []);
  App.history = Storage.get(STORAGE_KEYS.HISTORY, []);
}

function init() {
  loadState();
  applyTheme(Storage.get(STORAGE_KEYS.THEME, 'light'));

  wireNavigation();
  wireAgendaEvents();
  wireCalendarEvents();
  wireConteudosEvents();
  wireConfiguracoesEvents();
  wireTimerEvents();
  wireGlobalModalEvents();

  $('#btnNovaRedacao').addEventListener('click', openNovaRedacaoModal);
  $('#btnNovoSimulado').addEventListener('click', openNovoSimuladoModal);
  $('#btnNovaRevisao').addEventListener('click', openNovaRevisaoModal);

  const needsOnboarding = runOnboardingIfNeeded();
  goToView('dashboard');
  if (!needsOnboarding) renderDashboard();

  // Recalcula a tela ativa a cada minuto (mantém "hoje", atrasos etc. em dia)
  setInterval(() => renderCurrentView(), 60000);
}

document.addEventListener('DOMContentLoaded', init);
