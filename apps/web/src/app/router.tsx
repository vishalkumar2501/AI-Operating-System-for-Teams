import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage';
import { WorkspacesPage } from '@/features/workspace/WorkspacesPage';
import { WorkspaceShell } from '@/features/workspace/WorkspaceShell';
import { MembersPage } from '@/features/workspace/MembersPage';
import { AcceptInvitePage } from '@/features/workspace/AcceptInvitePage';
import { ProjectsPlaceholder } from '@/features/workspace/ProjectsPlaceholder';
import { SettingsPlaceholder } from '@/features/workspace/SettingsPlaceholder';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspaceShell />}>
            <Route index element={<Navigate to="projects" replace />} />
            <Route path="projects" element={<ProjectsPlaceholder />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="settings" element={<SettingsPlaceholder />} />
          </Route>
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/workspaces" replace />} />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
              <div className="text-center">
                <p className="text-6xl font-bold text-slate-700">404</p>
                <p className="mt-2 text-lg">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
