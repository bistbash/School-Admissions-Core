import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Activity, Download, Filter, X, CheckCircle, Clock, XCircle, AlertCircle, Ban, Search, Zap, UserSearch, Globe, Wrench, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { apiClient } from '../../shared/lib/api';
import { cn } from '../../shared/lib/utils';

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

export function SOCPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'logs' | 'alerts' | 'blacklist' | 'tools'>('overview');
  const [stats, setStats] = useState<SOCStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    priority: '',
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

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  useEffect(() => {
    if (activeTab === 'blacklist') {
      loadBlockedIPs();
    }
  }, [activeTab]);

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
        setIncidents(incidentsRes.data.logs || []);
      } else if (activeTab === 'incidents') {
        const res = await apiClient.get('/soc/incidents?limit=100');
        setIncidents(res.data.logs || []);
      } else if (activeTab === 'alerts') {
        const res = await apiClient.get('/soc/alerts?limit=50');
        setAlerts(res.data || []);
      } else if (activeTab === 'blacklist') {
        await loadBlockedIPs();
      } else if (activeTab === 'logs') {
        const params = new URLSearchParams();
        if (filters.action) params.append('action', filters.action);
        if (filters.status) params.append('status', filters.status);
        params.append('limit', filters.limit.toString());
        const res = await apiClient.get(`/soc/audit-logs?${params.toString()}`);
        setLogs(res.data.logs || []);
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
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#262626] border-gray-200 dark:border-[#333333]';
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
      for (const id of selectedIncidents) {
        if (action === 'resolve') {
          await apiClient.put(`/soc/incidents/${id}`, { incidentStatus: 'RESOLVED' });
        } else if (action === 'false_positive') {
          await apiClient.put(`/soc/incidents/${id}`, { incidentStatus: 'FALSE_POSITIVE' });
        }
      }
      setSelectedIncidents([]);
      loadData();
      alert(`בוצעה פעולה על ${selectedIncidents.length} תקריות`);
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

  return (
    <div className="space-y-8 animate-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6" />
            מרכז אבטחה (SOC)
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ניטור וניהול אירועי אבטחה
          </p>
        </div>
        {activeTab === 'logs' && (
          <div className="flex gap-2">
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
      <div className="flex gap-2 border-b border-gray-200 dark:border-[#333333]">
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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card variant="default">
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
                  </CardContent>
                </Card>

                <Card variant="default">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      תקרית פתוחות
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium text-black dark:text-white">
                      {stats.openIncidents}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="default">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      כשלונות אחרונים
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium text-black dark:text-white">
                      {stats.recentFailures}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="default">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      גישה לא מורשית
                    </CardTitle>
                    <Shield className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-medium text-black dark:text-white">
                      {stats.recentUnauthorized}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Incidents */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle>תקריות אחרונות</CardTitle>
                  <CardDescription>תקריות פתוחות שדורשות טיפול</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {incidents.slice(0, 5).map((incident) => (
                      <div
                        key={incident.id}
                        className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(incident.incidentStatus)}
                          <div>
                            <div className="text-sm font-medium text-black dark:text-white">
                              {incident.action} - {incident.resource}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
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
                    ))}
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

              <Card variant="default">
                <CardHeader>
                  <CardTitle>תקריות</CardTitle>
                  <CardDescription>כל התקריות הפתוחות במערכת</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]",
                          selectedIncidents.includes(incident.id) && "ring-2 ring-blue-500 dark:ring-blue-400"
                        )}
                      >
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
                          className="ml-3"
                        />
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(incident.incidentStatus)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-black dark:text-white">
                              {incident.action}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {incident.resource}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {incident.userEmail || 'אלמוני'} • {incident.ipAddress} • {new Date(incident.createdAt).toLocaleString('he-IL')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {incident.priority && (
                            <span className={cn('px-2 py-1 rounded text-xs font-medium border', getPriorityColor(incident.priority))}>
                              {incident.priority}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {incident.incidentStatus}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickResolve(incident.id, 'RESOLVED')}
                            className="text-xs"
                          >
                            <CheckCircle className="h-3 w-3 ml-1" />
                            פתור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickResolve(incident.id, 'FALSE_POSITIVE')}
                            className="text-xs"
                          >
                            <XCircle className="h-3 w-3 ml-1" />
                            חיובי שגוי
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {incidents.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-medium text-black dark:text-white">
                              {alert.action}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded text-xs', alert.status === 'FAILURE' ? 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'bg-gray-200 dark:bg-[#333333] text-gray-700 dark:text-gray-300')}>
                              {alert.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {alert.userEmail || 'אלמוני'} • {alert.ipAddress} • {new Date(alert.createdAt).toLocaleString('he-IL')}
                          </div>
                          {alert.errorMessage && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {alert.errorMessage}
                            </div>
                          )}
                        </div>
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
                              className="text-xs"
                            >
                              <Ban className="h-3 w-3 ml-1" />
                              חסום IP
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyCorrelationId(alert)}
                            className="text-xs"
                          >
                            <Copy className="h-3 w-3 ml-1" />
                            העתק ID
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">חסום IP</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">חסום כתובת IP מיידית</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowUserLookup(!showUserLookup)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <UserSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">חיפוש משתמש</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">חפש פעילות משתמש</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowIPLookup(!showIPLookup)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">חיפוש IP</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">בדוק כתובת IP</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleExport('csv')}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">ייצא CSV</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">ייצא יומן פעילות</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('incidents')}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <div className="flex-1">
                        <div className="font-medium text-black dark:text-white">תקריות פתוחות</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">צפה בכל התקריות</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('blacklist')}
                      className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-[#1C1C1C] transition-colors text-right"
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
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-black dark:text-white mb-1 block">סיבה (אופציונלי)</label>
                      <input
                        type="text"
                        value={blockIPReason}
                        onChange={(e) => setBlockIPReason(e.target.value)}
                        placeholder="סיבת החסימה"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-black dark:text-white mb-1 block">משך החסימה</label>
                      <select
                        value={blockDuration}
                        onChange={(e) => setBlockDuration(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white mb-2"
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
                          className="w-full px-3 py-2 border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white mt-2"
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
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
                      />
                      <Button onClick={handleUserLookup}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    {userLookupResults.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {userLookupResults.map((result, idx) => (
                          <div key={idx} className="p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
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
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
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
                          <div key={idx} className="p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
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
                                ? "bg-gray-50 dark:bg-[#1C1C1C] border-gray-200 dark:border-[#333333] opacity-60"
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
                                    <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-[#333333] text-gray-600 dark:text-gray-400">
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
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#333333]">
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        IPs שהוסרו מהחסימה ({blockedIPs.filter(ip => !ip.isActive).length})
                      </div>
                      <div className="space-y-2">
                        {blockedIPs
                          .filter(ip => !ip.isActive)
                          .map((blockedIP) => (
                            <div
                              key={blockedIP.id}
                              className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-[#1C1C1C] border border-gray-200 dark:border-[#333333] opacity-60"
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
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">פעולה</label>
                      <select
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
                      >
                        <option value="">הכל</option>
                        <option value="SUCCESS">הצלחה</option>
                        <option value="FAILURE">כשלון</option>
                        <option value="ERROR">שגיאה</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">מספר רשומות</label>
                      <select
                        value={filters.limit}
                        onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#333333] rounded-md bg-white dark:bg-[#1C1C1C] text-black dark:text-white"
                      >
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Logs Table */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle>יומן פעילות</CardTitle>
                  <CardDescription>רשימת כל הפעולות במערכת</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-black dark:text-white">
                                {log.action}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                {log.resource}
                              </span>
                              <span className={cn('px-2 py-0.5 rounded text-xs', log.status === 'FAILURE' ? 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400' : log.status === 'SUCCESS' ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-[#333333] text-gray-700 dark:text-gray-300')}>
                                {log.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {log.userEmail || 'אלמוני'} • {log.ipAddress} • {new Date(log.createdAt).toLocaleString('he-IL')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        אין רשומות
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
