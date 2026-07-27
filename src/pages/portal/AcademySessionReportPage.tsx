import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getAcademySessionReport } from '@/pages/learn/academy/academyApi';

export function AcademySessionReportPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const report = useQuery({
    queryKey: ['academy-session-report', sessionId],
    queryFn: () => getAcademySessionReport(sessionId),
    enabled: sessionId !== '',
    retry: false,
  });

  if (report.isLoading) return <p className="lead-text">Loading the exam report…</p>;
  if (report.isError || !report.data) {
    return (
      <div className="card-base max-w-2xl">
        <h1 className="section-heading">Report unavailable</h1>
        <p className="lead-text mt-3">
          This report does not belong to your family, or it is no longer available.
        </p>
      </div>
    );
  }

  const item = report.data;
  return (
    <div className="max-w-4xl" data-testid="academy-parent-session-report">
      <div className="eyebrow eyebrow-sky">Academy report</div>
      <h1 className="hero-display mt-3">Mock exam result</h1>
      <p className="lead-text mt-3">
        Objective marks and learner self-assessment are shown separately so the report never
        presents a self-awarded mark as measured accuracy.
      </p>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        <Score
          label="Objective score"
          value={`${item.objective.marks_awarded}/${item.objective.marks_total}`}
          detail={`${Math.round(item.objective.accuracy * 100)}% objective accuracy`}
        />
        <Score
          label="Self-assessed"
          value={`${item.self_assessed.marks_awarded}/${item.self_assessed.marks_total}`}
          detail="The learner checked this against the official marking guide"
        />
        <Score
          label="Combined marks"
          value={`${item.total.marks_awarded}/${item.total.marks_total}`}
          detail="A mark total, not a combined accuracy percentage"
        />
      </div>
      <p className="card-base mt-5 border-2 border-brand-sun font-bold">
        {item.self_assessed.notice}
      </p>
      <Link to="/portal/academy" className="btn-pill-primary mt-6 inline-block">
        Back to Academy
      </Link>
    </div>
  );
}

function Score({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="card-base">
      <div className="text-xs font-black uppercase tracking-[0.12em] text-slate2">{label}</div>
      <div className="mt-3 text-4xl font-black text-ink">{value}</div>
      <p className="mt-3 text-sm font-bold text-slate2">{detail}</p>
    </section>
  );
}
