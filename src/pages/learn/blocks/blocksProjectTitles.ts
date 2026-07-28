const LEGACY_BLOCKS_PROJECT_TITLES: Readonly<Record<string, string>> = {
  '西游记 · 我的第一次问候': 'Journey to the West · My First Greeting',
}

export function blocksProjectDisplayTitle(title: string): string {
  return LEGACY_BLOCKS_PROJECT_TITLES[title] ?? title
}
