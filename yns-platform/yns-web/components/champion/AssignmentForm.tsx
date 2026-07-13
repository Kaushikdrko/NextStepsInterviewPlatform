'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { ChampionModal } from '@/components/champion/ChampionModal';
import { GOAL_TYPE_LABELS, QUESTION_MODE_LABELS } from '@/lib/champion/helpers';
import type {
  CreateAssignmentInput,
  FocusSkill,
  GoalType,
  QuestionMode,
  StudentSummary,
} from '@/lib/champion/types';

const FOCUS_SKILLS: FocusSkill[] = [
  'Communication',
  'Leadership',
  'Confidence',
  'Technical Knowledge',
  'Problem Solving',
  'Response Structure',
  'Time Management',
];

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelClass = 'text-sm font-bold text-slate-950';

export function AssignmentForm({
  open,
  students,
  onClose,
  onCreate,
}: {
  open: boolean;
  students: StudentSummary[];
  onClose: () => void;
  onCreate: (input: CreateAssignmentInput) => Promise<void>;
}) {
  const [studentId, setStudentId] = useState('');
  const [interviewPurpose, setInterviewPurpose] = useState<GoalType>('internship');
  const [questionMode, setQuestionMode] = useState<QuestionMode>('behavioral');
  const [focusSkill, setFocusSkill] = useState<FocusSkill>('Communication');
  const [resumeBased, setResumeBased] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  function reset() {
    setStudentId('');
    setInterviewPurpose('internship');
    setQuestionMode('behavioral');
    setFocusSkill('Communication');
    setResumeBased(false);
    setDueDate('');
    setInstructions('');
    setErrorText('');
  }

  async function handleSave() {
    if (!studentId) {
      setErrorText('Please select a student.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        studentId,
        interviewPurpose,
        questionMode,
        focusSkill,
        resumeBased,
        dueDate: dueDate || null,
        instructions: instructions.trim(),
      });
      reset();
      onClose();
    } catch {
      setErrorText('Something went wrong creating the assignment.');
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
      title="Assign Practice"
      description="Give a student targeted interview practice with a clear focus."
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
            Assign Practice
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="asg-student" className={labelClass}>
            Student
          </label>
          <select id="asg-student" value={studentId} onChange={(event) => setStudentId(event.target.value)} className={`${inputClass} mt-1.5`}>
            <option value="">Select a student…</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="asg-purpose" className={labelClass}>
              Interview Purpose
            </label>
            <select id="asg-purpose" value={interviewPurpose} onChange={(event) => setInterviewPurpose(event.target.value as GoalType)} className={`${inputClass} mt-1.5`}>
              {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((goal) => (
                <option key={goal} value={goal}>
                  {GOAL_TYPE_LABELS[goal]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="asg-mode" className={labelClass}>
              Question Mode
            </label>
            <select id="asg-mode" value={questionMode} onChange={(event) => setQuestionMode(event.target.value as QuestionMode)} className={`${inputClass} mt-1.5`}>
              {(Object.keys(QUESTION_MODE_LABELS) as QuestionMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {QUESTION_MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="asg-skill" className={labelClass}>
              Focus Skill
            </label>
            <select id="asg-skill" value={focusSkill} onChange={(event) => setFocusSkill(event.target.value as FocusSkill)} className={`${inputClass} mt-1.5`}>
              {FOCUS_SKILLS.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="asg-due" className={labelClass}>
              Due Date <span className="font-semibold text-slate-400">(optional)</span>
            </label>
            <input id="asg-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={`${inputClass} mt-1.5`} />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <input type="checkbox" checked={resumeBased} onChange={(event) => setResumeBased(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm font-bold text-slate-700">Include resume-based questions</span>
        </label>

        <div>
          <label htmlFor="asg-instructions" className={labelClass}>
            Instructions
          </label>
          <textarea
            id="asg-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
            placeholder="What should the student focus on?"
            className={`${inputClass} mt-1.5`}
          />
        </div>

        {errorText ? <p className="text-sm font-bold text-rose-600">{errorText}</p> : null}
      </div>
    </ChampionModal>
  );
}
