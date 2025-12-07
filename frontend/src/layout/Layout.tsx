import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut,
  Menu,
  ChevronRight,
  Building2,
  BookOpen
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { Search } from '../ui/Search';
import { authStorage } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard },
  { name: 'תלמידים', href: '/students', icon: GraduationCap },
  { name: 'ניהול משאבים', href: '/resources', icon: Building2 },
  { name: 'הגדרות', href: '/settings', icon: Settings },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    authStorage.removeToken();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden transition-opacity duration-200',
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <div 
          className="fixed inset-0 bg-black/40" 
          onClick={() => setSidebarOpen(false)} 
        />
        <div className={cn(
          'fixed inset-y-0 right-0 w-80 bg-white dark:bg-black border-l border-gray-100 dark:border-[#1A1A1A] transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}>
          <SidebarContent
            navigation={navigation}
            currentPath={location.pathname}
            onNavigate={(path) => {
              navigate(path);
              setSidebarOpen(false);
            }}
            user={user}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:right-0 lg:w-64 lg:z-50 lg:block">
        <div className="h-full bg-white dark:bg-black border-l border-gray-100 dark:border-[#1A1A1A]">
          <SidebarContent
            navigation={navigation}
            currentPath={location.pathname}
            onNavigate={(path) => navigate(path)}
            user={user}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pr-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-black px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center justify-center max-w-2xl mx-auto">
              <Search />
            </div>
            <div className="flex items-center gap-x-3">
              <ThemeToggle />
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-900">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-black dark:text-white">
                    {user.name || user.email}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-12 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  navigation: NavItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  user: any;
  onLogout: () => void;
}

function SidebarContent({
  navigation,
  currentPath,
  onNavigate,
  user,
  onLogout,
}: SidebarContentProps) {
  return (
      <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b border-gray-100 dark:border-gray-900 px-6">
        <h1 className="text-base font-medium tracking-tight text-black dark:text-white">
          מערכת בית ספר
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
        {navigation.map((item) => {
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          return (
            <button
              key={item.name}
              onClick={() => onNavigate(item.href)}
              className={cn(
                'group flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-black dark:hover:text-white',
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive 
                  ? 'text-white dark:text-black' 
                  : 'text-gray-500 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white'
              )} />
              <span className="flex-1 text-right">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 dark:border-gray-900 p-4 space-y-2">
        {user && (
          <div className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-900">
            <div className="text-sm font-medium text-black dark:text-white">
              {user.name || user.email}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
              {user.isAdmin ? 'מנהל מערכת' : 'משתמש'}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          התנתק
        </Button>
      </div>
    </div>
  );
}
