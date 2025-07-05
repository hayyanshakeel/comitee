import { SettingsForm } from '@/components/admin/settings-form';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold font-headline">Settings</h1>
      <SettingsForm />
    </div>
  );
}
