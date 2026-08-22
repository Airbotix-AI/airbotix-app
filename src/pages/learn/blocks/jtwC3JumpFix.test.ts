import { describe, expect, it } from 'vitest';

import type { BlocksProject } from './blocksModel';
import {
  JTW_C3_P6_LESSON_ID,
  JTW_C3_P6_PAGE_IDS,
  JTW_C3_P6_SCRIPT_IDS,
  JTW_C3_P6_TARGET_START_CELL,
  JTW_C3_P6_TEMPLATES,
  JTW_C3_P6_WRONG_START_CELL,
  jtwC3JumpBoundaries,
  jtwC3JumpBugProject,
  jtwC3JumpBugVersion,
  jtwC3JumpContinuous,
  jtwC3JumpDecodeBoundaries,
  jtwC3JumpEncodeBoundaries,
  jtwC3JumpFirstBreak,
  jtwC3JumpFixComplete,
  jtwC3JumpFixVersion,
  jtwC3JumpProject,
  jtwC3JumpStartDiff,
} from './jtwC3JumpFix';
import { JTW_C3_MONKEY_KING_ID, JTW_C3_RAFT_ID } from './jtwC3Stage';
import { JTW_C3_WEATHER_VERSIONS, type JtwC3Weather } from './jtwC3WeatherBuild';
import { runPageFlow } from './pageFlowRun';
import { storyMissionProgramMatches } from './storyMissionProgress';

const VERSIONS: JtwC3Weather[] = ['starry', 'morning'];
const instantSleep = () => Promise.resolve();

/** A deep copy so a mutation in one test never leaks into the next. */
function fixed(version: JtwC3Weather): BlocksProject {
  return JSON.parse(
    JSON.stringify(jtwC3JumpProject(version, JTW_C3_P6_TARGET_START_CELL)),
  ) as BlocksProject;
}

function bug(version: JtwC3Weather): BlocksProject {
  return JSON.parse(JSON.stringify(jtwC3JumpBugProject(version))) as BlocksProject;
}

function seaActor(project: BlocksProject, id: string) {
  const actor = project.pages[1].characters.find((candidate) => candidate.id === id);
  if (!actor) throw new Error(`page 2 has no ${id}`);
  return actor;
}

describe('jtwC3JumpFix — the shipped bug', () => {
  it.each(VERSIONS)('%s: ships Page 2 on the wrong side and nothing else wrong', (version) => {
    const project = bug(version);
    const weather = JTW_C3_WEATHER_VERSIONS.find((candidate) => candidate.id === version)!;

    expect(project.lessonId).toBe(JTW_C3_P6_LESSON_ID);
    expect(project.pages.map((page) => page.id)).toEqual([...JTW_C3_P6_PAGE_IDS]);
    // The child's own sea and their own C3-P5 chain come across untouched.
    expect(project.pages[1].background).toBe(weather.scene);
    expect(
      seaActor(project, JTW_C3_MONKEY_KING_ID).scripts.find(
        (script) => script.id === JTW_C3_P6_SCRIPT_IDS.seaLeg,
      )?.blocks,
    ).toEqual([...weather.chain]);
    // Both Page 2 actors stand on the wrong cell — the raft is what jumped, and
    // his feet have to stay on its deck (asset bible §2.4).
    for (const id of [JTW_C3_MONKEY_KING_ID, JTW_C3_RAFT_ID]) {
      expect(seaActor(project, id).start.gx).toBe(JTW_C3_P6_WRONG_START_CELL.gx);
      expect(seaActor(project, id).start.gy).toBe(JTW_C3_P6_WRONG_START_CELL.gy);
      // 视觉尺寸与位置校准分离: `size` never moves with the cell.
      expect(seaActor(project, id).start.size).toBe(3);
    }

    expect(jtwC3JumpBugVersion(project)).toBe(version);
    expect(jtwC3JumpFixVersion(project)).toBeNull();
    expect(jtwC3JumpFixComplete(project)).toBe(false);
    expect(jtwC3JumpStartDiff(project)).toEqual([]);
  });

  it('names one whitelisted starter per weather version', () => {
    expect(JTW_C3_P6_TEMPLATES).toEqual({
      starry: 'blocks_jtw_c3_p6_starry',
      morning: 'blocks_jtw_c3_p6_morning',
    });
  });
});

describe('jtwC3JumpFix — the only legal repair', () => {
  it.each(VERSIONS)('%s: accepts Page 2 moved back to the contract cell', (version) => {
    const project = fixed(version);
    expect(jtwC3JumpFixVersion(project)).toBe(version);
    expect(jtwC3JumpFixComplete(project)).toBe(true);
    expect(jtwC3JumpBugVersion(project)).toBeNull();
    // 单一位置 diff: exactly one row, and it is the page-2 start.
    expect(jtwC3JumpStartDiff(project)).toEqual(['page2-start:16-8->2-8']);
    // The studio reads the same contract through its one delegating branch.
    expect(storyMissionProgramMatches(project, JTW_C3_P6_LESSON_ID)).toBe(true);
  });

  it('refuses a repair that only moves the monkey king off the raft', () => {
    const project = bug('starry');
    seaActor(project, JTW_C3_MONKEY_KING_ID).start.gx = JTW_C3_P6_TARGET_START_CELL.gx;
    expect(jtwC3JumpFixVersion(project)).toBeNull();
    // The two actors disagree, so there is no single position to report.
    expect(jtwC3JumpStartDiff(project)).toEqual([]);
  });

  it('refuses a start that is merely close to the contract cell', () => {
    const project = fixed('starry');
    seaActor(project, JTW_C3_MONKEY_KING_ID).start.gx = 3;
    seaActor(project, JTW_C3_RAFT_ID).start.gx = 3;
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a repair that also changes Page 1 exit', () => {
    const project = fixed('starry');
    const depart = project.pages[0].characters
      .find((actor) => actor.id === JTW_C3_MONKEY_KING_ID)!
      .scripts.find((script) => script.id === JTW_C3_P6_SCRIPT_IDS.depart)!;
    depart.blocks = depart.blocks.map((block) =>
      block.op === 'move_right' ? { op: 'move_right', n: 2 } : block,
    );
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a repair that deletes the weather chain', () => {
    const project = fixed('morning');
    const seaLeg = seaActor(project, JTW_C3_MONKEY_KING_ID).scripts.find(
      (script) => script.id === JTW_C3_P6_SCRIPT_IDS.seaLeg,
    )!;
    seaLeg.blocks = seaLeg.blocks.filter(
      (block) => block.op !== 'set_speed' && block.op !== 'say' && block.op !== 'play_sound',
    );
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a repair that adds a louder sound', () => {
    const project = fixed('starry');
    const seaLeg = seaActor(project, JTW_C3_MONKEY_KING_ID).scripts.find(
      (script) => script.id === JTW_C3_P6_SCRIPT_IDS.seaLeg,
    )!;
    seaLeg.blocks = [seaLeg.blocks[0], { op: 'play_sound', n: 2 }, ...seaLeg.blocks.slice(1)];
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a repair that points the sea exit back at Page 1', () => {
    const project = fixed('starry');
    const seaLeg = seaActor(project, JTW_C3_MONKEY_KING_ID).scripts.find(
      (script) => script.id === JTW_C3_P6_SCRIPT_IDS.seaLeg,
    )!;
    seaLeg.blocks = seaLeg.blocks.map((block) =>
      block.op === 'goto_page' ? { op: 'goto_page', n: 1 } : block,
    );
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a repair that also moves Page 3 (multiple pages can be modified at the same time)', () => {
    const project = fixed('starry');
    const arrivalMonkey = project.pages[2].characters.find(
      (actor) => actor.id === JTW_C3_MONKEY_KING_ID,
    )!;
    arrivalMonkey.start.gx = 5;
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a repair that shrinks the sprite instead of moving it', () => {
    const project = fixed('starry');
    seaActor(project, JTW_C3_MONKEY_KING_ID).start.size = 2;
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a starry chain saved on the mist sea', () => {
    const project = fixed('starry');
    project.pages[1].background = JTW_C3_WEATHER_VERSIONS[1].scene;
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });

  it('refuses a project from another lesson', () => {
    const project = fixed('starry');
    project.lessonId = 'jtw-s1-c3-p5';
    expect(jtwC3JumpFixVersion(project)).toBeNull();
  });
});

describe('jtwC3JumpFix — continuity measured off a real page-flow run', () => {
  it.each(VERSIONS)('%s: the shipped bug really breaks Page 1 → Page 2', async (version) => {
    const run = await runPageFlow(jtwC3JumpBugProject(version), {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: instantSleep,
    });
    // The route still works — the scene's "完整路线仍到Page 3".
    expect(run.trace).toEqual([1, 2, 3]);
    expect(run.stoppedBy).toBe('end');

    const boundaries = jtwC3JumpBoundaries(run);
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]).toMatchObject({
      from: 1,
      to: 2,
      exitCell: '7-9',
      enterCell: '16-8',
      continuous: false,
    });
    // Page 2 → Page 3 is fine: he still leaves on the right and enters left.
    expect(boundaries[1].continuous).toBe(true);
    expect(jtwC3JumpContinuous(run)).toBe(false);
    expect(jtwC3JumpFirstBreak(run)).toMatchObject({ from: 1, to: 2 });
  });

  it.each(VERSIONS)('%s: the repaired program closes every boundary', async (version) => {
    const run = await runPageFlow(fixed(version), {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: instantSleep,
    });
    expect(run.trace).toEqual([1, 2, 3]);
    expect(run.stoppedBy).toBe('end');
    expect(jtwC3JumpBoundaries(run).map((boundary) => boundary.enterCell)).toEqual(['2-8', '2-9']);
    expect(jtwC3JumpContinuous(run)).toBe(true);
    expect(jtwC3JumpFirstBreak(run)).toBeNull();
  });

  it('round-trips boundary evidence and drops malformed rows', async () => {
    const run = await runPageFlow(jtwC3JumpBugProject('starry'), {
      trackCharacterId: JTW_C3_MONKEY_KING_ID,
      sleep: instantSleep,
    });
    const rows = jtwC3JumpEncodeBoundaries(jtwC3JumpBoundaries(run));
    expect(rows[0]).toBe('page1->page2:7-9:16-8:break');
    expect(jtwC3JumpDecodeBoundaries(rows)).toEqual(jtwC3JumpBoundaries(run));
    expect(jtwC3JumpDecodeBoundaries(['nonsense', ...rows])).toHaveLength(rows.length);
  });
});
