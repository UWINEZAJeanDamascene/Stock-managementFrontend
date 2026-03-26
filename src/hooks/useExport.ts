import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
  sheetName?: string; // For xlsx
  columns?: string[]; // Specific columns to export
}

export interface UseExportReturn {
  // State
  isExporting: boolean;
  exportProgress: number;
  error: string | null;
  
  // Actions
  exportData: (data: unknown[], options?: ExportOptions) => Promise<void>;
  exportFromApi: (apiUrl: string, options?: ExportOptions) => Promise<void>;
}

/**
 * Hook for exporting data to various formats
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const accessToken = useAuthStore((state) => state.accessToken);
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId);

  /**
   * Convert data to CSV format
   */
  const toCSV = useCallback((data: unknown[], columns?: string[]): string => {
    if (data.length === 0) return '';
    
    const firstRow = data[0] as Record<string, unknown>;
    const headers = columns || Object.keys(firstRow);
    const csvRows = [
      headers.join(','),
      ...data.map((row) => {
        const record = row as Record<string, unknown>;
        return headers.map(header => {
          const value = record[header];
          // Handle values that need quoting
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Quote if contains comma, quote, or newline
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',');
      })
    ];
    
    return csvRows.join('\n');
  }, []);

  /**
   * Download a file
   */
  const downloadFile = useCallback((content: string | Blob, filename: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Export data from local array
   */
  const exportData = useCallback(async (
    data: unknown[],
    options: ExportOptions = {}
  ): Promise<void> => {
    const { 
      filename = 'export', 
      format = 'csv',
      columns 
    } = options;

    setIsExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      setExportProgress(25);

      let content: string | Blob;
      let mimeType: string;
      let finalFilename: string;

      switch (format) {
        case 'csv':
          content = toCSV(data, columns);
          mimeType = 'text/csv';
          finalFilename = `${filename}.csv`;
          break;

        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          finalFilename = `${filename}.json`;
          break;

        case 'xlsx':
          // For xlsx, we'll fall back to CSV for now
          // A proper implementation would use a library like xlsx
          content = toCSV(data, columns);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          finalFilename = `${filename}.xlsx`;
          break;

        case 'pdf':
          // For PDF, we'll fall back to CSV for now
          // A proper implementation would use a library like jspdf
          content = toCSV(data, columns);
          mimeType = 'application/pdf';
          finalFilename = `${filename}.pdf`;
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      setExportProgress(75);

      downloadFile(content, finalFilename, mimeType);

      setExportProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [toCSV, downloadFile]);

  /**
   * Export data from API
   */
  const exportFromApi = useCallback(async (
    apiUrl: string,
    options: ExportOptions = {}
  ): Promise<void> => {
    const { filename = 'export', format = 'csv' } = options;

    setIsExporting(true);
    setExportProgress(0);
    setError(null);

    try {
      setExportProgress(10);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Add auth token if available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Add company ID for multi-tenancy
      if (activeCompanyId) {
        headers['X-Company-Id'] = activeCompanyId;
      }

      setExportProgress(25);

      const response = await fetch(apiUrl, { headers });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      setExportProgress(50);

      // Export the fetched data
      await exportData(data as unknown[], { ...options, filename, format });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [accessToken, activeCompanyId, exportData]);

  return {
    // State
    isExporting,
    exportProgress,
    error,
    
    // Actions
    exportData,
    exportFromApi,
  };
}

export default useExport;
