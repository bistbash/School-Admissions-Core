import { GraduationCap, Users, Clock, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api';
import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    students: 0,
    users: 0,
    pendingUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [studentsRes, usersRes, pendingRes] = await Promise.all([
          apiClient.get('/students').catch(() => ({ data: [] })),
          apiClient.get('/soldiers').catch(() => ({ data: [] })),
          user?.isAdmin ? apiClient.get('/auth/pending').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);

        setStats({
          students: studentsRes.data.length || 0,
          users: usersRes.data.length || 0,
          pendingUsers: pendingRes.data.length || 0,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [user]);

  const statCards = [
    {
      title: 'תלמידים',
      value: stats.students,
      icon: GraduationCap,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20',
    },
    {
      title: 'משתמשים פעילים',
      value: stats.users,
      icon: Users,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
    },
    ...(user?.isAdmin
      ? [
          {
            title: 'ממתינים לאישור',
            value: stats.pendingUsers,
            icon: Clock,
            gradient: 'from-amber-500 to-orange-500',
            bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-12 animate-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-medium tracking-tight text-black dark:text-white">
          לוח בקרה
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ברוך הבא, <span className="font-medium text-black dark:text-white">{user?.name || user?.email}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-[#333333] border-t-gray-900 dark:border-t-[#FAFAFA]"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((stat, index) => (
              <Card
                key={stat.title}
                variant="default"
                className={cn(
                  'transition-all duration-150 hover:border-gray-200 dark:hover:border-gray-800',
                  'animate-slide-up'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </CardTitle>
                  <div className={cn('p-1.5 rounded-md bg-black dark:bg-[#FAFAFA]')}>
                    <stat.icon className={cn('h-4 w-4', 'text-white dark:text-[#171717]')} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-medium tracking-tight text-black dark:text-white">
                    {stat.value.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    סה"כ במערכת
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card variant="default" className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-black dark:text-white" />
                  פעילות אחרונה
                </CardTitle>
                <CardDescription>
                  סקירה מהירה של הפעילות במערכת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                    <span className="text-sm text-gray-600 dark:text-gray-400">משתמשים פעילים</span>
                    <span className="text-sm font-medium text-black dark:text-[#FAFAFA]">{stats.users}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                    <span className="text-sm text-gray-600 dark:text-gray-400">תלמידים רשומים</span>
                    <span className="text-sm font-medium text-black dark:text-white">{stats.students}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="default" className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-black dark:text-white" />
                  סטטיסטיקות
                </CardTitle>
                <CardDescription>
                  נתונים כלליים על המערכת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-4 rounded-md bg-gray-100 dark:bg-[#262626] border border-gray-200 dark:border-[#333333]">
                    <div className="text-2xl font-medium tracking-tight text-black dark:text-[#FAFAFA]">{stats.students}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">תלמידים במערכת</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {user?.needsProfileCompletion && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 animate-slide-up">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              השלם את הפרופיל שלך
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              עליך להשלים את פרטי הפרופיל שלך לפני שתוכל להשתמש במלוא הפונקציונליות של המערכת.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
