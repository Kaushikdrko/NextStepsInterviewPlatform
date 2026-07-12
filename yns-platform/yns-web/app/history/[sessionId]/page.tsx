import { HistorySessionDetail } from '@/components/history/HistorySessionDetail';

type HistorySessionPageProps = {
  params: {
    sessionId: string;
  };
};

export default function HistorySessionPage({ params }: HistorySessionPageProps) {
  return <HistorySessionDetail sessionId={params.sessionId} />;
}
