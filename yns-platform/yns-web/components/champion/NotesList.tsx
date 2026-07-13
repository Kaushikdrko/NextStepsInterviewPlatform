import { formatDate, NOTE_CATEGORY_LABELS } from '@/lib/champion/helpers';
import type { ChampionNote } from '@/lib/champion/types';
import { NoteVisibilityBadge } from '@/components/champion/StatusBadges';

export function NotesList({ notes, showStudentName = false }: { notes: ChampionNote[]; showStudentName?: boolean }) {
  if (notes.length === 0) {
    return <p className="text-sm font-semibold text-slate-500">No notes yet.</p>;
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <article
          key={note.id}
          className={`rounded-xl border p-4 ${
            note.visibility === 'private' ? 'border-slate-300 bg-slate-50' : 'border-emerald-200 bg-emerald-50/40'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <NoteVisibilityBadge visibility={note.visibility} />
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600">
                {NOTE_CATEGORY_LABELS[note.category]}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400">{formatDate(note.createdAt)}</span>
          </div>
          {showStudentName ? <p className="mt-2 text-sm font-bold text-slate-950">{note.studentName}</p> : null}
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{note.content}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">by {note.championName}</p>
        </article>
      ))}
    </div>
  );
}
