import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { api } from '@/lib/api';
import {
  ART_TASK_DRAW_MODES,
  drawModeFromApi,
  type ArtTaskDetail,
  type ArtTaskDrawMode,
} from './artTaskTypes';

export interface ArtTaskRuntime {
  taskSlug: string | null;
  task: ArtTaskDetail | null;
  mode: ArtTaskDrawMode;
  stepIndex: number;
  setStepIndex(value: number | ((current: number) => number)): void;
  referenceVisible: boolean;
  setReferenceVisible(value: boolean | ((current: boolean) => boolean)): void;
  traceOpacity: number;
  setTraceOpacity(value: number): void;
  isLoading: boolean;
  isError: boolean;
}

export function useArtTaskRuntime(missionTaskSlug?: string): ArtTaskRuntime {
  const [searchParams] = useSearchParams();
  const taskSlug = searchParams.get('task') ?? missionTaskSlug ?? null;
  const query = useQuery<ArtTaskDetail>({
    queryKey: ['art-studio-task', taskSlug],
    queryFn: () =>
      api<ArtTaskDetail>(`/art-studio/tasks/${encodeURIComponent(taskSlug as string)}`),
    enabled: Boolean(taskSlug),
  });
  const task = query.data ?? null;
  const mode = drawModeFromApi(searchParams.get('mode') ?? task?.default_mode);
  const [stepIndex, setStepIndex] = useState(0);
  const [referenceVisible, setReferenceVisible] = useState(mode === ART_TASK_DRAW_MODES.look);
  const [traceOpacity, setTraceOpacity] = useState(0.28);

  useEffect(() => {
    setStepIndex(0);
  }, [taskSlug]);

  useEffect(() => {
    if (!task) return;
    setTraceOpacity(task.ghost.default_opacity);
    setReferenceVisible(mode === ART_TASK_DRAW_MODES.look);
  }, [task, mode]);

  return {
    taskSlug,
    task,
    mode,
    stepIndex,
    setStepIndex,
    referenceVisible,
    setReferenceVisible,
    traceOpacity,
    setTraceOpacity,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
