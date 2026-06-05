import { useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import { GameFrame } from './GameFrame';

// DEV-ONLY proof harness for the sandboxed Phaser runtime. Not part of the kid
// product, not behind auth — it exists to validate buildGameSrcDoc + GameFrame
// end to end before the real studio/agent are wired. Mounted at /playground-sandbox
// and guarded by import.meta.env.DEV in the router. Delete once PlaygroundStudioPage
// lands.

const PONG_JS = `
const W = 800, H = 600;

class Pong extends Phaser.Scene {
  create() {
    this.score = 0;
    this.player = this.add.rectangle(30, H / 2, 16, 110, 0x6ee7b7);
    this.cpu = this.add.rectangle(W - 30, H / 2, 16, 110, 0xfca5a5);
    this.physics.add.existing(this.player);
    this.physics.add.existing(this.cpu);
    this.player.body.setImmovable(true);
    this.cpu.body.setImmovable(true);

    this.ball = this.add.circle(W / 2, H / 2, 12, 0xffffff);
    this.physics.add.existing(this.ball);
    this.ball.body.setBounce(1, 1).setCollideWorldBounds(true);
    this.resetBall();

    this.physics.add.collider(this.ball, this.player, () => this.bump());
    this.physics.add.collider(this.ball, this.cpu);

    this.scoreText = this.add.text(W / 2, 40, '0', {
      fontFamily: 'monospace', fontSize: '48px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(W / 2, H - 28, 'Move your paddle with the mouse or ↑ / ↓', {
      fontFamily: 'monospace', fontSize: '16px', color: '#94a3b8',
    }).setOrigin(0.5);

    this.cursors = this.input.keyboard.createCursorKeys();
  }

  resetBall() {
    this.ball.body.reset(W / 2, H / 2);
    const dir = Math.random() < 0.5 ? -1 : 1;
    this.ball.body.setVelocity(260 * dir, Phaser.Math.Between(-160, 160));
  }

  bump() {
    this.score += 1;
    this.scoreText.setText(String(this.score));
    const b = this.ball.body;
    b.setVelocity(b.velocity.x * 1.05, b.velocity.y * 1.05);
  }

  update() {
    const pointer = this.input.activePointer;
    if (pointer.worldY) this.player.y = Phaser.Math.Clamp(pointer.worldY, 55, H - 55);
    if (this.cursors.up.isDown) this.player.y = Math.max(55, this.player.y - 7);
    if (this.cursors.down.isDown) this.player.y = Math.min(H - 55, this.player.y + 7);
    this.player.body.updateFromGameObject();

    // Simple CPU: track the ball.
    this.cpu.y = Phaser.Math.Linear(this.cpu.y, this.ball.y, 0.08);
    this.cpu.y = Phaser.Math.Clamp(this.cpu.y, 55, H - 55);
    this.cpu.body.updateFromGameObject();

    // Ball left the field — reset and (for the demo) keep the rally going.
    if (this.ball.x < 0 || this.ball.x > W) this.resetBall();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#0f172a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
  scene: Pong,
});
`;

const PONG_FILES: VfsFile[] = [
  { path: 'game.js', content: PONG_JS, kind: 'text', size: PONG_JS.length },
];

export function GameSandboxDevPage() {
  const [runKey, setRunKey] = useState(0);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-2">
        <div className="font-bold text-ink">🎮 Game sandbox (dev)</div>
        <button
          onClick={() => setRunKey((k) => k + 1)}
          className="rounded-full bg-brand-mint px-4 py-1.5 text-sm font-bold text-ink hover:opacity-90"
        >
          ↻ Play again
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <GameFrame files={PONG_FILES} runKey={runKey} showConsole />
      </div>
    </div>
  );
}
