/**
 * scheduler.js — Geração automática do plano de estudos
 * ------------------------------------------------------------
 * Recebe a configuração definida pelo usuário (datas, dias da
 * semana, duração diária, dia de revisão/simulado etc.) e a lista
 * de conteúdos do ENEM, e devolve uma lista de tarefas (agenda)
 * distribuídas do dia de início até a data da prova.
 *
 * Este arquivo não lê nem grava em localStorage: recebe dados e
 * devolve dados, o que facilita testes e futura substituição por
 * um agendamento feito no backend.
 * ------------------------------------------------------------
 */

const Scheduler = (() => {

  function pad(n) { return String(n).padStart(2, '0'); }

  function toDateOnly(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addMinutes(timeStr, minutes) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const hh = Math.floor((total % (24 * 60)) / 60);
    const mm = total % 60;
    return `${pad(hh)}:${pad(mm)}`;
  }

  function dateToISO(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function isoToDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  /**
   * Divide `totalMinutes` entre `parts` blocos, respeitando um mínimo,
   * e arredondando para múltiplos de 5 minutos para ficar "redondo".
   */
  function splitMinutes(totalMinutes, parts) {
    if (parts <= 1) return [totalMinutes];
    const base = Math.floor(totalMinutes / parts / 5) * 5;
    const arr = new Array(parts).fill(Math.max(base, 5));
    let used = arr.reduce((a, b) => a + b, 0);
    let rest = totalMinutes - used;
    let i = 0;
    while (rest >= 5) {
      arr[i % parts] += 5;
      rest -= 5;
      i++;
    }
    return arr;
  }

  function pickActivityType(index, isFirstPassOfTopic) {
    const rotation = ['Aula', 'Exercícios', 'Leitura', 'Resumo'];
    return isFirstPassOfTopic ? 'Aula' : rotation[index % rotation.length];
  }

  /**
   * Gera a agenda completa.
   * @param {Object} config - configuração do plano (ver Config em app.js)
   * @param {Array} topicQueue - fila de tópicos intercalados (data.js: getInterleavedTopics())
   * @param {Array} priorityTopicIds - ids de tópicos marcados como "difíceis" (reforço)
   * @returns {Array} lista de tarefas
   */
  function generateSchedule(config, topicQueue, priorityTopicIds = []) {
    const tasks = [];
    const start = toDateOnly(isoToDate(config.startDate));
    const exam = toDateOnly(isoToDate(config.examDate));
    if (exam < start) return tasks;

    // Fila de tópicos: prioriza os marcados como difíceis, sem duplicar
    const prioritySet = new Set(priorityTopicIds);
    const queue = [
      ...topicQueue.filter(t => prioritySet.has(t.topicId)),
      ...topicQueue.filter(t => !prioritySet.has(t.topicId))
    ];
    let cursor = 0;
    const topicPassCount = {}; // quantas vezes um tópico já apareceu (aula/exercício/revisão...)

    const studyDays = new Set(config.studyDays); // 0=domingo ... 6=sábado
    const dailyMinutes = Math.max(60, config.dailyMinutes || 60);
    const subjectsPerDay = Math.max(1, config.subjectsPerDay || 2);
    const breakMinutes = Math.max(0, config.breakMinutes || 0);

    // Percorre cada dia do intervalo
    let d = new Date(start);
    let weekCounter = 0;
    let redacaoDoneThisWeek = false;

    while (d <= exam) {
      const weekday = d.getDay();
      const iso = dateToISO(d);

      if (weekday === 0) { weekCounter++; redacaoDoneThisWeek = false; }

      if (studyDays.has(weekday)) {
        const isRevisionDay = config.revisionDay !== null && config.revisionDay !== undefined &&
          Number(config.revisionDay) === weekday;
        const isSimuladoDay = config.simuladoDay !== null && config.simuladoDay !== undefined &&
          Number(config.simuladoDay) === weekday;

        let startTime = config.preferredStartTime || '08:00';

        if (isSimuladoDay) {
          tasks.push({
            id: uid(), date: iso, startTime,
            endTime: addMinutes(startTime, dailyMinutes),
            area: 'Geral', areaId: 'geral', subject: 'Simulado ENEM',
            topic: 'Simulado geral (4 áreas)', topicId: null,
            activityType: 'Simulado', durationMinutes: dailyMinutes,
            status: 'Pendente', notes: '', difficulty: null
          });
        } else if (isRevisionDay) {
          // Revisão dos últimos tópicos estudados na semana
          const reviewCount = Math.min(subjectsPerDay, 3);
          const blocks = splitMinutes(dailyMinutes, reviewCount);
          let t = startTime;
          for (let i = 0; i < reviewCount; i++) {
            const recent = topicQueue[(cursor - reviewCount + i + topicQueue.length) % topicQueue.length];
            tasks.push({
              id: uid(), date: iso, startTime: t, endTime: addMinutes(t, blocks[i]),
              area: recent.areaName, areaId: recent.areaId, subject: recent.subjectName,
              topic: recent.topicName, topicId: recent.topicId,
              activityType: 'Revisão', durationMinutes: blocks[i],
              status: 'Pendente', notes: '', difficulty: null
            });
            t = addMinutes(addMinutes(t, blocks[i]), breakMinutes);
          }
        } else if (!redacaoDoneThisWeek && weekday === (config.revisionDay === 3 ? 4 : 3) && weekCounter > 0) {
          // Reserva um dia por semana para redação (dia 3=quarta por padrão,
          // desviando para quinta se coincidir com o dia de revisão)
          redacaoDoneThisWeek = true;
          const redacaoMinutes = Math.min(dailyMinutes, Math.max(60, Math.round(dailyMinutes * 0.5)));
          const remaining = dailyMinutes - redacaoMinutes;
          tasks.push({
            id: uid(), date: iso, startTime,
            endTime: addMinutes(startTime, redacaoMinutes),
            area: 'Redação', areaId: 'redacao', subject: 'Redação',
            topic: 'Produção textual dissertativo-argumentativa', topicId: null,
            activityType: 'Redação', durationMinutes: redacaoMinutes,
            status: 'Pendente', notes: '', difficulty: null
          });
          if (remaining >= 30 && queue.length) {
            const topic = queue[cursor % queue.length]; cursor++;
            const t2 = addMinutes(startTime, redacaoMinutes + breakMinutes);
            tasks.push({
              id: uid(), date: iso, startTime: t2, endTime: addMinutes(t2, remaining),
              area: topic.areaName, areaId: topic.areaId, subject: topic.subjectName,
              topic: topic.topicName, topicId: topic.topicId,
              activityType: 'Exercícios', durationMinutes: remaining,
              status: 'Pendente', notes: '', difficulty: null
            });
          }
        } else {
          // Dia normal de estudo: distribui `subjectsPerDay` tópicos da fila
          const blocks = splitMinutes(dailyMinutes, subjectsPerDay);
          let t = startTime;
          for (let i = 0; i < subjectsPerDay; i++) {
            if (!queue.length) break;
            const topic = queue[cursor % queue.length];
            cursor++;
            const passes = topicPassCount[topic.topicId] || 0;
            topicPassCount[topic.topicId] = passes + 1;
            const activity = pickActivityType(passes, passes === 0);
            tasks.push({
              id: uid(), date: iso, startTime: t, endTime: addMinutes(t, blocks[i]),
              area: topic.areaName, areaId: topic.areaId, subject: topic.subjectName,
              topic: topic.topicName, topicId: topic.topicId,
              activityType: activity, durationMinutes: blocks[i],
              status: 'Pendente', notes: '', difficulty: null
            });
            t = addMinutes(addMinutes(t, blocks[i]), breakMinutes);
          }
        }
      }

      d.setDate(d.getDate() + 1);
    }

    return tasks;
  }

  return { generateSchedule, addMinutes, dateToISO, isoToDate, toDateOnly, uid, splitMinutes };
})();
