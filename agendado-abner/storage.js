/**
 * storage.js — Camada de persistência
 * ------------------------------------------------------------
 * Toda leitura/escrita de dados do app passa por este arquivo.
 * Hoje ele usa localStorage, mas a API (get/set/remove/all/clear)
 * foi desenhada para que, no futuro, baste reescrever o "driver"
 * interno (ex: chamadas fetch() para uma API com PostgreSQL,
 * MySQL ou Firebase) sem alterar o restante da aplicação.
 * ------------------------------------------------------------
 */

const STORAGE_PREFIX = 'agendadoAbner:';

const STORAGE_KEYS = {
  CONFIG: 'config',
  TASKS: 'tasks',
  CONTENT_STATUS: 'contentStatus',
  REDACOES: 'redacoes',
  SIMULADOS: 'simulados',
  REVISOES: 'revisoes',
  TIMER: 'timer',
  HISTORY: 'history',
  THEME: 'theme',
  ONBOARDED: 'onboarded'
};

const Storage = {
  /** Lê um valor do armazenamento (já parseado de JSON). */
  get(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[Storage] Erro ao ler "${key}":`, err);
      return fallback;
    }
  },

  /** Grava um valor (serializado em JSON). */
  set(key, value) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[Storage] Erro ao salvar "${key}":`, err);
      return false;
    }
  },

  remove(key) {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  },

  /** Exporta todos os dados do app em um único objeto (para backup). */
  exportAll() {
    const dump = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      dump[key] = this.get(key, null);
    });
    dump.__exportedAt = new Date().toISOString();
    dump.__version = 1;
    return dump;
  },

  /** Importa um objeto gerado por exportAll(), sobrescrevendo os dados atuais. */
  importAll(dump) {
    if (!dump || typeof dump !== 'object') throw new Error('Arquivo de importação inválido.');
    Object.values(STORAGE_KEYS).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(dump, key) && dump[key] !== null) {
        this.set(key, dump[key]);
      }
    });
    return true;
  },

  /** Apaga completamente todos os dados do Agendado Abner. */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => this.remove(key));
  }
};
