/**
 * genericAnalytics.ts
 * Generic/unknown dataset analytics \u2014 column distribution & basic stats
 */

import { parseCleanNumber, parseCleanDate } from './dataCleaner';

export type ColumnKind = 'numeric' | 'date' | 'category' | 'text';

export interface ColumnProfile {
  name: string;
  kind: ColumnKind;
  uniqueCount: number;
  nullCount: number;
  topValues: { name: string; count: number }[];
  min?: number;
  max?: number;
  avg?: number;
}

export interface GenericSummary {
  totalRows: number;
  totalCols: number;
  numericCols: number;
  categoryCols: number;
  dateCols: number;
  textCols: number;
  columns: ColumnProfile[];
}

export interface GenericAnalyticsResult {
  datasetType: 'GENERIC';
  summary: GenericSummary;
  rawRows: any[];
}

function detectKind(values: any[]): ColumnKind {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';

  // Try date
  const dateParsed = nonNull.slice(0, 10).map((v) => parseCleanDate(v));
  if (dateParsed.filter(Boolean).length >= Math.min(5, nonNull.length) * 0.6) return 'date';

  // Try numeric
  const numParsed = nonNull.slice(0, 20).map((v) => parseCleanNumber(v));
  if (numParsed.filter((n) => n !== null).length >= Math.min(10, nonNull.length) * 0.7) return 'numeric';

  // Category vs text (category = few unique values)
  const uniq = new Set(nonNull.map((v) => v.toString().trim()));
  const uniqueRatio = uniq.size / nonNull.length;
  if (uniqueRatio < 0.3 || uniq.size <= 20) return 'category';

  return 'text';
}

export function analyzeGenericData(rawRows: any[]): GenericAnalyticsResult {
  if (rawRows.length === 0) {
    return {
      datasetType: 'GENERIC',
      summary: { totalRows: 0, totalCols: 0, numericCols: 0, categoryCols: 0, dateCols: 0, textCols: 0, columns: [] },
      rawRows: [],
    };
  }

  const allKeys = Array.from(new Set(rawRows.flatMap((r) => Object.keys(r))));
  const profiles: ColumnProfile[] = allKeys.map((col) => {
    const values = rawRows.map((r) => r[col] ?? null);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
    const nullCount = values.length - nonNull.length;
    const kind = detectKind(nonNull);

    // Top values for category/text
    const counts: Record<string, number> = {};
    nonNull.forEach((v) => {
      const k = v.toString().trim().slice(0, 60);
      counts[k] = (counts[k] || 0) + 1;
    });
    const topValues = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const profile: ColumnProfile = {
      name: col,
      kind,
      uniqueCount: Object.keys(counts).length,
      nullCount,
      topValues,
    };

    // Numeric stats
    if (kind === 'numeric') {
      const nums = nonNull.map((v) => parseCleanNumber(v)).filter((n) => n !== null) as number[];
      if (nums.length > 0) {
        profile.min = Math.min(...nums);
        profile.max = Math.max(...nums);
        profile.avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      }
    }

    return profile;
  });

  const numericCols = profiles.filter((p) => p.kind === 'numeric').length;
  const categoryCols = profiles.filter((p) => p.kind === 'category').length;
  const dateCols = profiles.filter((p) => p.kind === 'date').length;
  const textCols = profiles.filter((p) => p.kind === 'text').length;

  return {
    datasetType: 'GENERIC',
    summary: {
      totalRows: rawRows.length,
      totalCols: allKeys.length,
      numericCols,
      categoryCols,
      dateCols,
      textCols,
      columns: profiles,
    },
    rawRows,
  };
}

export function compileGenericGeminiPayload(result: GenericAnalyticsResult) {
  const { summary } = result;
  const colSummary = summary.columns
    .map((c) => {
      const base = `- Cột "${c.name}" (${c.kind}): ${c.uniqueCount} giá trị unique, ${c.nullCount} null`;
      const top = c.topValues.length > 0
        ? ` | Top: ${c.topValues.slice(0, 3).map((v) => `${v.name}(${v.count})`).join(', ')}`
        : '';
      const stats = c.kind === 'numeric' && c.avg !== undefined
        ? ` | Min:${c.min} Max:${c.max} Avg:${c.avg?.toFixed(2)}`
        : '';
      return base + top + stats;
    })
    .join('\n');

  const sampleRows = result.rawRows.slice(0, 5).map((row) => {
    const r: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      r[k] = v instanceof Date ? v.toISOString().split('T')[0] : v;
    });
    return r;
  });

  return {
    datasetType: 'GENERIC',
    columns: summary.columns.map((c) => ({ original: c.name, mapped: c.kind })),
    rowCount: summary.totalRows,
    summary: {
      overviewText: `Dataset có ${summary.totalRows} dòng, ${summary.totalCols} cột. Trong đó: ${summary.numericCols} cột số, ${summary.categoryCols} cột danh mục, ${summary.dateCols} cột ngày tháng, ${summary.textCols} cột văn bản.`,
      columnDetails: colSummary,
    },
    sampleRows,
  };
}
