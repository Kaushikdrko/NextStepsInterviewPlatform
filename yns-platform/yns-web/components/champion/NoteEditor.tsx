'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { ChampionModal } from '@/components/champion/ChampionModal';
import { NOTE_CATEGORY_LABELS } from '@/lib/champion/helpers';
import type { CreateNoteInput, NoteCategory, NoteVisibility, StudentSummary } from '@/lib/champion/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelClass = 'text-sm font-bold text-slate-950';

export function NoteEditor({
  open,
  students,
  onClose,
  onCreate,
}: {
  open: boolean;
  students: StudentSummary[];
  onClose: () => void;
  onCreate: (input: CreateNoteInput) => Promise<void>;
}) {
  const [studentId, setStudentId] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('student_visible');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  function reset() {
    setStudentId('');
    setContent('');
    setVisibility('student_visible');
    setCategory('general');
    setErrorText('');
  }

  async function handleSave() {
    if (!studentId) {
      setErrorText('Please select a student.');
      return;
    }
    if (!content.trim()) {
      setErrorText('Please enter note content.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({ studentId, content: content.trim(), visibility, category });
      reset();
      onClose();
    } catch {
      setErrorText('Something went wrong saving the note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ChampionModal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New Note"
      description="Share encouragement or feedback with a student, or keep a private mentor note."
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Save Note
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="note-student" className={labelClass}>
            Student
          </label>
          <select id="note-student" value={studentId} onChange={(event) => setStudentId(event.target.value)} className={`${inputClass} mt-1.5`}>
            <option value="">Select a student…</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note-content" className={labelClass}>
            Note
          </label>
          <textarea
            id="note-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
            placeholder="Write your note…"
            className={`${inputClass} mt-1.5`}
          />
        </div>

        <div>
          <span className={labelClass}>Visibility</span>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setVisibility('student_visible')}
              className={`rounded-xl border p-3 text-left transition ${
                visibility === 'student_visible' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-bold text-slate-950">Visible to Student</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">This note will appear in the student&apos;s dashboard.</p>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`rounded-xl border p-3 text-left transition ${
                visibility === 'private' ? 'border-slate-400 bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-bold text-slate-950">Private Mentor Note</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Only Champions and authorized staff can see this note.</p>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="note-category" className={labelClass}>
            Category
          </label>
          <select id="note-category" value={category} onChange={(event) => setCategory(event.target.value as NoteCategory)} className={`${inputClass} mt-1.5`}>
            {(Object.keys(NOTE_CATEGORY_LABELS) as NoteCategory[]).map((value) => (
              <option key={value} value={value}>
                {NOTE_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {errorText ? <p className="text-sm font-bold text-rose-600">{errorText}</p> : null}
      </div>
    </ChampionModal>
  );
}
