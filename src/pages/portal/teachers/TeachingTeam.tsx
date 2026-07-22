import { Link } from 'react-router-dom';

import type { PublicTeachingTeamMember } from './teacherApi';

const ROLE_LABEL: Record<PublicTeachingTeamMember['role'], string> = {
  lead: 'Lead teacher',
  co_teacher: 'Co-teacher',
  assistant: 'Teaching assistant',
};

export function TeachingTeam({ team }: { team: PublicTeachingTeamMember[] }) {
  if (team.length === 0) {
    return <span className="font-semibold text-ink-soft">Teacher to be confirmed</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
      {team.map((teacher) => (
        <Link
          key={`${teacher.slug}-${teacher.role}`}
          to={`/portal/teachers/${teacher.slug}`}
          className="font-semibold text-brand-sky hover:underline"
        >
          {teacher.display_name} · {ROLE_LABEL[teacher.role]}
        </Link>
      ))}
    </span>
  );
}
