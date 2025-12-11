import { useEffect, useState, useMemo } from 'react';
import { Shield, AlertTriangle, Activity, Download, Filter, X, CheckCircle, Clock, XCircle, AlertCircle, Ban, Search, Zap, UserSearch, Globe, Wrench, Copy, BarChart3, Wifi, WifiOff, RefreshCw, Eye, TrendingUp, TrendingDown, Pin, PinOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { apiClient } from '../../shared/lib/api';
import { cn } from '../../shared/lib/utils';
import { useSOCWebSocket } from './useSOCWebSocket';
import { LineChartComponent, BarChartComponent, PieChartComponent } from '../../shared/ui/Charts';

interface AuditLog {
  id: number;
  userId?: number;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: number;
  status: string;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  incidentStatus?: string;
  priority?: string;
  assignedTo?: number;
  createdAt: string;
  details?: any;
  authMethod?: 'API_KEY' | 'JWT' | 'UNAUTHENTICATED'; // How the request was authenticated
  apiKey?: {
    id: number;
    name: string;
    owner?: {
      id: number;
      name?: string;
      email?: string;
      personalNumber?: string;
      isAdmin?: boolean;
    };
    userId?: number; // Owner's user ID
  };
  user?: {
    id: number;
    name?: string;
    email?: string;
    personalNumber?: string;
    isAdmin?: boolean;
  };
  httpMethod?: string;
  httpPath?: string;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: number;
}

interface Incident {
  id: number;
  action: string;
  resource: string;
  status: string;
  incidentStatus: string;
  priority: string;
  createdAt: string;
  userEmail?: string;
  ipAddress?: string;
  authMethod?: 'API_KEY' | 'JWT' | 'UNAUTHENTICATED';
  apiKey?: {
    id: number;
    name: string;
    owner?: {
      id: number;
      name?: string;
      email?: string;
      personalNumber?: string;
      isAdmin?: boolean;
    };
    userId?: number;
  };
  user?: {
    id: number;
    name?: string;
    email?: string;
    personalNumber?: string;
    isAdmin?: boolean;
  };
}

interface SOCStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byStatus: Record<string, number>;
  recentFailures: number;
  recentUnauthorized: number;
  byIncidentStatus: Record<string, number>;
  byPriority: Record<string, number>;
  unassignedIncidents: number;
  openIncidents: number;
}

interface SOCMetrics {
  securityEvents: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent24h: number;
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    falsePositives: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
    avgResolutionTime: number;
  };
  analystActivity: {
    totalActions: number;
    byAnalyst: Record<number, number>;
    avgActionsPerDay: number;
  };
  ipBlocking: {
    totalBlocked: number;
    activeBlocks: number;
    recentBlocks24h: number;
  };
  trustedUsers: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
  };
}

export function SOCPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'logs' | 'alerts' | 'blacklist' | 'tools'>('overview');
  const [stats, setStats] = useState<SOCStats | null>(null);
  const [metrics, setMetrics] = useState<SOCMetrics | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time WebSocket connection
  const { 
    connected: wsConnected, 
    events: securityEvents,
    incidentUpdates,
    auditLogUpdates
  } = useSOCWebSocket();
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    priority: '',
    authMethod: '',
    apiKeyId: '',
    apiKeyOwnerId: '',
    correlationId: '',
    limit: 50,
  });
  
  // Toolbox states
  const [showBlockIP, setShowBlockIP] = useState(false);
  const [blockIPValue, setBlockIPValue] = useState('');
  const [blockIPReason, setBlockIPReason] = useState('');
  const [showUserLookup, setShowUserLookup] = useState(false);
  const [userLookupValue, setUserLookupValue] = useState('');
  const [userLookupResults, setUserLookupResults] = useState<any[]>([]);
  const [showIPLookup, setShowIPLookup] = useState(false);
  const [ipLookupValue, setIPLookupValue] = useState('');
  const [ipLookupResults, setIPLookupResults] = useState<any[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
  const [blockExpiration, setBlockExpiration] = useState<string>('');
  const [blockDuration, setBlockDuration] = useState<'permanent' | '1h' | '24h' | '7d' | '30d' | 'custom'>('permanent');
  const [selectedLogDetails, setSelectedLogDetails] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  // Auto-refresh data every 30 seconds when on logs/alerts/incidents tabs
  useEffect(() => {
    if (activeTab === 'logs' || activeTab === 'alerts' || activeTab === 'incidents' || activeTab === 'overview') {
      const interval = setInterval(() => {
        loadData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [activeTab, filters]);

  // Handle real-time incident updates
  useEffect(() => {
    if (incidentUpdates.length > 0) {
      const latestUpdate = incidentUpdates[0];
      // Update incidents list if we're on incidents tab
      if (activeTab === 'incidents' || activeTab === 'overview') {
        setIncidents(prev => {
          const existingIndex = prev.findIndex(i => i.id === latestUpdate.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...latestUpdate };
            return updated;
          } else {
            // New incident, add to beginning
            return [{ ...latestUpdate } as Incident, ...prev];
          }
        });
      }
    }
  }, [incidentUpdates, activeTab]);

  // Handle real-time audit log updates
  useEffect(() => {
    if (auditLogUpdates.length > 0 && activeTab === 'logs') {
      const latestUpdate = auditLogUpdates[0];
      setLogs(prev => {
        const existingIndex = prev.findIndex(l => l.id === latestUpdate.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...latestUpdate };
          return updated;
        } else {
          // New log, add to beginning
          return [{ ...latestUpdate } as AuditLog, ...prev];
        }
      });
    }
  }, [auditLogUpdates, activeTab]);

  useEffect(() => {
    if (activeTab === 'blacklist') {
      loadBlockedIPs();
    }
  }, [activeTab]);

  // Calculate chart data for Overview - MUST be after all useState and useEffect hooks
  const hourlyActivityData = useMemo(() => {
    const now = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now);
      hour.setHours(now.getHours() - (23 - i));
      hour.setMinutes(0);
      hour.setSeconds(0);
      return hour;
    });

    return hours.map(hour => {
      const hourStart = hour.getTime();
      const hourEnd = hourStart + 3600000;
      const count = logs.filter(log => {
        const logTime = new Date(log.createdAt).getTime();
        return logTime >= hourStart && logTime < hourEnd;
      }).length;

      return {
        time: hour.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        פעילות: count,
      };
    });
  }, [logs]);

  const statusDistributionData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    logs.forEach(log => {
      const status = log.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      סטטוס: status,
      כמות: count,
    }));
  }, [logs]);

  // Calculate chart data for Activity Log tab
  const activityLogHourlyData = useMemo(() => {
    const now = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now);
      hour.setHours(now.getHours() - (23 - i));
      hour.setMinutes(0);
      hour.setSeconds(0);
      return hour;
    });

    return hours.map(hour => {
      const hourStart = hour.getTime();
      const hourEnd = hourStart + 3600000;
      const count = logs.filter(log => {
        const logTime = new Date(log.createdAt).getTime();
        return logTime >= hourStart && logTime < hourEnd;
      }).length;

      return {
        time: hour.toLocaleTimeString('he-IL', { hour: '2-digit' }),
        פעילות: count,
      };
    });
  }, [logs]);

  const actionDistributionData = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    logs.forEach(log => {
      const action = log.action || 'UNKNOWN';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    return Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({
        פעולה: action,
        כמות: count,
      }));
  }, [logs]);

  const activityLogStatusData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    logs.forEach(log => {
      const status = log.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      סטטוס: status,
      כמות: count,
    }));
  }, [logs]);

  const loadBlockedIPs = async () => {
    try {
      const res = await apiClient.get('/soc/blocked-ips?includeExpired=true');
      setBlockedIPs(res.data || []);
    } catch (error) {
      console.error('Failed to load blocked IPs:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'overview') {
        const [statsRes, incidentsRes] = await Promise.all([
          apiClient.get('/soc/stats'),
          apiClient.get('/soc/incidents?limit=10'),
        ]);
        setStats(statsRes.data);
        // Handle both old format (array) and new format (object with logs)
        setIncidents(Array.isArray(incidentsRes.data) ? incidentsRes.data : (incidentsRes.data?.logs || []));
      } else if (activeTab === 'incidents') {
        const res = await apiClient.get('/soc/incidents?limit=100');
        // Handle both old format (array) and new format (object with logs)
        setIncidents(Array.isArray(res.data) ? res.data : (res.data?.logs || []));
      } else if (activeTab === 'alerts') {
        const res = await apiClient.get('/soc/alerts?limit=50');
        setAlerts(res.data || []);
      } else if (activeTab === 'blacklist') {
        await loadBlockedIPs();
      } else if (activeTab === 'logs') {
        const params = new URLSearchParams();
        if (filters.action) params.append('action', filters.action);
        if (filters.status) params.append('status', filters.status);
        if (filters.authMethod) params.append('authMethod', filters.authMethod);
        if (filters.apiKeyId) params.append('apiKeyId', filters.apiKeyId);
        if (filters.apiKeyOwnerId) params.append('apiKeyOwnerId', filters.apiKeyOwnerId);
        if (filters.correlationId) params.append('correlationId', filters.correlationId);
        params.append('limit', filters.limit.toString());
        try {
          const res = await apiClient.get(`/soc/audit-logs?${params.toString()}`);
          // Handle different response formats
          const logsData = res.data?.logs || (Array.isArray(res.data) ? res.data : []);
          
          // Sort logs: pinned first (by pinnedAt desc), then unpinned (by createdAt desc)
          const sortedLogs = [...logsData].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isPinned && b.isPinned) {
              const aPinned = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
              const bPinned = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
              return bPinned - aPinned; // Newest pinned first
            }
            // Both unpinned - sort by createdAt (newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          setLogs(sortedLogs);
          if (sortedLogs.length === 0) {
            console.log('No logs returned from API. Response:', res.data);
          }
        } catch (error: any) {
          console.error('Failed to load audit logs:', error);
          console.error('Error details:', error.response?.data || error.message);
          setLogs([]);
        }
      }
    } catch (error) {
      console.error('Failed to load SOC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.status) params.append('status', filters.status);
      const res = await apiClient.get(`/soc/export/logs?format=${format}&${params.toString()}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportStats = async () => {
    try {
      const res = await apiClient.get('/soc/export/stats', {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stats-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export stats failed:', error);
      alert('שגיאה בייצוא סטטיסטיקות');
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
      case 'MEDIUM':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900';
      case 'LOW':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#262626] border-gray-200 dark:border-[#1F1F1F]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'FALSE_POSITIVE':
        return <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      case 'INVESTIGATING':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'ESCALATED':
        return <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'סקירה כללית', icon: Activity },
    { id: 'incidents', label: 'תקריות', icon: AlertTriangle },
    { id: 'alerts', label: 'התראות', icon: Shield },
    { id: 'logs', label: 'יומן פעילות', icon: Activity },
    { id: 'blacklist', label: 'רשימה שחורה', icon: Ban },
    { id: 'tools', label: 'כלי עבודה', icon: Wrench },
  ];

  // Quick action handlers
  const handleBlockIP = async () => {
    if (!blockIPValue) return;
    try {
      let expiresAt: Date | undefined;
      
      // Calculate expiration date based on duration
      if (blockDuration === 'custom' && blockExpiration) {
        expiresAt = new Date(blockExpiration);
      } else if (blockDuration !== 'permanent') {
        const now = new Date();
        switch (blockDuration) {
          case '1h':
            expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
            break;
          case '24h':
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case '7d':
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        }
      }

      await apiClient.post('/soc/block-ip', {
        ipAddress: blockIPValue,
        reason: blockIPReason || 'Blocked via SOC toolbox',
        expiresAt: expiresAt?.toISOString(),
      });
      alert(`כתובת IP ${blockIPValue} נחסמה בהצלחה${expiresAt ? ` עד ${expiresAt.toLocaleString('he-IL')}` : ' לצמיתות'}`);
      setBlockIPValue('');
      setBlockIPReason('');
      setBlockExpiration('');
      setBlockDuration('permanent');
      setShowBlockIP(false);
      loadData();
      if (activeTab === 'blacklist') {
        loadBlockedIPs();
      }
    } catch (error: any) {
      alert(`שגיאה בחסימת IP: ${error.message}`);
    }
  };

  const handleUnblockIP = async (ipAddress: string) => {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את החסימה על ${ipAddress}?`)) {
      return;
    }
    try {
      await apiClient.post('/soc/unblock-ip', { ipAddress });
      alert(`כתובת IP ${ipAddress} הוסרה מהרשימה השחורה`);
      loadBlockedIPs();
    } catch (error: any) {
      alert(`שגיאה בהסרת חסימה: ${error.message}`);
    }
  };

  const handleUserLookup = async () => {
    if (!userLookupValue) return;
    try {
      const [usersRes, activityRes] = await Promise.all([
        apiClient.get(`/soldiers?email=${userLookupValue}`).catch(() => ({ data: [] })),
        apiClient.get(`/soc/audit-logs?userEmail=${userLookupValue}&limit=20`).catch(() => ({ data: { logs: [] } })),
      ]);
      setUserLookupResults([
        ...(usersRes.data || []),
        ...(activityRes.data.logs || []),
      ]);
    } catch (error: any) {
      console.error('User lookup error:', error);
    }
  };

  const handleIPLookup = async () => {
    if (!ipLookupValue) return;
    try {
      const [blockedRes, logsRes] = await Promise.all([
        apiClient.get(`/soc/blocked-ips`).catch(() => ({ data: [] })),
        apiClient.get(`/soc/audit-logs?ipAddress=${ipLookupValue}&limit=20`).catch(() => ({ data: { logs: [] } })),
      ]);
      const isBlocked = (blockedRes.data || []).some((ip: any) => ip.ipAddress === ipLookupValue);
      setIPLookupResults([
        { type: 'blocked', isBlocked, ...(isBlocked ? (blockedRes.data || []).find((ip: any) => ip.ipAddress === ipLookupValue) : {}) },
        ...(logsRes.data.logs || []),
      ]);
    } catch (error: any) {
      console.error('IP lookup error:', error);
    }
  };

  const handleQuickResolve = async (incidentId: number, status: 'RESOLVED' | 'FALSE_POSITIVE') => {
    try {
      await apiClient.put(`/soc/incidents/${incidentId}`, {
        incidentStatus: status,
      });
      loadData();
    } catch (error: any) {
      alert(`שגיאה: ${error.message}`);
    }
  };

  const handleBulkAction = async (action: 'resolve' | 'false_positive' | 'assign') => {
    if (selectedIncidents.length === 0) {
      alert('אנא בחר תקריות');
      return;
    }
    try {
      if (action === 'false_positive') {
        // Use bulk endpoint for better performance
        await apiClient.post('/soc/incidents/bulk-false-positive', {
          incidentIds: selectedIncidents
        });
      } else {
        for (const id of selectedIncidents) {
          if (action === 'resolve') {
            await apiClient.put(`/soc/incidents/${id}`, { incidentStatus: 'RESOLVED' });
          }
        }
      }
      setSelectedIncidents([]);
      loadData();
      alert(`בוצעה פעולה על ${selectedIncidents.length} תקריות`);
    } catch (error: any) {
      alert(`שגיאה: ${error.message}`);
    }
  };

  const handleCleanupOldIncidents = async () => {
    if (!confirm('האם אתה בטוח שברצונך לסמן תקריות ישנות (מעל 7 ימים) שנוצרו על ידי anomaly detection כחיובי שגוי?')) {
      return;
    }
    try {
      const res = await apiClient.post('/soc/incidents/cleanup', { daysOld: 7 });
      alert(`נקו ${res.data.count} תקריות ישנות`);
      loadData();
    } catch (error: any) {
      alert(`שגיאה: ${error.message}`);
    }
  };

  const handleCopyCorrelationId = (log: AuditLog) => {
    // Extract correlation ID from details if available
    const correlationId = log.details?.correlationId || `log-${log.id}`;
    navigator.clipboard.writeText(correlationId);
    alert('הועתק ללוח');
  };

  const handlePinLog = async (logId: number) => {
    try {
      // Save current scroll position
      const scrollContainer = document.querySelector('[data-audit-logs-container]') || window;
      const scrollPosition = scrollContainer === window 
        ? window.scrollY 
        : (scrollContainer as HTMLElement).scrollTop;
      
      // Find the log to pin
      const logToPin = logs.find(log => log.id === logId);
      if (!logToPin) return;

      // Find the row element to maintain visual position
      const rowElement = document.querySelector(`[data-log-id="${logId}"]`) as HTMLElement;
      const rowOffset = rowElement ? rowElement.offsetTop : null;

      // Optimistically update: move pinned log to top
      setLogs(prevLogs => {
        const updatedLogs = prevLogs.map(log => 
          log.id === logId 
            ? { ...log, isPinned: true, pinnedAt: new Date().toISOString(), pinnedBy: undefined }
            : log
        );
        
        // Sort: pinned first (by pinnedAt desc), then unpinned (by createdAt desc)
        return updatedLogs.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.isPinned && b.isPinned) {
            const aPinned = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bPinned = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bPinned - aPinned; // Newest pinned first
          }
          // Both unpinned - sort by createdAt
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        if (scrollContainer === window) {
          window.scrollTo(0, scrollPosition);
        } else {
          (scrollContainer as HTMLElement).scrollTop = scrollPosition;
        }
      });

      const response = await apiClient.post(`/soc/audit-logs/${logId}/pin`);
      
      // Update with server response and re-sort
      if (response.data?.log) {
        setLogs(prevLogs => {
          const updated = prevLogs.map(log => 
            log.id === logId 
              ? { ...log, ...response.data.log }
              : log
          );
          
          // Re-sort after server update
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isPinned && b.isPinned) {
              const aPinned = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
              const bPinned = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
              return bPinned - aPinned;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        });
        
        // Restore scroll position again after server update
        requestAnimationFrame(() => {
          if (scrollContainer === window) {
            window.scrollTo(0, scrollPosition);
          } else {
            (scrollContainer as HTMLElement).scrollTop = scrollPosition;
          }
        });
      }
    } catch (error: any) {
      console.error('Pin error:', error);
      // Revert optimistic update on error by reloading
      loadData();
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      alert(`שגיאה בהצמדת הרשומה: ${errorMessage}`);
    }
  };

  const handleUnpinLog = async (logId: number) => {
    try {
      // Save current scroll position
      const scrollContainer = document.querySelector('[data-audit-logs-container]') || window;
      const scrollPosition = scrollContainer === window 
        ? window.scrollY 
        : (scrollContainer as HTMLElement).scrollTop;

      // Optimistically update: remove pin and re-sort
      setLogs(prevLogs => {
        const updated = prevLogs.map(log => 
          log.id === logId 
            ? { ...log, isPinned: false, pinnedAt: undefined, pinnedBy: undefined }
            : log
        );
        
        // Re-sort: pinned first, then unpinned by createdAt
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.isPinned && b.isPinned) {
            const aPinned = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bPinned = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            return bPinned - aPinned;
          }
          // Both unpinned - sort by createdAt (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        if (scrollContainer === window) {
          window.scrollTo(0, scrollPosition);
        } else {
          (scrollContainer as HTMLElement).scrollTop = scrollPosition;
        }
      });

      const response = await apiClient.post(`/soc/audit-logs/${logId}/unpin`);
      
      // Update with server response and re-sort
      if (response.data?.log) {
        setLogs(prevLogs => {
          const updated = prevLogs.map(log => 
            log.id === logId 
              ? { ...log, ...response.data.log }
              : log
          );
          
          // Re-sort after server update
          return updated.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isPinned && b.isPinned) {
              const aPinned = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
              const bPinned = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
              return bPinned - aPinned;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
        });
        
        // Restore scroll position again after server update
        requestAnimationFrame(() => {
          if (scrollContainer === window) {
            window.scrollTo(0, scrollPosition);
          } else {
            (scrollContainer as HTMLElement).scrollTop = scrollPosition;
          }
        });
      }
    } catch (error: any) {
      console.error('Unpin error:', error);
      // Revert optimistic update on error by reloading
      loadData();
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      alert(`שגיאה בהסרת ההצמדה: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-8 animate-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6" />
            מרכז אבטחה (SOC)
            {wsConnected ? (
              <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" aria-label="מחובר לניטור בזמן אמת" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-400 dark:text-gray-500" aria-label="לא מחובר לניטור בזמן אמת" />
            )}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ניטור וניהול אירועי אבטחה {wsConnected && <span className="text-green-600 dark:text-green-400">• בזמן אמת</span>}
          </p>
        </div>
        {activeTab === 'logs' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              רענון
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              ייצא CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              ייצא JSON
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-[#1F1F1F]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Critical Alerts Banner - Only show if there are actual incidents */}
              {incidents.length > 0 && (stats.openIncidents > 0 || stats.recentFailures > 0 || stats.recentUnauthorized > 0) && (
                <Card variant="default" className={cn(
                  "border-2",
                  stats.openIncidents > 5 || stats.recentUnauthorized > 10 
                    ? "border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-950/30" 
                    : "border-amber-500 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30"
                )}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={cn(
                          "h-6 w-6",
                          stats.openIncidents > 5 || stats.recentUnauthorized > 10
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        )} />
                        <div>
                          <div className={cn(
                            "font-semibold text-lg",
                            stats.openIncidents > 5 || stats.recentUnauthorized > 10
                              ? "text-red-700 dark:text-red-300"
                              : "text-amber-700 dark:text-amber-300"
                          )}>
                            {stats.openIncidents > 5 || stats.recentUnauthorized > 10 
                              ? "⚠️ התראות קריטיות דורשות תשומת לב מיידית!" 
                              : "⚠️ יש תקריות פתוחות שדורשות טיפול"}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {incidents.length > 0 && `${incidents.length} תקריות פתוחות • `}
                            {stats.recentFailures > 0 && `${stats.recentFailures} כשלונות אחרונים • `}
                            {stats.recentUnauthorized > 0 && `${stats.recentUnauthorized} ניסיונות גישה לא מורשית`}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('incidents')}
                        className={cn(
                          stats.openIncidents > 5 || stats.recentUnauthorized > 10
                            ? "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50"
                            : "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                        )}
                      >
                        צפה בתקריות
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Activity Charts - Professional SOC Dashboard */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Activity Over Time - Real-Time Monitoring */}
                <Card variant="default" className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      פעילות בזמן אמת (24 שעות אחרונות)
                      {wsConnected ? (
                        <span className="ml-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Wifi className="h-3 w-3" />
                          מחובר
                        </span>
                      ) : (
                        <span className="ml-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <WifiOff className="h-3 w-3" />
                          מנותק
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>טרנד פעילות לפי שעה - ניטור בזמן אמת</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minHeight: '250px', width: '100%' }}>
                      {hourlyActivityData.some(d => d.פעילות > 0) ? (
                        <LineChartComponent
                          data={hourlyActivityData}
                          xKey="time"
                          yKeys={[{ key: 'פעילות', label: 'פעילות', color: '#3B82F6' }]}
                          height={250}
                          showGrid={true}
                          showLegend={true}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-500 dark:text-gray-400">
                          <Activity className="h-12 w-12 mb-4 opacity-50" />
                          <div className="text-sm font-medium mb-2">אין פעילות להצגה</div>
                          <div className="text-xs text-center max-w-xs">
                            פעילות תופיע כאן לאחר ביצוע פעולות במערכת
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity by Status */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      התפלגות לפי סטטוס
                    </CardTitle>
                    <CardDescription>פעילות לפי סטטוס (24 שעות)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minHeight: '250px', width: '100%' }}>
                      {statusDistributionData.length > 0 ? (
                        <PieChartComponent
                          data={statusDistributionData}
                          nameKey="סטטוס"
                          valueKey="כמות"
                          height={250}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-500 dark:text-gray-400">
                          <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                          <div className="text-sm font-medium mb-2">אין נתונים</div>
                          <div className="text-xs text-center">
                            נתונים יופיעו לאחר פעילות
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card variant="default" className={cn(
                  stats.totalLogs > 10000 && "border-blue-300 dark:border-blue-700"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      סה"כ יומנים
                    </CardTitle>
                    <Activity className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium text-black dark:text-white">
                      {stats.totalLogs.toLocaleString()}
                    </div>
                    {stats.totalLogs > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        כל הפעילות במערכת
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="default" className={cn(
                  stats.openIncidents > 0 && "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      תקרית פתוחות
                    </CardTitle>
                    <AlertTriangle className={cn(
                      "h-4 w-4",
                      stats.openIncidents > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-gray-500"
                    )} />
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl font-medium",
                      stats.openIncidents > 0 
                        ? "text-amber-700 dark:text-amber-300" 
                        : "text-black dark:text-white"
                    )}>
                      {stats.openIncidents}
                    </div>
                    {stats.openIncidents > 0 && (
                      <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        דורש טיפול
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="default" className={cn(
                  stats.recentFailures > 5 && "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      כשלונות אחרונים
                    </CardTitle>
                    <XCircle className={cn(
                      "h-4 w-4",
                      stats.recentFailures > 5 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                    )} />
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl font-medium",
                      stats.recentFailures > 5 
                        ? "text-red-700 dark:text-red-300" 
                        : "text-black dark:text-white"
                    )}>
                      {stats.recentFailures}
                    </div>
                    {stats.recentFailures > 5 && (
                      <div className="text-xs text-red-600 dark:text-red-500 mt-1">
                        כמות חריגה
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="default" className={cn(
                  stats.recentUnauthorized > 0 && "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20"
                )}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      גישה לא מורשית
                    </CardTitle>
                    <Shield className={cn(
                      "h-4 w-4",
                      stats.recentUnauthorized > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"
                    )} />
                  </CardHeader>
                  <CardContent>
                    <div className={cn(
                      "text-2xl font-medium",
                      stats.recentUnauthorized > 0 
                        ? "text-orange-700 dark:text-orange-300" 
                        : "text-black dark:text-white"
                    )}>
                      {stats.recentUnauthorized}
                    </div>
                    {stats.recentUnauthorized > 0 && (
                      <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                        התראות אבטחה
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Real-time Security Events Alert */}
              {securityEvents.length > 0 && (
                <Card variant="default" className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      התראות אבטחה בזמן אמת ({securityEvents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {securityEvents.slice(0, 5).map((event, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-md border",
                            event.severity === 'CRITICAL' ? "bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-800" :
                            event.severity === 'HIGH' ? "bg-orange-100 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800" :
                            "bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-black dark:text-white">
                                {event.type} - {event.severity}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {event.data?.anomaly?.reason || event.data?.event?.action || 'Security event detected'}
                              </div>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              event.severity === 'CRITICAL' ? "bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200" :
                              event.severity === 'HIGH' ? "bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200" :
                              "bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                            )}>
                              {event.severity}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(event.timestamp).toLocaleString('he-IL')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Incidents */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle>תקריות אחרונות</CardTitle>
                  <CardDescription>תקריות פתוחות שדורשות טיפול</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {incidents.slice(0, 5).map((incident) => {
                      const authMethod = incident.authMethod || (incident.apiKey ? 'API_KEY' : (incident.user?.id ? 'JWT' : 'UNAUTHENTICATED'));
                      const isAPIKey = authMethod === 'API_KEY';
                      const isJWT = authMethod === 'JWT';
                      
                      return (
                        <div
                          key={incident.id}
                          className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {getStatusIcon(incident.incidentStatus)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-black dark:text-white">
                                  {incident.action} - {incident.resource}
                                </span>
                                <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                                  isAPIKey ? 'bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' :
                                  isJWT ? 'bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400' :
                                  'bg-gray-200 dark:bg-[#1F1F1F] text-gray-600 dark:text-gray-400'
                                )}>
                                  {isAPIKey ? '🔑 API Key' : isJWT ? '🌐 אתר' : '❓ לא מאומת'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {isAPIKey && incident.apiKey && (
                                  <span>מפתח: {incident.apiKey.name}{incident.apiKey.owner && ` (בעל: ${incident.apiKey.owner.name || incident.apiKey.owner.email || `ID: ${incident.apiKey.owner.id}`})`} • </span>
                                )}
                                {isJWT && incident.user && (
                                  <span>משתמש: {incident.user.name || incident.user.email || `ID: ${incident.user.id}`} • </span>
                                )}
                                {incident.userEmail || 'אלמוני'} • {new Date(incident.createdAt).toLocaleString('he-IL')}
                              </div>
                            </div>
                          </div>
                          {incident.priority && (
                            <span className={cn('px-2 py-1 rounded text-xs font-medium border', getPriorityColor(incident.priority))}>
                              {incident.priority}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {incidents.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        אין תקריות פתוחות
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-4">
              {/* Bulk Actions Toolbar */}
              {selectedIncidents.length > 0 && (
                <Card variant="default" className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-black dark:text-white">
                        נבחרו {selectedIncidents.length} תקריות
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleBulkAction('resolve')}>
                          סמן כפתור
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBulkAction('false_positive')}>
                          סמן כחיובי שגוי
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIncidents([])}>
                          ביטול בחירה
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cleanup Tool */}
              <Card variant="default" className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-black dark:text-white mb-1">
                        ניקוי תקריות ישנות
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        סמן תקריות ישנות (מעל 7 ימים) שנוצרו על ידי anomaly detection כחיובי שגוי
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCleanupOldIncidents}
                      className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                    >
                      נקה תקריות ישנות
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card variant="default">
                <CardHeader>
                  <CardTitle>תקריות</CardTitle>
                  <CardDescription>כל התקריות הפתוחות במערכת</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#1F1F1F]">
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-12">
                            <input
                              type="checkbox"
                              checked={selectedIncidents.length === incidents.length && incidents.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIncidents(incidents.map(i => i.id));
                                } else {
                                  setSelectedIncidents([]);
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">תאריך</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">פעולה</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">מקור</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">משתמש/בעל מפתח</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">IP</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">עדיפות</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">סטטוס</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">פעולות</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-[#1F1F1F]">
                        {incidents.map((incident) => {
                          const authMethod = incident.authMethod || (incident.apiKey ? 'API_KEY' : (incident.user?.id ? 'JWT' : 'UNAUTHENTICATED'));
                          const isAPIKey = authMethod === 'API_KEY';
                          const isJWT = authMethod === 'JWT';
                          
                          return (
                            <tr
                              key={incident.id}
                              className={cn(
                                "hover:bg-gray-50 dark:hover:bg-[#1C1C1C] transition-colors",
                                selectedIncidents.includes(incident.id) && "bg-blue-50 dark:bg-blue-950/10 ring-2 ring-blue-500 dark:ring-blue-400"
                              )}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIncidents.includes(incident.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedIncidents([...selectedIncidents, incident.id]);
                                    } else {
                                      setSelectedIncidents(selectedIncidents.filter(id => id !== incident.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                <div className="font-medium">{new Date(incident.createdAt).toLocaleDateString('he-IL')}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">{new Date(incident.createdAt).toLocaleTimeString('he-IL')}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(incident.incidentStatus)}
                                  <div>
                                    <div className="font-medium text-black dark:text-white">{incident.action}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">{incident.resource}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  isAPIKey ? 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300' :
                                  isJWT ? 'bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300' :
                                  'bg-gray-100 dark:bg-[#1C1C1C] text-gray-800 dark:text-gray-400'
                                )}>
                                  {isAPIKey ? '🔑 API Key' : isJWT ? '🌐 אתר' : '❓ לא מאומת'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                {isAPIKey && incident.apiKey ? (
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-blue-700 dark:text-blue-300">
                                      {incident.apiKey.name}
                                    </div>
                                    {incident.apiKey.owner && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        בעל: {incident.apiKey.owner.name || incident.apiKey.owner.email || `ID: ${incident.apiKey.owner.id}`}
                                      </div>
                                    )}
                                  </div>
                                ) : isJWT && incident.user ? (
                                  <div className="font-medium text-purple-700 dark:text-purple-300">
                                    {incident.user.name || incident.user.email || `ID: ${incident.user.id}`}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">{incident.userEmail || 'אלמוני'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">
                                {incident.ipAddress || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {incident.priority && (
                                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', getPriorityColor(incident.priority))}>
                                    {incident.priority}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {incident.incidentStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuickResolve(incident.id, 'RESOLVED')}
                                    className="text-xs h-7"
                                  >
                                    <CheckCircle className="h-3 w-3 ml-1" />
                                    פתור
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuickResolve(incident.id, 'FALSE_POSITIVE')}
                                    className="text-xs h-7"
                                  >
                                    <XCircle className="h-3 w-3 ml-1" />
                                    שגוי
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {incidents.length === 0 && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        אין תקריות
                      </div>
                    )}
                  </div>
                </CardContent>
            </Card>
          </div>
          )}

          {activeTab === 'alerts' && (
            <Card variant="default">
              <CardHeader>
                <CardTitle>התראות אבטחה</CardTitle>
                <CardDescription>התראות אחרונות מהשעות האחרונות</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-[#1F1F1F]">
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">תאריך</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">פעולה</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">מקור</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">משתמש/בעל מפתח</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">IP</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">סטטוס</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#1F1F1F]">
                      {alerts.map((alert) => {
                        const authMethod = alert.authMethod || (alert.apiKey ? 'API_KEY' : (alert.userId ? 'JWT' : 'UNAUTHENTICATED'));
                        const isAPIKey = authMethod === 'API_KEY';
                        const isJWT = authMethod === 'JWT';
                        
                        return (
                          <tr
                            key={alert.id}
                            className="hover:bg-gray-50 dark:hover:bg-[#1C1C1C] transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              <div className="font-medium">{new Date(alert.createdAt).toLocaleDateString('he-IL')}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-500">{new Date(alert.createdAt).toLocaleTimeString('he-IL')}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <div>
                                  <div className="font-medium text-black dark:text-white">{alert.action}</div>
                                  {alert.errorMessage && (
                                    <div className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate max-w-xs" title={alert.errorMessage}>
                                      {alert.errorMessage}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                isAPIKey ? 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300' :
                                isJWT ? 'bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300' :
                                'bg-gray-100 dark:bg-[#1C1C1C] text-gray-800 dark:text-gray-400'
                              )}>
                                {isAPIKey ? '🔑 API Key' : isJWT ? '🌐 אתר' : '❓ לא מאומת'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {isAPIKey && alert.apiKey ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-blue-700 dark:text-blue-300">
                                    {alert.apiKey.name}
                                  </div>
                                  {alert.apiKey.owner && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      בעל: {alert.apiKey.owner.name || alert.apiKey.owner.email || `ID: ${alert.apiKey.owner.id}`}
                                    </div>
                                  )}
                                </div>
                              ) : isJWT && alert.user ? (
                                <div className="font-medium text-purple-700 dark:text-purple-300">
                                  {alert.user.name || alert.user.email || `ID: ${alert.user.id}`}
                                </div>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">{alert.userEmail || 'אלמוני'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">
                              {alert.ipAddress || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                alert.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-300' :
                                alert.status === 'FAILURE' ? 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-300' :
                                'bg-gray-100 dark:bg-[#1C1C1C] text-gray-800 dark:text-gray-400'
                              )}>
                                {alert.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex gap-2">
                                {alert.ipAddress && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setBlockIPValue(alert.ipAddress!);
                                      setShowBlockIP(true);
                                      setActiveTab('tools');
                                    }}
                                    className="text-xs h-7"
                                  >
                                    <Ban className="h-3 w-3 ml-1" />
                                    חסום
                                  </Button>
                                )}
                                {alert.details?.correlationId && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyCorrelationId(alert)}
                                    className="text-xs h-7"
                                  >
                                    <Copy className="h-3 w-3 ml-1" />
                                    ID
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                    {alerts.length === 0 && (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        אין התראות
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              {/* Quick Actions Toolbox */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    פעולות מהירות
                  </CardTitle>
                  <CardDescription>כלי עבודה נפוצים לניהול תקריות</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <button
                      onClick={() => setShowBlockIP(!showBlockIP)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">חסום IP</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">חסום כתובת IP מיידית</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowUserLookup(!showUserLookup)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <UserSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">חיפוש משתמש</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">חפש פעילות משתמש</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowIPLookup(!showIPLookup)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">חיפוש IP</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">בדוק כתובת IP</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">ייצא CSV</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">ייצא יומן פעילות</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('incidents')}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">תקריות פתוחות</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">צפה בכל התקריות</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('blacklist')}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#1F1F1F] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">רשימה שחורה</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">נהל IPs חסומים</div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Block IP Tool */}
              {showBlockIP && (
                <Card variant="default" className="border-red-200 dark:border-red-900">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                        חסום כתובת IP
                      </span>
                      <button onClick={() => setShowBlockIP(false)}>
                        <X className="h-4 w-4" />
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-black dark:text-white mb-1 block">כתובת IP</label>
                      <input
                        type="text"
                        value={blockIPValue}
                        onChange={(e) => setBlockIPValue(e.target.value)}
                        placeholder="192.168.1.1"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-black dark:text-white mb-1 block">סיבה (אופציונלי)</label>
                      <input
                        type="text"
                        value={blockIPReason}
                        onChange={(e) => setBlockIPReason(e.target.value)}
                        placeholder="סיבת החסימה"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-black dark:text-white mb-1 block">משך החסימה</label>
                      <select
                        value={blockDuration}
                        onChange={(e) => setBlockDuration(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white mb-2"
                      >
                        <option value="permanent">צמיתות</option>
                        <option value="1h">שעה אחת</option>
                        <option value="24h">24 שעות</option>
                        <option value="7d">7 ימים</option>
                        <option value="30d">30 ימים</option>
                        <option value="custom">תאריך מותאם אישית</option>
                      </select>
                      {blockDuration === 'custom' && (
                        <input
                          type="datetime-local"
                          value={blockExpiration}
                          onChange={(e) => setBlockExpiration(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white mt-2"
                        />
                      )}
                    </div>
                    <Button onClick={handleBlockIP} className="w-full">
                      חסום IP
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* User Lookup Tool */}
              {showUserLookup && (
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <UserSearch className="h-5 w-5" />
                        חיפוש משתמש
                      </span>
                      <button onClick={() => setShowUserLookup(false)}>
                        <X className="h-4 w-4" />
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userLookupValue}
                        onChange={(e) => setUserLookupValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUserLookup()}
                        placeholder="אימייל או שם משתמש"
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      />
                      <Button onClick={handleUserLookup}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    {userLookupResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {userLookupResults.map((result, idx) => (
                          <div key={idx} className="p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]">
                            <div className="text-sm font-medium text-black dark:text-white">
                              {result.name || result.userEmail || result.email}
                            </div>
                            {result.action && (
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {result.action} - {new Date(result.createdAt).toLocaleString('he-IL')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* IP Lookup Tool */}
              {showIPLookup && (
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        חיפוש IP
                      </span>
                      <button onClick={() => setShowIPLookup(false)}>
                        <X className="h-4 w-4" />
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={ipLookupValue}
                        onChange={(e) => setIPLookupValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleIPLookup()}
                        placeholder="192.168.1.1"
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      />
                      <Button onClick={handleIPLookup}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    {ipLookupResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {ipLookupResults[0]?.isBlocked && (
                          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                            <div className="text-sm font-medium text-red-700 dark:text-red-400">
                              ⚠️ IP חסום
                            </div>
                            {ipLookupResults[0].reason && (
                              <div className="text-xs text-red-600 dark:text-red-500 mt-1">
                                סיבה: {ipLookupResults[0].reason}
                              </div>
                            )}
                          </div>
                        )}
                        {ipLookupResults.slice(1).map((result, idx) => (
                          <div key={idx} className="p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#1F1F1F]">
                            <div className="text-sm font-medium text-black dark:text-white">
                              {result.action || 'פעילות'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {result.userEmail || 'אלמוני'} • {new Date(result.createdAt).toLocaleString('he-IL')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          )}

          {activeTab === 'blacklist' && (
            <div className="space-y-4">
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                    רשימת IPs חסומים
                  </CardTitle>
                  <CardDescription>ניהול כתובות IP חסומות במערכת</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {blockedIPs.filter(ip => ip.isActive).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        אין IPs חסומים
                      </div>
                    ) : (
                      blockedIPs
                        .filter(ip => ip.isActive) // Only show active blocks
                        .map((blockedIP) => {
                        const isExpired = blockedIP.expiresAt && new Date(blockedIP.expiresAt) < new Date();
                        const expiresSoon = blockedIP.expiresAt && 
                          new Date(blockedIP.expiresAt) > new Date() && 
                          new Date(blockedIP.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
                        
                        return (
                          <div
                            key={blockedIP.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-md border",
                              isExpired 
                                ? "bg-gray-50 dark:bg-[#080808] border-gray-200 dark:border-[#1F1F1F] opacity-60"
                                : expiresSoon
                                ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <Ban className={cn(
                                "h-5 w-5",
                                isExpired 
                                  ? "text-gray-400 dark:text-gray-600"
                                  : "text-red-600 dark:text-red-400"
                              )} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-black dark:text-white font-mono">
                                    {blockedIP.ipAddress}
                                  </span>
                                  {isExpired && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-[#1F1F1F] text-gray-600 dark:text-gray-400">
                                      פג תוקף
                                    </span>
                                  )}
                                  {expiresSoon && !isExpired && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-amber-200 dark:bg-amber-900 text-amber-700 dark:text-amber-400">
                                      פג תוקף בקרוב
                                    </span>
                                  )}
                                  {!blockedIP.expiresAt && (
                                    <span className="px-2 py-0.5 rounded text-xs bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-400">
                                      צמיתות
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {blockedIP.reason && (
                                    <span>סיבה: {blockedIP.reason} • </span>
                                  )}
                                  נחסם ב: {new Date(blockedIP.blockedAt).toLocaleString('he-IL')}
                                  {blockedIP.expiresAt && !isExpired && (
                                    <span> • פג תוקף: {new Date(blockedIP.expiresAt).toLocaleString('he-IL')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnblockIP(blockedIP.ipAddress)}
                                className="text-xs"
                              >
                                <X className="h-3 w-3 ml-1" />
                                הסר חסימה
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {blockedIPs.filter(ip => !ip.isActive).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#1F1F1F]">
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        IPs שהוסרו מהחסימה ({blockedIPs.filter(ip => !ip.isActive).length})
                      </div>
                      <div className="space-y-2">
                        {blockedIPs
                          .filter(ip => !ip.isActive)
                          .map((blockedIP) => (
                            <div
                              key={blockedIP.id}
                              className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] opacity-60"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-gray-500 dark:text-gray-500">
                                  {blockedIP.ipAddress}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-600">
                                  הוסר ב: {new Date(blockedIP.blockedAt).toLocaleString('he-IL')}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}


          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filters */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    מסננים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">פעולה</label>
                      <select
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      >
                        <option value="">הכל</option>
                        <option value="LOGIN_FAILED">כשלון התחברות</option>
                        <option value="AUTH_FAILED">כשלון אימות</option>
                        <option value="UNAUTHORIZED_ACCESS">גישה לא מורשית</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">סטטוס</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      >
                        <option value="">הכל</option>
                        <option value="SUCCESS">הצלחה</option>
                        <option value="FAILURE">כשלון</option>
                        <option value="ERROR">שגיאה</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">שיטת אימות</label>
                      <select
                        value={filters.authMethod}
                        onChange={(e) => setFilters({ ...filters, authMethod: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      >
                        <option value="">הכל</option>
                        <option value="API_KEY">🔑 דרך API Key</option>
                        <option value="JWT">🌐 דרך אתר</option>
                        <option value="UNAUTHENTICATED">❓ לא מאומת</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">מספר רשומות</label>
                      <select
                        value={filters.limit}
                        onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      >
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">ID מפתח API</label>
                      <input
                        type="number"
                        value={filters.apiKeyId}
                        onChange={(e) => setFilters({ ...filters, apiKeyId: e.target.value })}
                        placeholder="סינון לפי ID מפתח API"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">ID בעל מפתח API</label>
                      <input
                        type="number"
                        value={filters.apiKeyOwnerId}
                        onChange={(e) => setFilters({ ...filters, apiKeyOwnerId: e.target.value })}
                        placeholder="סינון לפי בעל המפתח"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">Correlation ID</label>
                      <input
                        type="text"
                        value={filters.correlationId}
                        onChange={(e) => setFilters({ ...filters, correlationId: e.target.value })}
                        placeholder="חיפוש לפי Correlation ID"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#1F1F1F] rounded-md bg-white dark:bg-[#080808] text-black dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Analytics Charts */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Activity Over Time Chart */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      פעילות לפי זמן
                    </CardTitle>
                    <CardDescription className="text-xs">טרנד פעילות (24 שעות)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minHeight: '200px', width: '100%' }}>
                      <LineChartComponent
                        data={activityLogHourlyData}
                        xKey="time"
                        yKeys={[{ key: 'פעילות', label: 'פעילות', color: '#3B82F6' }]}
                        height={200}
                        showLegend={false}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Actions Distribution */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      התפלגות פעולות
                    </CardTitle>
                    <CardDescription className="text-xs">פעולות נפוצות</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minHeight: '200px', width: '100%' }}>
                      {actionDistributionData.length > 0 ? (
                        <BarChartComponent
                          data={actionDistributionData}
                          xKey="פעולה"
                          yKeys={[{ key: 'כמות', label: 'כמות', color: '#8B5CF6' }]}
                          height={200}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-gray-500 dark:text-gray-400 text-xs">
                          אין נתונים
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card variant="default">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                      התפלגות סטטוסים
                    </CardTitle>
                    <CardDescription className="text-xs">סטטוס פעילות</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minHeight: '200px', width: '100%' }}>
                      {activityLogStatusData.length > 0 ? (
                        <PieChartComponent
                          data={activityLogStatusData}
                          nameKey="סטטוס"
                          valueKey="כמות"
                          height={200}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-gray-500 dark:text-gray-400 text-xs">
                          אין נתונים
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Logs Table */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    יומן פעילות
                  </CardTitle>
                  <CardDescription>רשימת כל הפעולות במערכת ({logs.length} רשומות)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-[#1F1F1F]">
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">תאריך/שעה</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">פעולה</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">מקור</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">משתמש/בעל מפתח</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">IP</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">סטטוס</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">זמן תגובה</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">פרטים</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-[#1F1F1F]" data-audit-logs-container>
                        {logs.map((log) => {
                          const authMethod = log.authMethod || (log.apiKey ? 'API_KEY' : (log.userId ? 'JWT' : 'UNAUTHENTICATED'));
                          const isAPIKey = authMethod === 'API_KEY';
                          const isJWT = authMethod === 'JWT';
                          
                          return (
                            <tr 
                              key={log.id}
                              data-log-id={log.id}
                              className={cn(
                                "hover:bg-gray-50 dark:hover:bg-[#1C1C1C] transition-colors",
                                log.isPinned && "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 dark:border-yellow-400 shadow-sm"
                              )}
                            >
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {log.isPinned && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500 dark:bg-yellow-600 text-white text-xs font-semibold rounded-full">
                                      <Pin className="h-3 w-3" />
                                      מוצמד
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium">{new Date(log.createdAt).toLocaleDateString('he-IL')}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">{new Date(log.createdAt).toLocaleTimeString('he-IL')}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {log.isPinned && (
                                    <Pin className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" title="רשומה מוצמדת" />
                                  )}
                                  <span className={cn(
                                    "font-medium",
                                    log.isPinned ? "text-yellow-900 dark:text-yellow-200" : "text-black dark:text-white"
                                  )}>{log.action}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-500">{log.resource}</span>
                                  {log.httpMethod && log.httpPath && (
                                    <span className="text-xs font-mono text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-[#1C1C1C] px-1.5 py-0.5 rounded">
                                      {log.httpMethod} {log.httpPath}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  isAPIKey ? 'bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300' :
                                  isJWT ? 'bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300' :
                                  'bg-gray-100 dark:bg-[#1C1C1C] text-gray-800 dark:text-gray-400'
                                )}>
                                  {isAPIKey ? '🔑 API Key' : isJWT ? '🌐 אתר' : '❓ לא מאומת'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                {isAPIKey && log.apiKey ? (
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-blue-700 dark:text-blue-300">
                                      {log.apiKey.name}
                                    </div>
                                    {log.apiKey.owner && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        בעל: {log.apiKey.owner.name || log.apiKey.owner.email || `ID: ${log.apiKey.owner.id}`}
                                      </div>
                                    )}
                                    {log.user && log.user.id !== log.apiKey.owner?.id && (
                                      <div className="text-xs text-amber-600 dark:text-amber-400">
                                        בוצע על ידי: {log.user.name || log.user.email || `ID: ${log.user.id}`}
                                      </div>
                                    )}
                                  </div>
                                ) : isJWT && log.user ? (
                                  <div className="space-y-0.5">
                                    <div className="font-medium text-purple-700 dark:text-purple-300">
                                      {log.user.name || log.user.email || `ID: ${log.user.id}`}
                                    </div>
                                    {log.user.email && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">{log.user.email}</div>
                                    )}
                                    {log.user.isAdmin && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400">
                                        מנהל
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">אלמוני</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">
                                {log.ipAddress || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  log.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-300' :
                                  log.status === 'FAILURE' ? 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-300' :
                                  'bg-gray-100 dark:bg-[#1C1C1C] text-gray-800 dark:text-gray-400'
                                )}>
                                  {log.status}
                                </span>
                                {log.errorMessage && (
                                  <div className="mt-1 text-xs text-red-600 dark:text-red-400 truncate max-w-xs" title={log.errorMessage}>
                                    {log.errorMessage}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                {log.responseTime !== undefined ? (
                                  <span className={cn(
                                    log.responseTime > 1000 ? 'text-red-600 dark:text-red-400' :
                                    log.responseTime > 500 ? 'text-amber-600 dark:text-amber-400' :
                                    'text-gray-600 dark:text-gray-400'
                                  )}>
                                    {log.responseTime}ms
                                  </span>
                                ) : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex gap-2">
                                  {log.isPinned ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUnpinLog(log.id)}
                                      className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 text-xs h-7"
                                      title="הסר הצמדה"
                                    >
                                      <PinOff className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handlePinLog(log.id)}
                                      className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xs h-7"
                                      title="הצמד רשומה"
                                    >
                                      <Pin className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {(log.details?.correlationId || log.details?.queryParams || log.details?.requestBody || log.userAgent || log.requestSize || log.responseSize) ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setSelectedLogDetails(log.id)}
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs h-7"
                                    >
                                      <Eye className="h-3 w-3 ml-1" />
                                      פרטים
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                                  )}
                                  {log.ipAddress && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setBlockIPValue(log.ipAddress!);
                                        setShowBlockIP(true);
                                        setActiveTab('tools');
                                      }}
                                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs h-7"
                                      title="חסום IP"
                                    >
                                      <Ban className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Modal for log details - outside the table */}
                    {selectedLogDetails && (() => {
                      const log = logs.find(l => l.id === selectedLogDetails);
                      if (!log) return null;
                      return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedLogDetails(null)}>
                          <div className="bg-white dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-black dark:text-white">פרטי הבקשה</h3>
                              <button
                                onClick={() => setSelectedLogDetails(null)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                            <div className="space-y-4 text-sm">
                              {log.details?.correlationId && (
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Correlation ID</div>
                                  <div className="font-mono bg-gray-100 dark:bg-[#1C1C1C] p-3 rounded flex items-center justify-between gap-2">
                                    <span className="break-all flex-1">{log.details.correlationId}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        navigator.clipboard.writeText(log.details.correlationId);
                                        alert('הועתק ללוח');
                                      }}
                                      className="h-8 w-8 p-0 flex-shrink-0"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {log.details?.queryParams && (
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Query Params</div>
                                  <pre className="bg-gray-100 dark:bg-[#1C1C1C] p-3 rounded overflow-x-auto text-xs">
                                    {JSON.stringify(log.details.queryParams, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.details?.requestBody && (
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Request Body</div>
                                  <pre className="bg-gray-100 dark:bg-[#1C1C1C] p-3 rounded overflow-x-auto text-xs">
                                    {JSON.stringify(log.details.requestBody, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.userAgent && (
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">User Agent</div>
                                  <div className="bg-gray-100 dark:bg-[#1C1C1C] p-3 rounded text-xs break-all">
                                    {log.userAgent}
                                  </div>
                                </div>
                              )}
                              {log.requestSize && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">גודל בקשה:</span> {log.requestSize.toLocaleString()} bytes
                                </div>
                              )}
                              {log.responseSize && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">גודל תגובה:</span> {log.responseSize.toLocaleString()} bytes
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {logs.length === 0 && !isLoading && (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                        <div className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
                          אין רשומות
                        </div>
                        <div className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                          {filters.action || filters.status || filters.authMethod || filters.apiKeyId || filters.apiKeyOwnerId || filters.correlationId
                            ? 'לא נמצאו רשומות התואמות למסננים שנבחרו'
                            : 'אין פעילות רשומה במערכת כרגע. נסה לבצע פעולות במערכת כדי לראות יומני פעילות.'}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mb-4 space-y-1">
                          <div>💡 טיפ: כל בקשות API נרשמות אוטומטית</div>
                          <div>💡 נסה לעדכן משתמש, ליצור רשומה, או לגשת לדפים שונים</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFilters({
                              action: '',
                              status: '',
                              priority: '',
                              authMethod: '',
                              apiKeyId: '',
                              apiKeyOwnerId: '',
                              correlationId: '',
                              limit: 50,
                            });
                            loadData();
                          }}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          נקה מסננים וטען מחדש
                        </Button>
                      </div>
                    )}
                    {isLoading && logs.length === 0 && (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#1F1F1F] border-t-gray-900 dark:border-t-[#FAFAFA] mx-auto"></div>
                        <div className="text-gray-500 dark:text-gray-400 mt-4">טוען נתונים...</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
