'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { SectionCard } from '@/components/champion/ChampionUI';
import { updateChampionSettings } from '@/lib/champion/service';
import type { ChampionSettings } from '@/lib/champion/types';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const labelClass = 'text-sm font-bold text-slate-950';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
    </label>
  );
}

export function ChampionSettingsForm({ initial }: { initial: ChampionSettings }) {
  const [form, setForm] = useState<ChampionSettings>(initial);
  const [expertiseText, setExpertiseText] = useState(initial.expertiseAreas.join(', '));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof ChampionSettings>(key: K, value: ChampionSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email.';
    if (form.calendlyUrl && !/^https?:\/\//.test(form.calendlyUrl)) nextErrors.calendlyUrl = 'Enter a valid URL (https://…).';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const payload: ChampionSettings = {
      ...form,
      expertiseAreas: expertiseText
        .split(',')
        .map((area) => area.trim())
        .filter(Boolean),
    };
    await updateChampionSettings(payload);
    setForm(payload);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SectionCard title="Profile Details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input className={inputClass} value={form.firstName} onChange={(event) => update('firstName', event.target.value)} />
            {errors.firstName ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.firstName}</p> : null}
          </Field>
          <Field label="Last name">
            <input className={inputClass} value={form.lastName} onChange={(event) => update('lastName', event.target.value)} />
            {errors.lastName ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.lastName}</p> : null}
          </Field>
          <Field label="Display name">
            <input className={inputClass} value={form.displayName} onChange={(event) => update('displayName', event.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className={inputClass} value={form.email} onChange={(event) => update('email', event.target.value)} />
            {errors.email ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.email}</p> : null}
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone ?? ''} onChange={(event) => update('phone', event.target.value)} placeholder="(optional)" />
          </Field>
          <Field label="Title / Role">
            <input className={inputClass} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Champion, Mentor, Career Advisor" />
          </Field>
          <Field label="Organization">
            <input className={inputClass} value={form.organization ?? ''} onChange={(event) => update('organization', event.target.value)} />
          </Field>
          <Field label="Timezone">
            <input className={inputClass} value={form.timezone} onChange={(event) => update('timezone', event.target.value)} />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="Areas of expertise (comma-separated)">
            <input
              className={inputClass}
              value={expertiseText}
              onChange={(event) => {
                setExpertiseText(event.target.value);
                setSaved(false);
              }}
              placeholder="Engineering, Business, Scholarships"
            />
          </Field>
          <Field label="Short bio">
            <textarea className={inputClass} rows={3} value={form.bio} onChange={(event) => update('bio', event.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Calendly / Scheduling">
        <div className="grid gap-4">
          <Field label="Calendly URL">
            <input className={inputClass} value={form.calendlyUrl ?? ''} onChange={(event) => update('calendlyUrl', event.target.value)} placeholder="https://calendly.com/your-link" />
            {errors.calendlyUrl ? <p className="mt-1 text-xs font-bold text-rose-600">{errors.calendlyUrl}</p> : null}
          </Field>
          <Field label="Availability note">
            <textarea
              className={inputClass}
              rows={2}
              value={form.availabilityNote ?? ''}
              onChange={(event) => update('availabilityNote', event.target.value)}
              placeholder="Students can book time with me for interview prep, scholarship guidance, and career questions."
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Notification Preferences">
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow label="Email me when a student completes an interview" checked={form.notifyCompletedInterviews} onChange={(next) => update('notifyCompletedInterviews', next)} />
          <ToggleRow label="Email me about new student notes" checked={form.notifyStudentNotes} onChange={(next) => update('notifyStudentNotes', next)} />
          <ToggleRow label="Email me about scheduled meetings" checked={form.notifyScheduledMeetings} onChange={(next) => update('notifyScheduledMeetings', next)} />
          <ToggleRow label="Dashboard alerts for students needing help" checked={form.alertStudentsNeedingHelp} onChange={(next) => update('alertStudentsNeedingHelp', next)} />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save Changes
        </button>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
