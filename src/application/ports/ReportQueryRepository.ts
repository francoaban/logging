/**
 * Contrato mínimo de Fase 1. La forma exacta de `ReportQuery` se refina en
 * Fase 5 (Reporting Engine) y, sobre todo, en Fase 6: ahí la query
 * *restringida* se construye como objeto canónico en la capa de aplicación
 * y cada adapter de persistencia solo la traduce a su dialecto — nunca
 * re-deriva el scope autorizado por su cuenta (`ROADMAP.md`, pendiente de
 * Fase 6).
 */
export interface ReportQuery {
  readonly [key: string]: unknown;
}

export interface ReportResult {
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly totalCount: number;
}

export interface ReportQueryRepository {
  aggregate(query: ReportQuery): Promise<ReportResult>;
}
