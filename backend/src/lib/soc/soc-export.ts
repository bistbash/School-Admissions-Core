import { prisma } from '../database/prisma';
import { AuditLogFilter } from '../modules/soc/soc.service';
import { logger } from '../utils/logger';

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsToCSV(filter: AuditLogFilter = {}): Promise<string> {
  const { SOCService } = await import('../modules/soc/soc.service');
  const socService = new SOCService();
  
  // Get all logs matching the filter (without pagination)
  const result = await socService.getAuditLogs({
    ...filter,
    limit: 10000, // Large limit for export
    offset: 0,
  }) as { logs: any[]; total: number };

  // CSV header
  const headers = [
    'ID',
    'Timestamp',
    'User ID',
    'User Email',
    'Action',
    'Resource',
    'Resource ID',
    'Status',
    'IP Address',
    'User Agent',
    'Error Message',
    'Incident Status',
    'Priority',
    'Assigned To',
    'Details',
  ];

  // CSV rows
  const rows = result.logs.map((log: any) => [
    log.id,
    log.createdAt.toISOString(),
    log.userId || '',
    log.userEmail || '',
    log.action,
    log.resource,
    log.resourceId || '',
    log.status,
    log.ipAddress || '',
    log.userAgent || '',
    log.errorMessage || '',
    log.incidentStatus || '',
    log.priority || '',
    log.assignedTo || '',
    log.details ? JSON.stringify(log.details) : '',
  ]);

  // Combine header and rows
  const csvLines = [
    headers.join(','),
    ...rows.map((row: any[]) => 
      row.map((cell: any) => {
        // Escape commas and quotes in CSV
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ];

  logger.info({
    type: 'audit_export',
    format: 'csv',
    recordCount: result.logs.length,
  }, `Exported ${result.logs.length} audit logs to CSV`);

  return csvLines.join('\n');
}

/**
 * Export audit logs to JSON format
 */
export async function exportAuditLogsToJSON(filter: AuditLogFilter = {}): Promise<string> {
  const { SOCService } = await import('../modules/soc/soc.service');
  const socService = new SOCService();
  
  const result = await socService.getAuditLogs({
    ...filter,
    limit: 10000,
    offset: 0,
  }) as { logs: any[]; total: number };

  logger.info({
    type: 'audit_export',
    format: 'json',
    recordCount: result.logs.length,
  }, `Exported ${result.logs.length} audit logs to JSON`);

  return JSON.stringify({
    exportDate: new Date().toISOString(),
    filter,
    total: result.total,
    logs: result.logs,
  }, null, 2);
}

/**
 * Export statistics to JSON
 */
export async function exportStatsToJSON(
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const { SOCService } = await import('../modules/soc/soc.service');
  const socService = new SOCService();
  
  const stats = await socService.getAuditStats({
    startDate,
    endDate,
  });

  logger.info({
    type: 'stats_export',
    format: 'json',
    startDate,
    endDate,
  }, 'Exported statistics to JSON');

  return JSON.stringify({
    exportDate: new Date().toISOString(),
    period: {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    statistics: stats,
  }, null, 2);
}
