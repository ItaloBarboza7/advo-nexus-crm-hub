import { format } from "date-fns";

/**
 * Utilitário centralizado para manipulação de timezone brasileiro
 */
export class BrazilTimezone {
  private static readonly TIMEZONE = "America/Sao_Paulo";

  /**
   * Converte uma data UTC para o timezone brasileiro
   */
  static toLocal(utcDate: Date): Date {
    return new Date(utcDate.toLocaleString("en-US", { timeZone: this.TIMEZONE }));
  }

  /**
   * Obtém a data atual no timezone brasileiro
   */
  static now(): Date {
    return this.toLocal(new Date());
  }

  /**
   * Formata uma data para comparação de data (YYYY-MM-DD) no timezone brasileiro
   */
  static formatDateForQuery(date: Date): string {
    const localDate = this.toLocal(date);
    return format(localDate, "yyyy-MM-dd");
  }

  /**
   * Formata uma data para exibição (DD/MM/YYYY) no timezone brasileiro
   */
  static formatDateForDisplay(date: Date): string {
    const localDate = this.toLocal(date);
    return format(localDate, "dd/MM/yyyy");
  }

  /**
   * Verifica se duas datas são do mesmo dia no timezone brasileiro
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return this.formatDateForQuery(date1) === this.formatDateForQuery(date2);
  }

  /**
   * Cria uma data no início do dia no timezone brasileiro
   */
  static startOfDay(date: Date): Date {
    const localDate = this.toLocal(date);
    return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
  }

  /**
   * Cria uma data no final do dia no timezone brasileiro
   */
  static endOfDay(date: Date): Date {
    const localDate = this.toLocal(date);
    return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 23, 59, 59, 999);
  }

  /**
   * Obtém informações detalhadas sobre uma data no timezone brasileiro
   */
  static getDateInfo(date: Date) {
    const utc = date;
    const local = this.toLocal(date);
    
    return {
      utc: {
        iso: utc.toISOString(),
        formatted: format(utc, "dd/MM/yyyy HH:mm:ss")
      },
      local: {
        iso: local.toISOString(),
        formatted: format(local, "dd/MM/yyyy HH:mm:ss"),
        dateOnly: this.formatDateForQuery(date),
        displayDate: this.formatDateForDisplay(date)
      }
    };
  }

  /**
   * Log de debug para timezone
   */
  static debugLog(label: string, date: Date) {
    const info = this.getDateInfo(date);
    console.log(`🕐 ${label}:`, {
      utc: info.utc.iso,
      local: info.local.iso,
      displayDate: info.local.displayDate,
      queryDate: info.local.dateOnly
    });
  }
}