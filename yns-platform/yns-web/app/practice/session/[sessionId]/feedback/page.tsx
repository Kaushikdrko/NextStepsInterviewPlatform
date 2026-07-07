import { InterviewFeedbackPage } from '@/components/practice/InterviewFeedbackPage';

type FeedbackPageProps = {
  params: {
    sessionId: string;
  };
};

export default function PracticeSessionFeedbackPage({ params }: FeedbackPageProps) {
  return <InterviewFeedbackPage sessionId={params.sessionId} />;
}
