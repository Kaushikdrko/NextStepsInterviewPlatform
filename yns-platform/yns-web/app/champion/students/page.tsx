import { redirect } from 'next/navigation';

// The student list is the dashboard — there is no second students page. This
// route exists so the "Students" item in the sidebar resolves somewhere real.
export default function ChampionStudentsPage() {
  redirect('/champion/dashboard');
}
