import { Settings } from 'lucide-react';

export function SettingsPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Settings className="h-10 w-10 text-slate-700 mb-3" />
      <h2 className="text-lg font-semibold text-slate-300">Workspace Settings</h2>
      <p className="mt-1 text-sm text-slate-500">Settings feature coming soon.</p>
    </div>
  );
}
