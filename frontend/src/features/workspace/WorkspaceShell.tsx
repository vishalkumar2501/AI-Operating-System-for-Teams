import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import {
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  Video,
  FileText,
  Search,
  Sparkles,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { useWorkspaces } from './workspace.queries';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/auth.queries';
import { useWorkspacePresence } from '@/features/realtime/useRealtime';
import { Avatar, Spinner, Logo } from '@/components/ui';
import { useTheme } from '@/store/theme.store';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { SearchModal } from '@/features/search/SearchModal';
import { AiAssistantDrawer } from '@/features/ai/AiAssistantDrawer';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

export function WorkspaceShell() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const { data: workspaces } = useWorkspaces();
  const { onlineUsers } = useWorkspacePresence(workspaceId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentWorkspace = workspaces?.find((ws) => ws.id === workspaceId);

  const navItems: NavItem[] = [
    {
      label: 'Projects',
      to: `/workspaces/${workspaceId}/projects`,
      icon: <FolderKanban className="h-4 w-4" />,
    },
    {
      label: 'My Tasks',
      to: `/workspaces/${workspaceId}/my-tasks`,
      icon: <CheckSquare className="h-4 w-4" />,
    },
    {
      label: 'Calendar',
      to: `/workspaces/${workspaceId}/calendar`,
      icon: <Calendar className="h-4 w-4" />,
    },
    {
      label: 'Meetings',
      to: `/workspaces/${workspaceId}/meetings`,
      icon: <Video className="h-4 w-4" />,
    },
    {
      label: 'Docs',
      to: `/workspaces/${workspaceId}/docs`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: 'Members',
      to: `/workspaces/${workspaceId}/members`,
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Settings',
      to: `/workspaces/${workspaceId}/settings`,
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border bg-surface-1 transition-all duration-200 ${
          sidebarOpen ? 'w-56' : 'w-16'
        } shrink-0`}
      >
        {/* Logo + collapse */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-border h-14">
          <div className="flex items-center gap-2 overflow-hidden">
            {sidebarOpen ? (
              <Logo variant="full" size="sm" />
            ) : (
              <Logo variant="mark" size="sm" />
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-text-3 hover:bg-surface-2 hover:text-text transition-colors ml-auto"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Workspace switcher */}
        <div className="relative px-2 py-3 border-b border-border">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2 border border-transparent hover:border-border"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent-subtle text-accent text-xs font-bold border border-accent/20">
              {currentWorkspace?.name?.[0]?.toUpperCase() ?? 'W'}
            </div>
            {sidebarOpen && (
              <>
                <span className="flex-1 truncate text-sm font-medium text-text">
                  {currentWorkspace?.name ?? 'Workspace'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-text-3 shrink-0" />
              </>
            )}
          </button>

          {/* Dropdown */}
          {switcherOpen && sidebarOpen && (
            <div className="absolute left-2 right-2 top-full mt-1 z-20 rounded-lg border border-border bg-surface-1 shadow-card py-1">
              {workspaces?.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    navigate(`/workspaces/${ws.id}/projects`);
                    setSwitcherOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
                    ws.id === workspaceId ? 'text-accent font-semibold' : 'text-text-2'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  onClick={() => {
                    navigate('/workspaces');
                    setSwitcherOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
                >
                  All workspaces
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-accent-subtle text-accent font-semibold border border-accent/25'
                        : 'text-text-2 hover:bg-surface-2 hover:text-text border border-transparent'
                    }`
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User area */}
        <div className="border-t border-border px-2 py-3">
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} src={user?.avatarUrl} size="sm" className="shrink-0" />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">{user?.name}</p>
                <p className="text-xs text-text-3 truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-md p-1.5 text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
              title="Sign out"
            >
              {logout.isPending ? <Spinner size="sm" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-bg">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface-1 px-6">
          <div className="flex items-center gap-2 text-sm text-text-3">
            <span
              className="hover:text-text cursor-pointer transition-colors"
              onClick={() => navigate('/workspaces')}
            >
              Workspaces
            </span>
            <span>/</span>
            <span className="text-text font-medium">
              {currentWorkspace?.name ?? 'Loading...'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Spotlight Search trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-xs text-text-2 hover:text-text hover:border-border-strong transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-text-3" />
              <span>Search workspace...</span>
              <kbd className="font-mono text-[10px] bg-surface-3 text-text-2 px-1.5 py-0.5 rounded border border-border">
                ⌘K
              </kbd>
            </button>

            {onlineUsers.length > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-xs text-text-2"
                title={`Online in workspace: ${onlineUsers.map((u) => u.name).join(', ')}`}
              >
                <span className="h-2 w-2 rounded-full bg-semantic-success animate-pulse" />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {onlineUsers.length} online
                </span>
              </div>
            )}

            {/* Theme Toggle Button & Menu */}
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="flex items-center justify-center p-2 rounded-lg text-text-2 hover:text-text hover:bg-surface-2 border border-border transition-colors"
                title={`Theme: ${theme}`}
              >
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-accent" />
                ) : theme === 'light' ? (
                  <Sun className="h-4 w-4 text-primary" />
                ) : (
                  <Laptop className="h-4 w-4 text-text-2" />
                )}
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-lg border border-border bg-surface-1 shadow-card py-1 z-50">
                  <button
                    onClick={() => {
                      setTheme('light');
                      setThemeMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-surface-2 ${
                      theme === 'light' ? 'text-primary font-semibold' : 'text-text-2'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('dark');
                      setThemeMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-surface-2 ${
                      theme === 'dark' ? 'text-accent font-semibold' : 'text-text-2'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('system');
                      setThemeMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-surface-2 ${
                      theme === 'system' ? 'text-accent font-semibold' : 'text-text-2'
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    <span>System</span>
                  </button>
                </div>
              )}
            </div>

            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-bg p-6 text-text">
          <Outlet />
        </main>
      </div>

      {/* Global Spotlight Search Modal */}
      <SearchModal
        workspaceId={workspaceId!}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Floating AI Assistant Trigger: Solid Yellow (#E4F222) with Black Text (#0B0B0C) */}
      <button
        onClick={() => setAiDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ai-bg px-4 py-2.5 text-xs font-bold text-ai-text shadow-lg hover:bg-accent-hover hover:scale-105 active:scale-95 transition-all border border-ai-border cursor-pointer"
        title="Open TeamOS Intelligence"
      >
        <Sparkles className="h-4 w-4 text-ai-text" />
        <span>Ask AI Assistant</span>
      </button>

      {/* Floating AI Assistant Drawer */}
      <AiAssistantDrawer
        workspaceId={workspaceId!}
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />
    </div>
  );
}
export default WorkspaceShell;
