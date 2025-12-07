import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

interface AuditLog {
  id: number;
  userId?: number;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: number;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
  incidentStatus?: string;
  priority?: string;
  assignedTo?: number;
  analystNotes?: string;
  resolvedAt?: string;
  resolvedBy?: number;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byResource: Record<string, number>;
  byStatus: Record<string, number>;
  byUser: Record<string, number>;
  recentFailures: number;
  recentUnauthorized: number;
  byIncidentStatus?: Record<string, number>;
  byPriority?: Record<string, number>;
  unassignedIncidents?: number;
  openIncidents?: number;
}

export function SOCDashboard() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'logs' | 'stats' | 'alerts'>('incidents');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [incidents, setIncidents] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [alerts, setAlerts] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<AuditLog | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AuditLog | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [blockIPForm, setBlockIPForm] = useState({ reason: '', expiresAt: '' });
  
  // Filters for audit logs
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    status: '',
    incidentStatus: '',
    priority: '',
    userEmail: '',
    limit: '50',
  });

  // Incident management form
  const [incidentForm, setIncidentForm] = useState({
    incidentStatus: '',
    priority: '',
    analystNotes: '',
  });

  // Fetch open incidents
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<AuditLog[]>('/soc/incidents', {
        params: { limit: 100 },
      });
      setIncidents(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת אירועים');
    } finally {
      setLoading(false);
    }
  };

  // Fetch audit logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (filters.action) params.action = filters.action;
      if (filters.resource) params.resource = filters.resource;
      if (filters.status) params.status = filters.status;
      if (filters.incidentStatus) params.incidentStatus = filters.incidentStatus;
      if (filters.priority) params.priority = filters.priority;
      if (filters.userEmail) params.userEmail = filters.userEmail;
      if (filters.limit) params.limit = parseInt(filters.limit);

      const response = await apiClient.get<AuditLogsResponse>('/soc/audit-logs', { params });
      setLogs(response.data.logs);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת לוגים');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<AuditStats>('/soc/stats');
      setStats(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת סטטיסטיקות');
    } finally {
      setLoading(false);
    }
  };

  // Fetch security alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<AuditLog[]>('/soc/alerts', {
        params: { limit: 50 },
      });
      setAlerts(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בטעינת התראות');
    } finally {
      setLoading(false);
    }
  };

  // Mark log as incident
  const markAsIncident = async (logId: number, priority: string) => {
    try {
      setError(null);
      await apiClient.post(`/soc/incidents/${logId}/mark`, { priority });
      await fetchIncidents();
      await fetchLogs();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בסימון כאירוע');
    }
  };

  // Update incident
  const updateIncident = async (logId: number) => {
    try {
      setError(null);
      const updateData: any = {};
      if (incidentForm.incidentStatus) updateData.incidentStatus = incidentForm.incidentStatus;
      if (incidentForm.priority) updateData.priority = incidentForm.priority;
      if (incidentForm.analystNotes) updateData.analystNotes = incidentForm.analystNotes;

      await apiClient.put(`/soc/incidents/${logId}`, updateData);
      setShowIncidentModal(false);
      setSelectedIncident(null);
      await fetchIncidents();
      await fetchLogs();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בעדכון אירוע');
    }
  };

  // Block IP address
  const blockIP = async (ipAddress: string) => {
    try {
      setError(null);
      const blockData: any = { ipAddress };
      if (blockIPForm.reason) blockData.reason = blockIPForm.reason;
      if (blockIPForm.expiresAt) blockData.expiresAt = blockIPForm.expiresAt;

      await apiClient.post('/soc/block-ip', blockData);
      setShowAlertModal(false);
      setSelectedAlert(null);
      setBlockIPForm({ reason: '', expiresAt: '' });
      await fetchAlerts();
      alert(`כתובת IP ${ipAddress} נחסמה בהצלחה`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'שגיאה בחסימת IP');
    }
  };

  // Open alert details modal
  const openAlertModal = (alert: AuditLog) => {
    setSelectedAlert(alert);
    setBlockIPForm({ reason: '', expiresAt: '' });
    setShowAlertModal(true);
  };

  // Open incident modal
  const openIncidentModal = (incident: AuditLog) => {
    setSelectedIncident(incident);
    setIncidentForm({
      incidentStatus: incident.incidentStatus || '',
      priority: incident.priority || '',
      analystNotes: incident.analystNotes || '',
    });
    setShowIncidentModal(true);
  };

  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchIncidents();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'alerts') {
      fetchAlerts();
    }
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('he-IL');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'text-green-600 bg-green-50';
      case 'FAILURE':
        return 'text-red-600 bg-red-50';
      case 'ERROR':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getIncidentStatusColor = (status?: string) => {
    switch (status) {
      case 'NEW':
        return 'text-blue-600 bg-blue-50';
      case 'INVESTIGATING':
        return 'text-yellow-600 bg-yellow-50';
      case 'RESOLVED':
        return 'text-green-600 bg-green-50';
      case 'FALSE_POSITIVE':
        return 'text-gray-600 bg-gray-50';
      case 'ESCALATED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-400 bg-gray-50';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'HIGH':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'MEDIUM':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'LOW':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      LOGIN: 'התחברות',
      LOGOUT: 'התנתקות',
      LOGIN_FAILED: 'התחברות נכשלה',
      REGISTER: 'הרשמה',
      CREATE: 'יצירה',
      UPDATE: 'עדכון',
      DELETE: 'מחיקה',
      READ: 'קריאה',
      READ_LIST: 'קריאת רשימה',
      AUTH_FAILED: 'אימות נכשל',
      TOKEN_EXPIRED: 'טוקן פג תוקף',
      UNAUTHORIZED_ACCESS: 'גישה לא מורשית',
    };
    return labels[action] || action;
  };

  const getResourceLabel = (resource: string) => {
    const labels: Record<string, string> = {
      AUTH: 'אימות',
      SOLDIER: 'חייל',
      DEPARTMENT: 'מחלקה',
      ROLE: 'תפקיד',
      ROOM: 'חדר',
      AUDIT_LOG: 'לוג ביקורת',
      SYSTEM: 'מערכת',
    };
    return labels[resource] || resource;
  };

  const getIncidentStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      NEW: 'חדש',
      INVESTIGATING: 'בבדיקה',
      RESOLVED: 'נפתר',
      FALSE_POSITIVE: 'חיובי כוזב',
      ESCALATED: 'הועלה',
    };
    return status ? labels[status] || status : 'ללא סטטוס';
  };

  const getPriorityLabel = (priority?: string) => {
    const labels: Record<string, string> = {
      CRITICAL: 'קריטי',
      HIGH: 'גבוה',
      MEDIUM: 'בינוני',
      LOW: 'נמוך',
    };
    return priority ? labels[priority] || priority : 'ללא עדיפות';
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">מרכז ביטחון (SOC)</h2>
          <p className="text-gray-500 mt-1">ניהול אירועים וניטור אבטחה</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('incidents');
              fetchIncidents();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'incidents'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            אירועים פתוחים
            {stats?.openIncidents && stats.openIncidents > 0 && (
              <span className="mr-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {stats.openIncidents}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('logs');
              fetchLogs();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'logs'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            לוגי ביקורת
          </button>
          <button
            onClick={() => {
              setActiveTab('stats');
              fetchStats();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            סטטיסטיקות
          </button>
          <button
            onClick={() => {
              setActiveTab('alerts');
              fetchAlerts();
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            התראות אבטחה
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">אירועים פתוחים</h3>
                <p className="text-sm text-gray-600 mt-1">
                  אירועים הדורשים טיפול - סטטוס: חדש, בבדיקה, או הועלה
                </p>
              </div>
              {stats && (
                <div className="text-left">
                  <div className="text-2xl font-bold text-red-600">{stats.openIncidents || 0}</div>
                  <div className="text-sm text-gray-600">אירועים פתוחים</div>
                  {stats.unassignedIncidents && stats.unassignedIncidents > 0 && (
                    <div className="text-sm text-orange-600 mt-1">
                      {stats.unassignedIncidents} לא מוקצים
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border-b font-semibold text-gray-600">תאריך</th>
                    <th className="p-3 border-b font-semibold text-gray-600">פעולה</th>
                    <th className="p-3 border-b font-semibold text-gray-600">משתמש</th>
                    <th className="p-3 border-b font-semibold text-gray-600">עדיפות</th>
                    <th className="p-3 border-b font-semibold text-gray-600">סטטוס אירוע</th>
                    <th className="p-3 border-b font-semibold text-gray-600">כתובת IP</th>
                    <th className="p-3 border-b font-semibold text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        טוען...
                      </td>
                    </tr>
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        אין אירועים פתוחים 🎉
                      </td>
                    </tr>
                  ) : (
                    incidents.map((incident) => (
                      <tr
                        key={incident.id}
                        className={`border-b hover:bg-gray-50 transition-colors ${
                          incident.priority === 'CRITICAL' ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="p-3 text-sm">{formatDate(incident.createdAt)}</td>
                        <td className="p-3 text-sm font-medium">
                          {getActionLabel(incident.action)}
                          <br />
                          <span className="text-xs text-gray-500">
                            {getResourceLabel(incident.resource)}
                            {incident.resourceId && ` #${incident.resourceId}`}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {incident.userEmail || incident.userId || 'אנונימי'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                              incident.priority
                            )}`}
                          >
                            {getPriorityLabel(incident.priority)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getIncidentStatusColor(
                              incident.incidentStatus
                            )}`}
                          >
                            {getIncidentStatusLabel(incident.incidentStatus)}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-mono text-gray-600">
                          {incident.ipAddress || '-'}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => openIncidentModal(incident)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            ניהול
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">סינון לוגים</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">פעולה</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">הכל</option>
                  <option value="LOGIN">התחברות</option>
                  <option value="LOGIN_FAILED">התחברות נכשלה</option>
                  <option value="REGISTER">הרשמה</option>
                  <option value="CREATE">יצירה</option>
                  <option value="UPDATE">עדכון</option>
                  <option value="DELETE">מחיקה</option>
                  <option value="READ">קריאה</option>
                  <option value="AUTH_FAILED">אימות נכשל</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">משאב</label>
                <select
                  value={filters.resource}
                  onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">הכל</option>
                  <option value="AUTH">אימות</option>
                  <option value="SOLDIER">חייל</option>
                  <option value="DEPARTMENT">מחלקה</option>
                  <option value="ROLE">תפקיד</option>
                  <option value="ROOM">חדר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">הכל</option>
                  <option value="SUCCESS">הצלחה</option>
                  <option value="FAILURE">כישלון</option>
                  <option value="ERROR">שגיאה</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס אירוע</label>
                <select
                  value={filters.incidentStatus}
                  onChange={(e) => setFilters({ ...filters, incidentStatus: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">הכל</option>
                  <option value="NEW">חדש</option>
                  <option value="INVESTIGATING">בבדיקה</option>
                  <option value="RESOLVED">נפתר</option>
                  <option value="FALSE_POSITIVE">חיובי כוזב</option>
                  <option value="ESCALATED">הועלה</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עדיפות</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">הכל</option>
                  <option value="CRITICAL">קריטי</option>
                  <option value="HIGH">גבוה</option>
                  <option value="MEDIUM">בינוני</option>
                  <option value="LOW">נמוך</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אימייל משתמש</label>
                <input
                  type="text"
                  value={filters.userEmail}
                  onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
                  placeholder="חיפוש לפי אימייל"
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מספר תוצאות</label>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={fetchLogs}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'טוען...' : 'חפש'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border-b font-semibold text-gray-600">תאריך</th>
                    <th className="p-3 border-b font-semibold text-gray-600">משתמש</th>
                    <th className="p-3 border-b font-semibold text-gray-600">פעולה</th>
                    <th className="p-3 border-b font-semibold text-gray-600">משאב</th>
                    <th className="p-3 border-b font-semibold text-gray-600">סטטוס</th>
                    <th className="p-3 border-b font-semibold text-gray-600">כתובת IP</th>
                    <th className="p-3 border-b font-semibold text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        טוען...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        אין תוצאות
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm">{formatDate(log.createdAt)}</td>
                        <td className="p-3 text-sm">
                          {log.userEmail || log.userId || 'אנונימי'}
                        </td>
                        <td className="p-3 text-sm">{getActionLabel(log.action)}</td>
                        <td className="p-3 text-sm">
                          {getResourceLabel(log.resource)}
                          {log.resourceId && ` #${log.resourceId}`}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              log.status
                            )}`}
                          >
                            {log.status === 'SUCCESS' ? 'הצלחה' : log.status === 'FAILURE' ? 'כישלון' : 'שגיאה'}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-mono text-gray-600">
                          {log.ipAddress || '-'}
                        </td>
                        <td className="p-3">
                          {!log.incidentStatus && log.status === 'FAILURE' && (
                            <button
                              onClick={() => markAsIncident(log.id, 'MEDIUM')}
                              className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                            >
                              סמן כאירוע
                            </button>
                          )}
                          {log.incidentStatus && (
                            <button
                              onClick={() => openIncidentModal(log)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                              ניהול
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center text-gray-500">טוען סטטיסטיקות...</div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                  <div className="text-sm text-gray-600">סה"כ לוגים</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalLogs}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                  <div className="text-sm text-gray-600">כשלונות אחרונים (24 שעות)</div>
                  <div className="text-2xl font-bold text-red-600">{stats.recentFailures}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                  <div className="text-sm text-gray-600">גישות לא מורשות (24 שעות)</div>
                  <div className="text-2xl font-bold text-orange-600">{stats.recentUnauthorized}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                  <div className="text-sm text-gray-600">שיעור הצלחה</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalLogs > 0
                      ? Math.round(
                          ((stats.byStatus.SUCCESS || 0) / stats.totalLogs) * 100
                        )
                      : 0}
                    %
                  </div>
                </div>
                {stats.openIncidents !== undefined && (
                  <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                    <div className="text-sm text-gray-600">אירועים פתוחים</div>
                    <div className="text-2xl font-bold text-red-600">{stats.openIncidents}</div>
                  </div>
                )}
                {stats.unassignedIncidents !== undefined && (
                  <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-600">אירועים לא מוקצים</div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.unassignedIncidents}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">לפי פעולה</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.byAction)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, count]) => (
                        <div key={action} className="flex justify-between items-center">
                          <span className="text-sm">{getActionLabel(action)}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">לפי משאב</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.byResource)
                      .sort(([, a], [, b]) => b - a)
                      .map(([resource, count]) => (
                        <div key={resource} className="flex justify-between items-center">
                          <span className="text-sm">{getResourceLabel(resource)}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {stats.byIncidentStatus && Object.keys(stats.byIncidentStatus).length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">לפי סטטוס אירוע</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byIncidentStatus)
                        .sort(([, a], [, b]) => b - a)
                        .map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center">
                            <span className="text-sm">{getIncidentStatusLabel(status)}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {stats.byPriority && Object.keys(stats.byPriority).length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">לפי עדיפות</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.byPriority)
                        .sort(([, a], [, b]) => b - a)
                        .map(([priority, count]) => (
                          <div key={priority} className="flex justify-between items-center">
                            <span className="text-sm">{getPriorityLabel(priority)}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">אין נתונים</div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-red-50 border-b border-red-200">
              <h3 className="text-lg font-semibold text-red-900">
                התראות אבטחה (24 שעות אחרונות)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 border-b font-semibold text-gray-600">תאריך</th>
                    <th className="p-3 border-b font-semibold text-gray-600">סוג התראה</th>
                    <th className="p-3 border-b font-semibold text-gray-600">משתמש</th>
                    <th className="p-3 border-b font-semibold text-gray-600">כתובת IP</th>
                    <th className="p-3 border-b font-semibold text-gray-600">פרטים</th>
                    <th className="p-3 border-b font-semibold text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        טוען...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        אין התראות 🎉
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr 
                        key={alert.id} 
                        className="border-b hover:bg-red-50 cursor-pointer transition-colors"
                        onClick={() => openAlertModal(alert)}
                      >
                        <td className="p-3 text-sm">{formatDate(alert.createdAt)}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            {getActionLabel(alert.action)}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {alert.userEmail || alert.userId || 'אנונימי'}
                        </td>
                        <td className="p-3 text-sm font-mono text-gray-600">
                          {alert.ipAddress || '-'}
                        </td>
                        <td className="p-3 text-sm text-red-600">
                          <div>
                            {alert.errorMessage || '-'}
                            {alert.details?.attemptedEmail && (
                              <div className="text-xs text-yellow-700 mt-1">
                                ניסיון התחברות ל: {alert.details.attemptedEmail}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {!alert.incidentStatus && (
                              <button
                                onClick={() => markAsIncident(alert.id, 'HIGH')}
                                className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                              >
                                סמן כאירוע
                              </button>
                            )}
                            {alert.ipAddress && (
                              <button
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setBlockIPForm({ reason: `חסימה אוטומטית - ${getActionLabel(alert.action)}`, expiresAt: '' });
                                  setShowAlertModal(true);
                                }}
                                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                              >
                                חסום IP
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Incident Management Modal */}
      {showIncidentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">ניהול אירוע</h3>
              <p className="text-sm text-gray-500 mt-1">ID: {selectedIncident.id}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">פעולה</label>
                  <div className="p-2 bg-gray-50 rounded">{getActionLabel(selectedIncident.action)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">משאב</label>
                  <div className="p-2 bg-gray-50 rounded">
                    {getResourceLabel(selectedIncident.resource)}
                    {selectedIncident.resourceId && ` #${selectedIncident.resourceId}`}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">משתמש</label>
                  <div className="p-2 bg-gray-50 rounded">
                    {selectedIncident.userEmail || selectedIncident.userId || 'אנונימי'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כתובת IP</label>
                  <div className="p-2 bg-gray-50 rounded font-mono">
                    {selectedIncident.ipAddress || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
                  <div className="p-2 bg-gray-50 rounded">{formatDate(selectedIncident.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedIncident.status)}`}>
                      {selectedIncident.status === 'SUCCESS' ? 'הצלחה' : selectedIncident.status === 'FAILURE' ? 'כישלון' : 'שגיאה'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedIncident.errorMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">הודעת שגיאה</label>
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
                    {selectedIncident.errorMessage}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס אירוע *</label>
                <select
                  value={incidentForm.incidentStatus}
                  onChange={(e) => setIncidentForm({ ...incidentForm, incidentStatus: e.target.value })}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">בחר סטטוס</option>
                  <option value="NEW">חדש</option>
                  <option value="INVESTIGATING">בבדיקה</option>
                  <option value="RESOLVED">נפתר</option>
                  <option value="FALSE_POSITIVE">חיובי כוזב</option>
                  <option value="ESCALATED">הועלה</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עדיפות *</label>
                <select
                  value={incidentForm.priority}
                  onChange={(e) => setIncidentForm({ ...incidentForm, priority: e.target.value })}
                  className="w-full border p-2 rounded"
                  required
                >
                  <option value="">בחר עדיפות</option>
                  <option value="LOW">נמוך</option>
                  <option value="MEDIUM">בינוני</option>
                  <option value="HIGH">גבוה</option>
                  <option value="CRITICAL">קריטי</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">הערות אנליסט</label>
                <textarea
                  value={incidentForm.analystNotes}
                  onChange={(e) => setIncidentForm({ ...incidentForm, analystNotes: e.target.value })}
                  rows={4}
                  className="w-full border p-2 rounded"
                  placeholder="הוסף הערות, ממצאים, או פעולות שננקטו..."
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => updateIncident(selectedIncident.id)}
                  disabled={!incidentForm.incidentStatus || !incidentForm.priority}
                  className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  שמור שינויים
                </button>
                <button
                  onClick={() => {
                    setShowIncidentModal(false);
                    setSelectedIncident(null);
                  }}
                  className="px-4 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Details Modal */}
      {showAlertModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">פרטי התראה</h3>
              <p className="text-sm text-gray-500 mt-1">ID: {selectedAlert.id}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאריך ושעה</label>
                  <div className="p-2 bg-gray-50 rounded">{formatDate(selectedAlert.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">סוג התראה</label>
                  <div className="p-2 bg-gray-50 rounded">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      {getActionLabel(selectedAlert.action)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">משתמש</label>
                  <div className="p-2 bg-gray-50 rounded">
                    {selectedAlert.userEmail || selectedAlert.userId || 'אנונימי'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">כתובת IP</label>
                  <div className="p-2 bg-gray-50 rounded font-mono text-lg font-bold text-red-600">
                    {selectedAlert.ipAddress || 'לא זמין'}
                  </div>
                </div>
                {selectedAlert.details?.attemptedEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">אימייל שניסו להתחבר אליו</label>
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded font-mono text-yellow-800">
                      {selectedAlert.details.attemptedEmail}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Agent</label>
                  <div className="p-2 bg-gray-50 rounded text-xs break-all">
                    {selectedAlert.userAgent || 'לא זמין'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">משאב</label>
                  <div className="p-2 bg-gray-50 rounded">
                    {getResourceLabel(selectedAlert.resource)}
                    {selectedAlert.resourceId && ` #${selectedAlert.resourceId}`}
                  </div>
                </div>
              </div>

              {selectedAlert.errorMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">הודעת שגיאה</label>
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    {selectedAlert.errorMessage}
                  </div>
                </div>
              )}

              {selectedAlert.details && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">פרטים נוספים</label>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedAlert.ipAddress && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">חסימת כתובת IP</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        כתובת IP לחסימה
                      </label>
                      <div className="p-2 bg-red-50 border border-red-200 rounded font-mono font-bold text-red-700">
                        {selectedAlert.ipAddress}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        סיבת חסימה (אופציונלי)
                      </label>
                      <input
                        type="text"
                        value={blockIPForm.reason}
                        onChange={(e) => setBlockIPForm({ ...blockIPForm, reason: e.target.value })}
                        placeholder="לדוגמה: ניסיונות התחברות מרובים נכשלו"
                        className="w-full border p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        תאריך תפוגה (אופציונלי - השאר ריק לחסימה קבועה)
                      </label>
                      <input
                        type="datetime-local"
                        value={blockIPForm.expiresAt}
                        onChange={(e) => setBlockIPForm({ ...blockIPForm, expiresAt: e.target.value })}
                        className="w-full border p-2 rounded"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => blockIP(selectedAlert.ipAddress!)}
                        className="flex-1 bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors font-medium"
                      >
                        חסום כתובת IP
                      </button>
                      <button
                        onClick={() => {
                          setShowAlertModal(false);
                          setSelectedAlert(null);
                          setBlockIPForm({ reason: '', expiresAt: '' });
                        }}
                        className="px-4 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
                      >
                        סגור
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!selectedAlert.ipAddress && (
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowAlertModal(false);
                      setSelectedAlert(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400 transition-colors font-medium"
                  >
                    סגור
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
