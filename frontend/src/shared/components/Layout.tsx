import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Settings, 
  LogOut,
  Menu,
  ChevronRight,
  Building2,
  Shield,
  Key
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button } from '../ui/Button';
import { Search } from '../ui/Search';
import { authStorage } from '../../features/auth/auth';
import { useAuth } from '../../features/auth/AuthContext';
import { usePermissions } from '../../features/permissions/PermissionsContext';
import { PageModeToggle } from '../../features/permissions/PageModeToggle';
import { cn } from '../lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  page: string; // Page name for permission check
}

// Navigation items - will be filtered by page permissions
const allNavigationItems: NavItem[] = [
  { name: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { name: 'תלמידים', href: '/students', icon: GraduationCap, page: 'students' },
  { name: 'ניהול משאבים', href: '/resources', icon: Building2, page: 'resources' },
  { name: 'מרכז אבטחה', href: '/soc', icon: Shield, page: 'soc' },
  { name: 'מפתחות API', href: '/api', icon: Key, page: 'api-keys' },
  { name: 'הגדרות', href: '/settings', icon: Settings, page: 'settings' },
];

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { hasPagePermission } = usePermissions();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Filter navigation items based on page permissions - only show pages user can view
  const navigation = allNavigationItems.filter(item => {
    // Admins see everything
    if (user?.isAdmin) return true;
    // Check if user has view permission for this page
    return hasPagePermission(item.page, 'view');
  });

  const handleLogout = () => {
    authStorage.removeToken();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000]">
      {/* Mobile sidebar */}
      <div className={cn(
        'fixed inset-0 z-50 lg:hidden transition-opacity duration-200',
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)} 
        />
        <div className={cn(
          'fixed inset-y-0 right-0 w-80 bg-white dark:bg-[#000000] border-l border-gray-200 dark:border-[#1F1F1F] shadow-xl transition-transform duration-200',
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
        <div className="h-full bg-white dark:bg-[#000000] border-l border-gray-200 dark:border-[#1F1F1F]">
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
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-[#1F1F1F] bg-white dark:bg-[#000000] px-4 sm:px-6 lg:px-8">
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
              <PageModeToggle />
              <ThemeToggle />
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F]">
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
        <main className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
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
      <div className="flex h-14 shrink-0 items-center border-b border-gray-200 dark:border-[#1F1F1F] px-4">
        <h1 className="text-base font-semibold tracking-tight text-black dark:text-white">
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
                'group flex items-center gap-x-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#080808] hover:text-black dark:hover:text-[#FAFAFA]',
              )}
            >
              <item.icon className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive 
                  ? 'text-white dark:text-[#000000]' 
                  : 'text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white'
              )} />
              <span className="flex-1 text-right">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 opacity-60" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-[#1F1F1F] p-3 space-y-2">
        {user && (
          <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#080808] border border-gray-200 dark:border-[#1F1F1F]">
            <div className="text-sm font-medium text-black dark:text-white">
              {user.name || user.email}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {user.isAdmin ? 'מנהל מערכת' : 'משתמש'}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-[#FAFAFA] hover:bg-gray-100 dark:hover:bg-[#080808]"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          התנתק
        </Button>
      </div>
    </div>
  );
}
