import { listBlocksProjects, loadBlocksProject } from '../blocksApi'
import { jtwC4P7Version } from '../jtwC4DualBuild'

const C4_P7_PART_ID = 'jtw-s1-c4-p7'

/** Find the child's real P7 Personal Ship through the server-backed VFS. */
export async function findC4PersonalShipBuild(kidId: string) {
  for (const meta of (await listBlocksProjects(kidId)).slice(0, 10)) {
    try {
      const loaded = await loadBlocksProject(meta.id)
      const version = jtwC4P7Version(loaded.project)
      if (!version) continue
      return {
        projectId: meta.id,
        project: loaded.project,
        savedVersion: loaded.version,
        version,
        snapshot: JSON.stringify(loaded.project),
        dualRunCompleted: Boolean(loaded.storyProgress?.completed?.[C4_P7_PART_ID]),
      }
    } catch {
      // Ignore unreadable legacy projects and keep searching for the P7 document.
    }
  }
  return null
}
