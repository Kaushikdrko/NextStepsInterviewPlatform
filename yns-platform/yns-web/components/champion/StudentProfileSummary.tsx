import {
  Building2,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  Target,
  UserCheck,
} from 'lucide-react';

import { EDUCATION_LEVEL_LABELS, formatDate, GOAL_TYPE_LABELS } from '@/lib/champion/helpers';
import type { StudentDetail } from '@/lib/champion/types';
import { StudentStatusBadge } from '@/components/champion/StatusBadges';

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

export function StudentProfileSummary({ student }: { student: StudentDetail }) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-extrabold text-white">
            {student.firstName.charAt(0)}
            {student.lastName.charAt(0)}
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              {student.firstName} {student.lastName}
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {student.fieldPursuing ?? 'Field undecided'}
              {student.gpa ? ` · GPA ${student.gpa.toFixed(1)}` : ''}
            </p>
          </div>
        </div>
        <StudentStatusBadge status={student.status} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Row icon={Mail} label="Email" value={student.email} />
        <Row icon={Phone} label="Phone" value={student.phone ?? 'Not provided'} />
        <Row
          icon={Building2}
          label="School"
          value={student.school ?? 'Not provided'}
        />
        <Row
          icon={GraduationCap}
          label="Education"
          value={`${EDUCATION_LEVEL_LABELS[student.educationLevel]}${student.year ? ` · ${student.year}` : ''}`}
        />
        <Row icon={Target} label="Goal" value={GOAL_TYPE_LABELS[student.goalType]} />
        <Row icon={UserCheck} label="Assigned Champion" value={student.assignedChampionName} />
        <Row
          icon={FileText}
          label="Resume"
          value={
            student.resumeUploaded ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-emerald-600">Uploaded</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">Updated {formatDate(student.resumeLastUpdated)}</span>
                {student.resumeUrl ? (
                  <a href={student.resumeUrl} className="font-bold text-indigo-600 hover:text-indigo-700">
                    View
                  </a>
                ) : null}
              </span>
            ) : (
              <span className="text-rose-600">Not uploaded</span>
            )
          }
        />
      </div>
    </div>
  );
}
