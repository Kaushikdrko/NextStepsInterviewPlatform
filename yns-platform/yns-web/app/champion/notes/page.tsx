'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Plus } from 'lucide-react';

import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/champion/ChampionUI';
import { NoteEditor } from '@/components/champion/NoteEditor';
import { NotesList } from '@/components/champion/NotesList';
import { createNote, getAssignedStudents, getNotes } from '@/lib/champion/service';
import type { ChampionNote, CreateNoteInput, NoteVisibility, StudentSummary } from '@/lib/champion/types';

const selectClass =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export default function ChampionNotesPage() {
  const [notes, setNotes] = useState<ChampionNote[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<NoteVisibility | 'all'>('all');
  const [studentFilter, setStudentFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const [notesData, studentsData] = await Promise.all([getNotes(), getAssignedStudents()]);
        if (!isMounted) return;
        setNotes(notesData);
        setStudents(studentsData);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load notes.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (query && !note.studentName.toLowerCase().includes(query)) return false;
      if (visibilityFilter !== 'all' && note.visibility !== visibilityFilter) return false;
      if (studentFilter !== 'all' && note.studentId !== studentFilter) return false;
      return true;
    });
  }, [notes, search, visibilityFilter, studentFilter]);

  async function handleCreate(input: CreateNoteInput) {
    const created = await createNote(input);
    setNotes((prev) => [created, ...prev]);
  }

  return (
    <>
      <ChampionPageHeader
        title="Notes & Feedback"
        subtitle="Manage student-visible feedback and private mentor notes in one place."
        breadcrumbs={[{ label: 'Champion', href: '/champion' }, { label: 'Notes' }]}
        actions={
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Note
          </button>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student…"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search notes by student"
          />
          <select className={selectClass} value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as NoteVisibility | 'all')} aria-label="Filter by visibility">
            <option value="all">All notes</option>
            <option value="student_visible">Visible to Student</option>
            <option value="private">Private Mentor Notes</option>
          </select>
          <select className={selectClass} value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)} aria-label="Filter by student">
            <option value="all">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading notes…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No notes yet"
          description="Create your first note to share feedback with a student or keep a private reminder."
          action={
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Note
            </button>
          }
        />
      ) : (
        <NotesList notes={filtered} showStudentName />
      )}

      <NoteEditor open={editorOpen} students={students} onClose={() => setEditorOpen(false)} onCreate={handleCreate} />
    </>
  );
}
