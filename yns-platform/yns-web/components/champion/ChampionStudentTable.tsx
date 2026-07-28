'use client';

import { memo } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { formatCount, formatPracticeTime } from '@/lib/champion/format';
import type {
  ChampionStudentListItem,
  SortOrder,
  StudentSortField,
} from '@/lib/champion/types';
import { cn } from '@/lib/utils';

interface Column {
  field: StudentSortField;
  label: string;
  /** First click on an unsorted column: names read best A–Z, metrics best high-first. */
  defaultOrder: SortOrder;
  width: string;
}

const COLUMNS: readonly Column[] = [
  { field: 'fullName', label: 'Student Name', defaultOrder: 'asc', width: 'w-[38%]' },
  { field: 'questionsAnswered', label: 'Questions Answered', defaultOrder: 'desc', width: 'w-[20%]' },
  { field: 'interviewsCompleted', label: 'Interviews Completed', defaultOrder: 'desc', width: 'w-[22%]' },
  { field: 'practiceTime', label: 'Practice Time', defaultOrder: 'desc', width: 'w-[20%]' },
];

const CELL = 'px-6 py-[17px]';

function SortableHeader({
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: Column;
  sortBy: StudentSortField;
  sortOrder: SortOrder;
  onSort: (field: StudentSortField, order: SortOrder) => void;
}) {
  const isActive = sortBy === column.field;
  const nextOrder: SortOrder = isActive
    ? sortOrder === 'asc'
      ? 'desc'
      : 'asc'
    : column.defaultOrder;
  const Icon = isActive ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-6 pb-3.5 pt-1 text-left align-bottom', column.width)}
    >
      <button
        type="button"
        onClick={() => onSort(column.field, nextOrder)}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded text-[13px] font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2',
          isActive ? 'text-maroon-700' : 'text-neutral-500 hover:text-neutral-900',
        )}
      >
        {column.label}
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            isActive ? 'text-gold-500' : 'text-neutral-300 group-hover:text-neutral-400',
          )}
          aria-hidden="true"
        />
        <span className="sr-only">
          , activate to sort by {column.label.toLowerCase()}{' '}
          {nextOrder === 'asc' ? 'ascending' : 'descending'}
        </span>
      </button>
    </th>
  );
}

const StudentRow = memo(function StudentRow({
  student,
  isSelected,
  onSelect,
}: {
  student: ChampionStudentListItem;
  isSelected: boolean;
  onSelect: (studentId: string, trigger: HTMLElement) => void;
}) {
  return (
    <tr
      className={cn(
        'border-t border-neutral-100 transition-colors',
        isSelected ? 'bg-maroon-50/60' : 'hover:bg-neutral-50',
      )}
    >
      <td className={CELL}>
        {/* The name is the only thing that opens the drawer — never the row. */}
        <button
          type="button"
          onClick={(event) => onSelect(student.id, event.currentTarget)}
          aria-expanded={isSelected}
          className="rounded text-sm font-semibold text-maroon-700 underline decoration-maroon-200 decoration-1 underline-offset-[3px] transition-colors hover:text-maroon-800 hover:decoration-maroon-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 focus-visible:ring-offset-2"
        >
          {student.fullName}
          <span className="sr-only"> — view student details</span>
        </button>
      </td>
      <td className={cn(CELL, 'text-sm font-medium text-neutral-700 tabular-nums')}>
        {formatCount(student.questionsAnswered)}
      </td>
      <td className={cn(CELL, 'text-sm font-medium text-neutral-700 tabular-nums')}>
        {formatCount(student.interviewsCompleted)}
      </td>
      <td className={cn(CELL, 'text-sm font-medium text-neutral-700 tabular-nums')}>
        {formatPracticeTime(student.practiceTimeSeconds)}
      </td>
    </tr>
  );
});

export function ChampionStudentTable({
  students,
  sortBy,
  sortOrder,
  selectedStudentId,
  isFetching,
  onSort,
  onSelectStudent,
}: {
  students: ChampionStudentListItem[];
  sortBy: StudentSortField;
  sortOrder: SortOrder;
  selectedStudentId: string | null;
  isFetching: boolean;
  onSort: (field: StudentSortField, order: SortOrder) => void;
  onSelectStudent: (studentId: string, trigger: HTMLElement) => void;
}) {
  const sortedColumn = COLUMNS.find((column) => column.field === sortBy);

  return (
    <div className="overflow-x-auto">
      <table
        aria-busy={isFetching}
        className={cn(
          'w-full min-w-[740px] border-collapse text-left transition-opacity',
          isFetching && 'opacity-60',
        )}
      >
        <caption className="sr-only">
          Students, sorted by {sortedColumn?.label.toLowerCase() ?? 'student name'}{' '}
          {sortOrder === 'asc' ? 'ascending' : 'descending'}
        </caption>
        <thead>
          <tr className="border-b border-neutral-200">
            {COLUMNS.map((column) => (
              <SortableHeader
                key={column.field}
                column={column}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              isSelected={student.id === selectedStudentId}
              onSelect={onSelectStudent}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
