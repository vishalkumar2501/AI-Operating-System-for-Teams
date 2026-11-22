import { useState } from 'react';
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
} from 'lucide-react';
import { useWorkspaces } from './workspace.queries';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/auth.queries';
import { useWorkspacePresence } from '@/features/realtime/useRealtime';
import { Avatar, Spinner } from '@/components/ui';
import { NotificationBell } from '@/features/notifications/NotificationBell';

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
  const { data: workspaces } = useWorkspaces();
  const { onlineUsers } = useWorkspacePresence(workspaceId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(false);

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
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-200 ${
          sidebarOpen ? 'w-56' : 'w-14'
        } shrink-0`}
      >
        {/* Logo + collapse */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-800 h-14">
          {sidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 font-bold text-white text-xs">
                T
              </div>
              <span className="text-sm font-semibold text-slate-100 truncate">TeamOS</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors ml-auto"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Workspace switcher */}
        <div className="relative px-2 py-3 border-b border-slate-800">
          <button
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-600/30 text-indigo-400 text-xs font-bold">
              {currentWorkspace?.name?.[0]?.toUpperCase() ?? 'W'}
            </div>
            {sidebarOpen && (
              <>
                <span className="flex-1 truncate text-sm font-medium text-slate-200">
                  {currentWorkspace?.name ?? 'Workspace'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </>
            )}
          </button>

          {/* Dropdown */}
          {switcherOpen && sidebarOpen && (
            <div className="absolute left-2 right-2 top-full mt-1 z-20 rounded-lg border border-slate-700 bg-slate-800 shadow-lg py-1">
              {workspaces?.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    navigate(`/workspaces/${ws.id}`);
                    setSwitcherOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-slate-700 ${
                    ws.id === workspaceId ? 'text-indigo-400' : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
              <div className="border-t border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => {
                    navigate('/workspaces');
                    setSwitcherOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                >
                  All workspaces
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
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
        <div className="border-t border-slate-800 px-2 py-3">
          <div className="flex items-center gap-2">
            <Avatar name={user?.name} src={user?.avatarUrl} size="sm" className="shrink-0" />
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
              title="Sign out"
            >
              {logout.isPending ? <Spinner size="sm" /> : <LogOut className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span
              className="hover:text-slate-300 cursor-pointer transition-colors"
              onClick={() => navigate('/workspaces')}
            >
              Workspaces
            </span>
            <span>/</span>
            <span className="text-slate-300 font-medium">
              {currentWorkspace?.name ?? 'Loading...'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onlineUsers.length > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300"
                title={`Online in workspace: ${onlineUsers.map((u) => u.name).join(', ')}`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {onlineUsers.length} online
                </span>
              </div>
            )}
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-slate-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
