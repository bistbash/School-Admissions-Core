import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search as SearchIcon, X, Users, GraduationCap, Building2, DoorOpen, Loader2, Command, LayoutDashboard, Settings, Plus, Edit, Trash2, KeyRound, Badge } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface SearchResult {
  id: number | string;
  type: 'student' | 'user' | 'department' | 'room' | 'page' | 'action';
  title: string;
  subtitle?: string;
  href: string;
}

interface SearchProps {
  className?: string;
}

export function Search({ className }: SearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Add/remove blur class to body when search is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('search-open');
    } else {
      document.body.classList.remove('search-open');
    }
    return () => {
      document.body.classList.remove('search-open');
    };
  }, [isOpen]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }

      // Arrow keys navigation
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
          e.preventDefault();
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const searchPromises = [
          apiClient.get('/students').then(res => res.data || []).catch(() => []),
          apiClient.get('/soldiers').then(res => res.data || []).catch(() => []),
          apiClient.get('/departments').then(res => res.data || []).catch(() => []),
          apiClient.get('/rooms').then(res => res.data || []).catch(() => []),
        ];

        const [students, users, departments, rooms] = await Promise.all(searchPromises);
        const q = query.toLowerCase();

        const searchResults: SearchResult[] = [];

        // Search pages and actions (based on user permissions)
        const pagesAndActions: SearchResult[] = [];

        // Pages - available to all authenticated users
        const availablePages = [
          { name: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard, keywords: ['לוח', 'בקרה', 'dashboard', 'דשבורד'] },
          { name: 'תלמידים', href: '/students', icon: GraduationCap, keywords: ['תלמידים', 'students', 'תלמיד'] },
          { name: 'ניהול משאבים', href: '/resources', icon: Building2, keywords: ['משאבים', 'resources', 'ניהול', 'משתמשים', 'מחלקות', 'חדרים', 'תפקידים'] },
          { name: 'הגדרות', href: '/settings', icon: Settings, keywords: ['הגדרות', 'settings', 'הגדרה'] },
        ];

        // Actions - based on user permissions
        const availableActions: Array<{
          name: string;
          href: string;
          icon: React.ComponentType<{ className?: string }>;
          keywords: string[];
          requiresAdmin?: boolean;
        }> = [];

        if (user?.isAdmin) {
          availableActions.push(
            { name: 'יצירת משתמש', href: '/resources?tab=users&action=create', icon: Plus, keywords: ['יצירת משתמש', 'צור משתמש', 'משתמש חדש', 'create user'] },
            { name: 'עריכת משתמש', href: '/resources?tab=users', icon: Edit, keywords: ['עריכת משתמש', 'ערוך משתמש', 'edit user'] },
            { name: 'יצירת מחלקה', href: '/resources?tab=departments&action=create', icon: Plus, keywords: ['יצירת מחלקה', 'צור מחלקה', 'מחלקה חדשה', 'create department'] },
            { name: 'עריכת מחלקה', href: '/resources?tab=departments', icon: Edit, keywords: ['עריכת מחלקה', 'ערוך מחלקה', 'edit department'] },
            { name: 'יצירת חדר', href: '/resources?tab=rooms&action=create', icon: Plus, keywords: ['יצירת חדר', 'צור חדר', 'חדר חדש', 'create room'] },
            { name: 'עריכת חדר', href: '/resources?tab=rooms', icon: Edit, keywords: ['עריכת חדר', 'ערוך חדר', 'edit room'] },
            { name: 'יצירת תפקיד', href: '/resources?tab=roles&action=create', icon: Plus, keywords: ['יצירת תפקיד', 'צור תפקיד', 'תפקיד חדש', 'create role'] },
            { name: 'עריכת תפקיד', href: '/resources?tab=roles', icon: Edit, keywords: ['עריכת תפקיד', 'ערוך תפקיד', 'edit role'] },
            { name: 'איפוס סיסמה', href: '/resources?tab=users', icon: KeyRound, keywords: ['איפוס סיסמה', 'reset password', 'סיסמה'] },
            { name: 'מחיקת משתמש', href: '/resources?tab=users', icon: Trash2, keywords: ['מחיקת משתמש', 'מחק משתמש', 'delete user'] },
            { name: 'מחיקת מחלקה', href: '/resources?tab=departments', icon: Trash2, keywords: ['מחיקת מחלקה', 'מחק מחלקה', 'delete department'] },
            { name: 'מחיקת חדר', href: '/resources?tab=rooms', icon: Trash2, keywords: ['מחיקת חדר', 'מחק חדר', 'delete room'] },
            { name: 'מחיקת תפקיד', href: '/resources?tab=roles', icon: Trash2, keywords: ['מחיקת תפקיד', 'מחק תפקיד', 'delete role'] },
          );
        }

        // Search pages
        availablePages.forEach((page) => {
          const matches = page.keywords.some(keyword => keyword.toLowerCase().includes(q)) ||
                         page.name.toLowerCase().includes(q);
          if (matches) {
            pagesAndActions.push({
              id: `page-${page.href}`,
              type: 'page',
              title: page.name,
              subtitle: 'דף',
              href: page.href,
            });
          }
        });

        // Search actions
        availableActions.forEach((action) => {
          const matches = action.keywords.some(keyword => keyword.toLowerCase().includes(q)) ||
                         action.name.toLowerCase().includes(q);
          if (matches) {
            pagesAndActions.push({
              id: `action-${action.href}`,
              type: 'action',
              title: action.name,
              subtitle: 'פעולה',
              href: action.href,
            });
          }
        });

        // Add pages and actions first (they're more important)
        searchResults.push(...pagesAndActions.slice(0, 5));

        students
          .filter((student: any) =>
            student.name?.toLowerCase().includes(q) ||
            student.idNumber?.toLowerCase().includes(q) ||
            student.email?.toLowerCase().includes(q)
          )
          .slice(0, 3)
          .forEach((student: any) => {
            searchResults.push({
              id: student.id,
              type: 'student',
              title: student.name || 'תלמיד ללא שם',
              subtitle: student.idNumber || student.email,
              href: `/students/${student.id}`,
            });
          });

        users
          .filter((user: any) =>
            user.name?.toLowerCase().includes(q) ||
            user.email?.toLowerCase().includes(q) ||
            user.personalNumber?.toLowerCase().includes(q)
          )
          .slice(0, 3)
          .forEach((user: any) => {
            searchResults.push({
              id: user.id,
              type: 'user',
              title: user.name || user.email,
              subtitle: user.email || user.personalNumber,
              href: `/resources?tab=users&user=${user.id}`,
            });
          });

        departments
          .filter((dept: any) => dept.name?.toLowerCase().includes(q))
          .slice(0, 2)
          .forEach((dept: any) => {
            searchResults.push({
              id: dept.id,
              type: 'department',
              title: dept.name,
              subtitle: `${dept.soldiers?.length || 0} משתמשים`,
              href: `/resources?tab=departments`,
            });
          });

        rooms
          .filter((room: any) => room.name?.toLowerCase().includes(q))
          .slice(0, 2)
          .forEach((room: any) => {
            searchResults.push({
              id: room.id,
              type: 'room',
              title: room.name,
              subtitle: `קיבולת: ${room.capacity}`,
              href: `/resources?tab=rooms`,
            });
          });

        setResults(searchResults);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 200);
    return () => clearTimeout(debounceTimer);
  }, [query, user]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return <GraduationCap className="h-3.5 w-3.5" />;
      case 'user':
        return <Users className="h-3.5 w-3.5" />;
      case 'department':
        return <Building2 className="h-3.5 w-3.5" />;
      case 'room':
        return <DoorOpen className="h-3.5 w-3.5" />;
      case 'page':
        return <LayoutDashboard className="h-3.5 w-3.5" />;
      case 'action':
        return <Plus className="h-3.5 w-3.5" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return 'תלמיד';
      case 'user':
        return 'משתמש';
      case 'department':
        return 'מחלקה';
      case 'room':
        return 'חדר';
      case 'page':
        return 'דף';
      case 'action':
        return 'פעולה';
    }
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'flex items-center gap-3 w-full max-w-lg h-11 px-4',
          'rounded-lg border border-gray-200 dark:border-[#333333]',
          'bg-white dark:bg-[#1C1C1C]',
          'text-sm text-gray-500 dark:text-gray-400',
          'hover:border-gray-300 dark:hover:border-[#404040]',
          'transition-all duration-150',
          'shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_0_rgba(255,255,255,0.05)]',
          className
        )}
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
        <span className="flex-1 text-right text-gray-400 dark:text-gray-500">חפש...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#1C1C1C] px-1.5 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-400">
          <Command className="h-3 w-3" />
          <span>K</span>
        </kbd>
      </button>

      {/* Search Modal/Overlay - Rendered as Portal */}
      {isOpen && createPortal(
        <div
          ref={searchRef}
          className="fixed inset-0 z-[100]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
              setQuery('');
              setResults([]);
            }
          }}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in" />

          {/* Search Box */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4">
            <div
              className={cn(
                'bg-white dark:bg-[#1C1C1C]',
                'border border-gray-200 dark:border-[#333333]',
                'rounded-xl shadow-2xl',
                'overflow-hidden',
                'transform transition-all duration-300 ease-out',
                'animate-[fadeInScale_0.3s_ease-out]'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[#333333]">
                <SearchIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חפש דפים, פעולות, תלמידים, משתמשים, מחלקות, חדרים..."
                  className={cn(
                    'flex-1 bg-transparent',
                    'text-sm text-black dark:text-white',
                    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                    'focus:outline-none'
                  )}
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-black transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </button>
                )}
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" />
                )}
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto">
                {query && !isLoading && results.length === 0 && (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      לא נמצאו תוצאות עבור "{query}"
                    </p>
                  </div>
                )}

                {query && !isLoading && results.length > 0 && (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5',
                          'text-right transition-colors',
                          selectedIndex === index
                            ? 'bg-gray-100 dark:bg-[#262626]'
                            : 'hover:bg-gray-50 dark:hover:bg-[#1C1C1C]'
                        )}
                      >
                        <div
                          className={cn(
                            'p-1.5 rounded',
                            'bg-gray-100 dark:bg-[#262626]',
                            'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-black dark:text-white truncate">
                            {result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 px-2 py-0.5 rounded bg-gray-100 dark:bg-[#262626]">
                          {getTypeLabel(result.type)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {!query && (
                  <div className="px-4 py-12 text-center">
                    <div className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                      התחל להקליד כדי לחפש...
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center items-center">
                      <kbd className="h-6 select-none items-center gap-1 rounded border border-gray-200 dark:border-[#1A1A1A] bg-gray-50 dark:bg-[#0F0F0F] px-2 font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                        <Command className="h-3 w-3 inline" />
                        <span>K</span>
                      </kbd>
                      <span className="text-xs text-gray-400 dark:text-gray-500">לפתיחה</span>
                      <kbd className="h-6 select-none items-center gap-1 rounded border border-gray-200 dark:border-[#1A1A1A] bg-gray-50 dark:bg-[#0F0F0F] px-2 font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                        Esc
                      </kbd>
                      <span className="text-xs text-gray-400 dark:text-gray-500">לסגירה</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
