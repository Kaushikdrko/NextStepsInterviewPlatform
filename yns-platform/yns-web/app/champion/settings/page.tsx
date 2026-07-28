import { redirect } from 'next/navigation';

// Champions use the same account settings page as everyone else; the brief
// rules out building a separate champion profile page.
export default function ChampionSettingsPage() {
  redirect('/settings');
}
