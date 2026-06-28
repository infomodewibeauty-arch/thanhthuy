/**
 * analyticsEngine.ts  (v2 \u2014 multi-dataset orchestrator)
 * Detects dataset type then dispatches to the correct analytics module.
 */

import { detectDatasetType, DatasetType } from './columnDetection';
import { buildHRColumnMap, analyzeHRData, compileHRGeminiPayload, HRAnalyticsResult } from './hrAnalytics';
import { buildSalesColumnMap, analyzeSalesData, compileSalesGeminiPayload, SalesAnalyticsResult } from './salesAnalytics';
import { analyzeGenericData, compileGenericGeminiPayload, GenericAnalyticsResult } from './genericAnalytics';

export type UnifiedAnalyticsResult =
  | HRAnalyticsResult
  | SalesAnalyticsResult
  | GenericAnalyticsResult;

/**
 * Main entry point: detect type + run appropriate analytics
 */
export function analyzeData(rawRows: any[]): UnifiedAnalyticsResult {
  if (!rawRows || rawRows.length === 0) {
    return analyzeGenericData([]);
  }

  const rawCols = Object.keys(rawRows[0]);
  const type: DatasetType = detectDatasetType(rawCols);

  if (type === 'HR_WORKFORCE') {
    const columnMap = buildHRColumnMap(rawCols);
    return analyzeHRData(rawRows, columnMap);
  }

  if (type === 'SALES_FINANCE') {
    const columnMap = buildSalesColumnMap(rawCols);
    return analyzeSalesData(rawRows, columnMap);
  }

  return analyzeGenericData(rawRows);
}

/**
 * Compile Gemini API payload based on dataset type
 */
export function compileGeminiPayload(
  result: UnifiedAnalyticsResult
): Record<string, any> {
  if (result.datasetType === 'HR_WORKFORCE') {
    return compileHRGeminiPayload(result as HRAnalyticsResult, (result as HRAnalyticsResult).columnMap);
  }
  if (result.datasetType === 'SALES_FINANCE') {
    return compileSalesGeminiPayload(result as SalesAnalyticsResult, (result as SalesAnalyticsResult).columnMap);
  }
  return compileGenericGeminiPayload(result as GenericAnalyticsResult);
}

// Re-export types for consumers
export type { HRAnalyticsResult, SalesAnalyticsResult, GenericAnalyticsResult };
export type { DatasetType };
