'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Copy, ExternalLink, Video } from 'lucide-react';

import { ChampionPageHeader } from '@/components/champion/ChampionPageHeader';
import { EmptyState, ErrorState, LoadingState, SectionCard } from '@/components/champion/ChampionUI';
import { MeetingStatusBadge } from '@/components/champion/StatusBadges';
import { formatDate, formatTime, MEETING_TYPE_LABELS } from '@/lib/champion/helpers';
import { getChampionSettings, getMeetings } from '@/lib/champion/service';
import type { ChampionSettings, Meeting } from '@/lib/champion/types';

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-950">{meeting.title}</p>
          <p className="text-xs font-semibold text-slate-500">
            {meeting.studentName} · {MEETING_TYPE_LABELS[meeting.meetingType]}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {formatDate(meeting.startTime)} · {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <MeetingStatusBadge status={meeting.status} />
        {meeting.meetingUrl ? (
          <a
            href={meeting.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <Video className="h-3.5 w-3.5" aria-hidden="true" />
            Join
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function ChampionMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [settings, setSettings] = useState<ChampionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const [meetingData, settingsData] = await Promise.all([getMeetings(), getChampionSettings()]);
        if (!isMounted) return;
        setMeetings(meetingData);
        setSettings(settingsData);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load meetings.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const upcomingList: Meeting[] = [];
    const pastList: Meeting[] = [];
    for (const meeting of meetings) {
      if (meeting.status === 'scheduled' && new Date(meeting.startTime).getTime() >= now) {
        upcomingList.push(meeting);
      } else {
        pastList.push(meeting);
      }
    }
    return { upcoming: upcomingList, past: pastList };
  }, [meetings]);

  async function copyLink() {
    if (!settings?.calendlyUrl) return;
    try {
      await navigator.clipboard.writeText(settings.calendlyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <>
      <ChampionPageHeader
        title="Meetings"
        subtitle="View upcoming meetings with your students and share your scheduling link."
        breadcrumbs={[{ label: 'Champion', href: '/champion' }, { label: 'Meetings' }]}
      />

      {error ? <ErrorState message={error} /> : null}

      {/* Calendly / scheduling. Uses the Champion's stored Calendly URL; real
          Calendly sync can be layered in later without changing this UI. */}
      <SectionCard title="Scheduling" description="Students can book time with you using your Calendly link.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-all text-sm font-semibold text-slate-600">
            {settings?.calendlyUrl ?? 'No Calendly link set yet. Add one in Settings.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {settings?.calendlyUrl ? (
              <>
                <a
                  href={settings.calendlyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open Calendly
                </a>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </SectionCard>

      {isLoading ? (
        <LoadingState label="Loading meetings…" />
      ) : (
        <>
          <SectionCard title="Upcoming Meetings">
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No upcoming meetings" description="Meetings you schedule will appear here." />
            ) : (
              <div className="grid gap-3">
                {upcoming.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            )}
          </SectionCard>

          {past.length > 0 ? (
            <SectionCard title="Past Meetings">
              <div className="grid gap-3">
                {past.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </SectionCard>
          ) : null}
        </>
      )}
    </>
  );
}
