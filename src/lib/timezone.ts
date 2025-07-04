
export class BrazilTimezone {
  private static readonly TIMEZONE = 'America/Sao_Paulo';

  /**
   * Debug logging utility
   */
  static debugLog(message: string, data?: any): void {
    console.log(`🕒 BrazilTimezone - ${message}`, data ? data : '');
  }

  /**
   * Converts a UTC date to Brazil timezone
   */
  static toLocal(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Date(dateObj.toLocaleString("en-US", { timeZone: this.TIMEZONE }));
  }

  /**
   * Formats a date for display in Brazilian format
   */
  static formatDateForDisplay(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR', {
      timeZone: this.TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formats a date for SQL queries (YYYY-MM-DD format in Brazil timezone)
   */
  static formatDateForQuery(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const localDate = this.toLocal(dateObj);
    return localDate.toISOString().split('T')[0];
  }

  /**
   * Gets the current date in Brazil timezone
   */
  static now(): Date {
    return this.toLocal(new Date());
  }

  /**
   * Creates a date at the start of day in Brazil timezone
   */
  static startOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const localDate = this.toLocal(dateObj);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  }

  /**
   * Creates a date at the end of day in Brazil timezone
   */
  static endOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;  
    const localDate = this.toLocal(dateObj);
    localDate.setHours(23, 59, 59, 999);
    return localDate;
  }
}
