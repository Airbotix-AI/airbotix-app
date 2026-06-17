import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { getStudentWork, type StudentWorkProject, type StudentWorkRow } from './classApi';

/**
 * "Student work" review gallery — the between-sessions companion to the live
 * dashboard (teacher-class-work-prd.md §3, D-TCW-5). Per enrolled kid, a grid of
 * that kid's class-work + on-the-wall projects (thumbnail, title, kind, status,
 * on-wall badge). Opening a project reuses the EXISTING per-kid read-only viewer
 * (`/teacher/classes/:classId/kids/:kidId` → LiveViewPage); there is NO new
 * viewer here. The live raised-hands queue (who needs help) stays on the
 * dashboard — this is review/prep, not a second live tool.
 *
 * Privacy boundary (D-TCW-1): the server returns class-work + on-wall projects
 * only — never personal/private — and nickname only. Client never renders other
 * kid PII.
 */
const KIND_LABEL: Record<string, string> = {
  creative: 'Creative',
  code: 'Code',
  game: 'Game',
  blocks: 'Blocks',
};

function statusLabel(status: string): string {
  return status === 'accepted' || status === 'finished' ? 'Finished' : 'Working';
}

export function StudentWorkView({ classId }: { classId: string }) {
  const navigate = useNavigate();

  const work = useQuery<StudentWorkRow[]>({
    queryKey: ['teacher', 'student-work', classId],
    queryFn: () => getStudentWork(classId),
    enabled: !!classId,
  });

  if (work.isLoading) return <p className="lead-text">Loading student work…</p>;
  if (work.isError || !work.data)
    return <p className="lead-text text-brand-coral">Could not load student work.</p>;

  const rows = work.data;
  const totalProjects = rows.reduce((n, r) => n + r.projects.length, 0);

  return (
    <div data-testid="student-work">
      <p className="lead-text mb-6 text-[14px]">
        Review your students&apos; class projects between sessions. Open one to watch it in the
        read-only viewer. Personal projects are never shown.
      </p>

      {totalProjects === 0 && (
        <div data-testid="student-work-empty" className="card-base p-6 text-[14px] text-ink-soft">
          No class work yet — projects your students make for this class will appear here.
        </div>
      )}

      <div className="flex flex-col gap-8">
        {rows.map((row) => (
          <section key={row.kidId} data-testid="student-work-kid">
            <div className="mb-3 flex items-center gap-2">
              <span className="sticker-sky">{row.nickname}</span>
              <span className="text-[13px] text-ink-soft">
                {row.projects.length} {row.projects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            {row.projects.length === 0 ? (
              <p className="text-[13px] text-ink-soft">No class work yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {row.projects.map((p) => (
                  <StudentWorkCard
                    key={p.id}
                    project={p}
                    onOpen={() => navigate(`/teacher/classes/${classId}/kids/${row.kidId}`)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function StudentWorkCard({
  project,
  onOpen,
}: {
  project: StudentWorkProject;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="student-work-card"
      onClick={onOpen}
      className="card-base flex flex-col gap-2 p-3 text-left"
    >
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink/90">
        {project.thumbnailS3Key ? (
          <img src={project.thumbnailS3Key} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] font-semibold text-white/50">
            no preview yet
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-bold text-ink">{project.title}</span>
        {project.onWall && (
          <span data-testid="on-wall-badge" className="sticker-mint">
            🏫 On the wall
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <span className="sticker-sunshine">{KIND_LABEL[project.kind] ?? project.kind}</span>
        <span className="sticker-coral">{statusLabel(project.status)}</span>
      </div>
    </button>
  );
}
