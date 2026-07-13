'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';

import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/champion/ChampionUI';
import { StudentFilters, type StudentFilterState } from '@/components/champion/StudentFilters';
import { StudentTable } from '@/components/champion/StudentTable';
import { getAssignedStudents } from '@/lib/champion/service';
import type { StudentSummary } from '@/lib/champion/types';

const initialFilters: StudentFilterState = {
  search: '',
  status: 'all',
  goalType: 'all',
  educationLevel: 'all',
  readiness: 'all',
};

function matchesReadiness(score: number | null, range: StudentFilterState['readiness']) {
  if (range === 'all') return true;
  if (score === null) return false;
  if (range === 'high') return score >= 85;
  if (range === 'mid') return score >= 55 && score < 85;
  return score < 55;
}

export default function ChampionStudentsPage() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [filters, setFilters] = useState<StudentFilterState>(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getAssignedStudents();
        if (isMounted) setStudents(data);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load students.');
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
    const query = filters.search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      if (query && !fullName.includes(query)) return false;
      if (filters.status !== 'all' && student.status !== filters.status) return false;
      if (filters.goalType !== 'all' && student.goalType !== filters.goalType) return false;
      if (filters.educationLevel !== 'all' && student.educationLevel !== filters.educationLevel) return false;
      if (!matchesReadiness(student.readinessScore, filters.readiness)) return false;
      return true;
    });
  }, [students, filters]);

  return (
    <>
      <ChampionPageHeader
        title="Assigned Students"
        subtitle="Search and filter the students you support, then open any profile for the full picture."
        breadcrumbs={[{ label: 'Champion', href: '/champion' }, { label: 'Students' }]}
      />

      {error ? <ErrorState message={error} /> : null}

      <StudentFilters value={filters} onChange={setFilters} />

      {isLoading ? (
        <LoadingState label="Loading students…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students match your filters"
          description="Try clearing a filter or adjusting your search to see more students."
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-slate-500">
            Showing {filtered.length} of {students.length} students
          </p>
          <StudentTable students={filtered} />
        </>
      )}
    </>
  );
}
