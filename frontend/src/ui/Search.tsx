import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, Users, GraduationCap, Building2, DoorOpen, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiClient } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: number;
  type: 'student' | 'user' | 'department' | 'room';
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

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          // Search students
          apiClient.get('/students').then(res => res.data || []).catch(() => []),
          // Search users/soldiers
          apiClient.get('/soldiers').then(res => res.data || []).catch(() => []),
          // Search departments
          apiClient.get('/departments').then(res => res.data || []).catch(() => []),
          // Search rooms
          apiClient.get('/rooms').then(res => res.data || []).catch(() => []),
        ];

        const [students, users, departments, rooms] = await Promise.all(searchPromises);
        const q = query.toLowerCase();

        const searchResults: SearchResult[] = [];

        // Filter and add students
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

        // Filter and add users
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

        // Filter and add departments
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

        // Filter and add rooms
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

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'department':
        return <Building2 className="h-4 w-4" />;
      case 'room':
        return <DoorOpen className="h-4 w-4" />;
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
    }
  };

  return (
    <div ref={searchRef} className={cn('relative', className)}>
      {/* Search Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          'flex items-center gap-2 w-full max-w-md h-9 px-3',
          'rounded-md border border-gray-200 dark:border-[#1A1A1A]',
          'bg-white dark:bg-[#0F0F0F]',
          'text-sm text-gray-500 dark:text-gray-500',
          'hover:border-gray-300 dark:hover:border-[#404040]',
          'transition-all duration-150'
        )}
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-right">חפש...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-[#333333] bg-gray-100 dark:bg-[#1C1C1C] px-1.5 font-mono text-[10px] font-medium text-gray-500 dark:text-gray-500">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search Modal/Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 animate-in"
            onClick={() => {
              setIsOpen(false);
              setQuery('');
              setResults([]);
            }}
          />

          {/* Search Box */}
          <div
            className={cn(
              'fixed top-16 left-1/2 -translate-x-1/2 z-50',
              'w-full max-w-2xl',
              'bg-white dark:bg-[#1C1C1C]',
              'border border-gray-200 dark:border-[#333333]',
              'rounded-lg',
              'animate-in fade-in slide-down'
            )}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-[#333333]">
              <SearchIcon className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חפש תלמידים, משתמשים, מחלקות, חדרים..."
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
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-black transition-colors"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {query && !isLoading && results.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  לא נמצאו תוצאות עבור "{query}"
                </div>
              )}

              {query && !isLoading && results.length > 0 && (
                <div className="p-1">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-md',
                        'text-right transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-black',
                        selectedIndex === index && 'bg-gray-100 dark:bg-[#262626]'
                      )}
                    >
                      <div className={cn(
                        'p-1.5 rounded-md',
                        'bg-gray-100 dark:bg-[#262626]',
                        'text-gray-600 dark:text-gray-400'
                      )}>
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-black dark:text-white truncate">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
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
                <div className="p-8 text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-500 mb-2">
                    התחל להקליד כדי לחפש...
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <kbd className="h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-[#333333] bg-gray-100 dark:bg-[#1C1C1C] px-1.5 font-mono text-xs font-medium text-gray-500 dark:text-gray-500">
                      ⌘K
                    </kbd>
                    <span className="text-xs text-gray-400 dark:text-gray-500">לפתיחה</span>
                    <kbd className="h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-[#333333] bg-gray-100 dark:bg-[#1C1C1C] px-1.5 font-mono text-xs font-medium text-gray-500 dark:text-gray-500">
                      Esc
                    </kbd>
                    <span className="text-xs text-gray-400 dark:text-gray-500">לסגירה</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
