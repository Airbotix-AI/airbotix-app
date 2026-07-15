// Playground (Creative Code Studio) feature flags.
//
// AI asset generation is currently DISABLED. The kid-facing ENTRY POINTS — the
// Asset Viewer's ✨ Generate bar + Remix bar, and the chat "make me a picture"
// intent routing — are hidden / short-circuited while the feature is paused.
//
// NONE of the generation code is removed: the seam (`assetGen`), the global
// `generationStore`, the backend `POST /llm/generate-asset` endpoint and the
// demo tour all stay intact, so flipping this back to `true` fully restores the
// feature with no other change.
//
// The public `/try/playground` marketing demo is intentionally UNAFFECTED: it
// drives an offline art seam and bypasses this flag (see `AssetViewerPane` /
// `demoAssetGen`), so the guided tour still showcases the feature.
export const ASSET_GENERATION_ENABLED = false;
