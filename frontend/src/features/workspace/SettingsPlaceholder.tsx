import type { ReactNode } from 'react';
import { Sun, Moon, Laptop, Palette, Shield } from 'lucide-react';
import { useTheme, ThemeMode } from '@/store/theme.store';

export function SettingsPlaceholder() {
  const { theme, setTheme } = useTheme();

  const themes: Array<{
    id: ThemeMode;
    label: string;
    description: string;
    icon: ReactNode;
  }> = [
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Near-black surfaces with neon yellow-lime accents for focus and depth.',
      icon: <Moon className="h-5 w-5 text-accent" />,
    },
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Clean white surfaces with solid blue accents and distinct AI highlights.',
      icon: <Sun className="h-5 w-5 text-primary" />,
    },
    {
      id: 'system',
      label: 'System Default',
      description: 'Automatically switches theme according to your operating system preference.',
      icon: <Laptop className="h-5 w-5 text-text-2" />,
    },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text">Workspace Settings</h1>
        <p className="mt-1 text-sm text-text-2">
          Manage workspace preferences, appearance, security, and notifications.
        </p>
      </div>

      {/* Appearance Section */}
      <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-card space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border">
          <Palette className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-base font-semibold text-text">Appearance & Theme</h2>
            <p className="text-xs text-text-3">
              Customize how TeamOS looks on your device.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-accent bg-accent-subtle shadow-sm'
                    : 'border-border bg-surface-2 hover:border-border-strong hover:bg-surface-3'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="p-2 rounded-lg bg-surface-1 border border-border">
                    {t.icon}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-on-accent uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-text">{t.label}</h3>
                <p className="mt-1 text-xs text-text-3 leading-relaxed">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* General Settings Placeholders */}
      <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-card space-y-6">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border">
          <Shield className="h-5 w-5 text-text-2" />
          <div>
            <h2 className="text-base font-semibold text-text">Security & Permissions</h2>
            <p className="text-xs text-text-3">
              Manage API keys, webhooks, and workspace roles.
            </p>
          </div>
        </div>
        <div className="text-xs text-text-3">
          Role-Based Access Control (RBAC) is active for this workspace. Members inherit project permissions based on their assigned role.
        </div>
      </div>
    </div>
  );
}
export default SettingsPlaceholder;
