// game/brake.ts
// "Stop at the platform": the default station level.
//
// Your train comes into the station. HOLD to brake, release to coast. Stop
// with the front of the train on the STOP marker. Three stops, each faster.
// Timing and nerve, no content needed, one thumb.
//
// Browser-only (Phaser touches window). Load it with a dynamic import from a
// client component: see components/game/BrakeGame.tsx.

import * as Phaser from "phaser";

export interface BrakeRound {
  /** Metres from the marker, + past it, - short of it. null on an overrun. */
  errorM: number | null;
  score: number;
  label: "PERFECT" | "GREAT" | "GOOD" | "SHORT" | "OVERRUN";
}

export interface BrakeResult {
  score: number;
  cleared: boolean;
  durationMs: number;
  rounds: BrakeRound[];
}

export interface BrakeOptions {
  stationName: string;
  /** How many stops to play: 1 = just arriving at this station, 3 = the full practice run. */
  stops?: number;
  /** Hex like "#DA291C". */
  lineColor: string;
  onFinish: (r: BrakeResult) => void;
}

/* ---------- tuning ---------- */

const W = 360;
const H = 640;
const PX_PER_M = 12;
const ROUNDS = [
  { speed: 300, distance: 1300 },
  { speed: 360, distance: 1550 },
  { speed: 430, distance: 1800 },
];
const BRAKE = 380; // px/s^2 while held
const COAST = 15; // px/s^2 rolling resistance
const OVERRUN_M = 4; // past the marker this far = ran off the platform
const PLATFORM_BEFORE_M = 30;
const CLEAR_PER_STOP = 400; // clear = average 400 per stop (1200 of 3000)
const CAR_W = 144;
const CAR_H = 40;
const TRACK_Y = 420;
const START_X = 40;

export function scoreStop(errorM: number): BrakeRound {
  const off = Math.abs(errorM);
  const score = off <= 0.5 ? 1000 : Math.max(0, Math.round(1000 - (off - 0.5) * 90));
  const label = off <= 0.5 ? "PERFECT" : off <= 2 ? "GREAT" : off <= 5 ? "GOOD" : "SHORT";
  return { errorM: Math.round(errorM * 10) / 10, score, label };
}

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

/* ---------- sound: tiny WebAudio, created on the first tap (iOS rule) ---------- */

class Sfx {
  ctx: AudioContext | null = null;
  squeal: { osc: OscillatorNode; gain: GainNode } | null = null;

  unlock() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.value = 1900;
      filter.type = "bandpass";
      filter.frequency.value = 2400;
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(this.ctx.destination);
      osc.start();
      this.squeal = { osc, gain };
    } catch {
      this.ctx = null;
    }
  }

  setSqueal(on: boolean, speed: number) {
    if (!this.ctx || !this.squeal) return;
    const t = this.ctx.currentTime;
    this.squeal.gain.gain.setTargetAtTime(on ? Math.min(0.05, speed / 8000) : 0, t, 0.05);
    this.squeal.osc.frequency.setTargetAtTime(1500 + speed * 1.5, t, 0.1);
  }

  blip(freqs: number[], type: OscillatorType = "square") {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.16);
      o.connect(g).connect(this.ctx!.destination);
      o.start(now + i * 0.08);
      o.stop(now + i * 0.08 + 0.2);
    });
  }

  close() {
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

/* ---------- the scene ---------- */

class BrakeScene extends Phaser.Scene {
  private opts!: BrakeOptions;
  private sfx = new Sfx();
  private round = 0;
  private results: BrakeRound[] = [];
  private startedAt = 0;
  private rounds = ROUNDS;

  private train!: Phaser.GameObjects.Container;
  private v = 0;
  private holding = false;
  private moving = false;
  private markerX = 0;

  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hudRound!: Phaser.GameObjects.Text;
  private hudDist!: Phaser.GameObjects.Text;
  private speedBar!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Text;
  private world!: Phaser.GameObjects.Container;

  constructor(opts: BrakeOptions) {
    super("brake");
    this.opts = opts;
  }

  create() {
    this.rounds = ROUNDS.slice(0, Math.max(1, Math.min(ROUNDS.length, this.opts.stops ?? ROUNDS.length)));
    this.makeTextures();
    this.startedAt = this.time.now;

    // Tunnel wall, parallax.
    this.add.tileSprite(0, 0, W, H, "wall").setOrigin(0).setScrollFactor(0).setName("wall");
    this.world = this.add.container(0, 0);

    // Train.
    const body = this.add.image(0, 0, "car").setOrigin(0, 1);
    this.train = this.add.container(START_X, TRACK_Y, [body]);

    this.sparks = this.add.particles(0, 0, "px", {
      speed: { min: 60, max: 180 },
      angle: { min: 200, max: 250 },
      lifespan: 260,
      scale: { start: 1, end: 0 },
      tint: [0xfff2a8, 0xffb000, 0xffffff],
      quantity: 2,
      frequency: 25,
      emitting: false,
    });

    // Track in front of everything else in the world.
    this.add.tileSprite(0, TRACK_Y, W, 24, "track").setOrigin(0, 0).setScrollFactor(0).setName("track");

    // HUD (fixed to the screen).
    this.add.rectangle(0, 0, W, 92, 0x000000, 0.55).setOrigin(0).setScrollFactor(0);
    this.hudRound = this.text(16, 14, "", 14).setScrollFactor(0);
    this.hudDist = this.text(16, 38, "", 28).setScrollFactor(0);
    this.add.rectangle(16, 78, W - 32, 6, 0x333333).setOrigin(0, 0.5).setScrollFactor(0);
    this.speedBar = this.add.rectangle(16, 78, 0, 6, hex(this.opts.lineColor)).setOrigin(0, 0.5).setScrollFactor(0);
    this.hint = this.text(W / 2, H - 90, "HOLD TO BRAKE", 22).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: this.hint, alpha: 0.35, yoyo: true, repeat: -1, duration: 600 });

    // Input: anywhere on the screen, or space.
    this.input.on("pointerdown", () => {
      this.sfx.unlock();
      this.holding = true;
    });
    this.input.on("pointerup", () => (this.holding = false));
    this.input.on("pointerupoutside", () => (this.holding = false));
    const space = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    space?.on("down", () => {
      this.sfx.unlock();
      this.holding = true;
    });
    space?.on("up", () => (this.holding = false));

    this.cameras.main.setBackgroundColor("#0b0b12");

    this.events.once("shutdown", () => this.sfx.close());
    this.events.once("destroy", () => this.sfx.close());

    this.startRound();
  }

  private text(x: number, y: number, s: string, size: number) {
    return this.add.text(x, y, s, {
      fontFamily: "ui-monospace, Menlo, monospace",
      fontSize: `${size}px`,
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
    });
  }

  private makeTextures() {
    if (this.textures.exists("car")) return;
    const g = this.add.graphics();
    const line = hex(this.opts.lineColor);

    // 4x4 spark pixel
    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4).generateTexture("px", 4, 4).clear();

    // Subway car, chunky pixels.
    g.fillStyle(0x15151c).fillRect(0, CAR_H - 6, CAR_W, 6); // underframe
    g.fillStyle(0xcfd3da).fillRect(0, 4, CAR_W, CAR_H - 10); // body
    g.fillStyle(line).fillRect(0, 22, CAR_W, 6); // line stripe
    g.fillStyle(0x2a3550);
    for (let x = 10; x < CAR_W - 20; x += 24) g.fillRect(x, 9, 14, 10); // windows
    g.fillStyle(0x8b9099).fillRect(48, 6, 2, 28).fillRect(96, 6, 2, 28); // doors
    g.fillStyle(0xfff2a8).fillRect(CAR_W - 6, 24, 6, 6); // headlight
    g.fillStyle(0x0b0b12);
    [16, 36, CAR_W - 40, CAR_W - 20].forEach((x) => g.fillRect(x, CAR_H - 4, 10, 4)); // wheels
    g.generateTexture("car", CAR_W, CAR_H).clear();

    // Tunnel wall tile with a lamp.
    g.fillStyle(0x16161f).fillRect(0, 0, 96, H);
    g.fillStyle(0x1d1d29).fillRect(0, 300, 96, 8);
    g.fillStyle(0x23232f).fillRect(0, TRACK_Y - 120, 96, 4);
    g.fillStyle(0xffe9a8).fillRect(44, 150, 8, 6);
    g.fillStyle(0xffe9a8, 0.08).fillRect(28, 140, 40, 40);
    g.generateTexture("wall", 96, H).clear();

    // Track: ties + rail.
    g.fillStyle(0x3a2a1e);
    for (let x = 0; x < 48; x += 16) g.fillRect(x, 6, 10, 8);
    g.fillStyle(0x9aa0a8).fillRect(0, 2, 48, 3);
    g.fillStyle(0x0b0b12).fillRect(0, 14, 48, 10);
    g.generateTexture("track", 48, 24).clear();

    g.destroy();
  }

  /** Station platform + STOP marker for this round, in world space. */
  private buildStation() {
    this.world.removeAll(true);
    const line = hex(this.opts.lineColor);
    const m = this.markerX;
    const x0 = m - PLATFORM_BEFORE_M * PX_PER_M;
    const x1 = m + OVERRUN_M * PX_PER_M;

    const platform = this.add.rectangle(x0, TRACK_Y - 18, x1 - x0, 60, 0x4a4d57).setOrigin(0, 1);
    const edge = this.add.rectangle(x0, TRACK_Y - 18, x1 - x0, 5, 0xf2c200).setOrigin(0, 1);
    const end = this.add.rectangle(x1, TRACK_Y - 18, 6, 90, 0xb3261e).setOrigin(0, 1);
    const sign = this.add.rectangle(m - 170, TRACK_Y - 150, 180, 28, line).setOrigin(0.5);
    const name = this.text(m - 170, TRACK_Y - 150, this.opts.stationName.toUpperCase(), 13).setOrigin(0.5);

    // STOP post and the line to stop on.
    const post = this.add.rectangle(m, TRACK_Y - 18, 4, 120, 0xf2c200).setOrigin(0.5, 1);
    const plate = this.add.rectangle(m, TRACK_Y - 138, 46, 22, 0xb3261e).setOrigin(0.5);
    const stop = this.text(m, TRACK_Y - 138, "STOP", 12).setOrigin(0.5);
    const dash: Phaser.GameObjects.Rectangle[] = [];
    for (let y = TRACK_Y - 16; y < TRACK_Y + 20; y += 8) dash.push(this.add.rectangle(m, y, 3, 4, 0xffffff).setOrigin(0.5, 0));

    this.world.add([platform, edge, end, sign, name, post, plate, stop, ...dash]);
  }

  private startRound() {
    const r = this.rounds[this.round];
    this.markerX = START_X + CAR_W + r.distance;
    this.buildStation();
    this.train.x = START_X;
    this.v = r.speed;
    this.moving = true;
    this.hudRound.setText(
      this.rounds.length === 1
        ? `ARRIVING · ${this.opts.stationName.toUpperCase()}`
        : `STOP ${this.round + 1}/${this.rounds.length} · ${this.opts.stationName.toUpperCase()}`
    );
    this.hint.setVisible(true);
  }

  update(_t: number, dtMs: number) {
    const dt = Math.min(dtMs, 50) / 1000;

    // Camera: rear of the train 20px from the left edge, so you see as much
    // track ahead as possible. Never scrolls vertically.
    this.cameras.main.setScroll(Math.round(this.train.x - 20), 0);

    // Parallax.
    const cam = this.cameras.main.scrollX;
    (this.children.getByName("wall") as Phaser.GameObjects.TileSprite).tilePositionX = cam * 0.5;
    (this.children.getByName("track") as Phaser.GameObjects.TileSprite).tilePositionX = cam;

    if (!this.moving) {
      this.sfx.setSqueal(false, 0);
      this.sparks.stop();
      return;
    }

    const braking = this.holding && this.v > 0;
    this.v = Math.max(0, this.v - (braking ? BRAKE : COAST) * dt);
    this.train.x += this.v * dt;

    const front = this.train.x + CAR_W;
    const toMarkerM = (this.markerX - front) / PX_PER_M;
    if (process.env.NODE_ENV !== "production") {
      // Dev-only readout for automated playtests (see the play-test script).
      (window as unknown as { __brake?: object }).__brake = { toMarkerM, v: this.v, round: this.round };
    }
    this.hudDist.setText(toMarkerM >= 0 ? `${toMarkerM.toFixed(1)} m` : `+${(-toMarkerM).toFixed(1)} m PAST`);
    this.hudDist.setColor(toMarkerM < -1 ? "#ff6b5e" : "#ffffff");
    this.speedBar.width = ((W - 32) * this.v) / ROUNDS[ROUNDS.length - 1].speed;

    // Brake feedback: sparks at the wheels, squeal, a little rumble.
    if (braking && this.v > 20) {
      this.sparks.setPosition(this.train.x + CAR_W - 24, TRACK_Y - 2);
      if (!this.sparks.emitting) this.sparks.start();
      if (this.v > 200) this.cameras.main.shake(60, 0.002);
    } else if (this.sparks.emitting) {
      this.sparks.stop();
    }
    this.sfx.setSqueal(braking && this.v > 20, this.v);

    if (-toMarkerM > OVERRUN_M) return this.endRound({ errorM: null, score: 0, label: "OVERRUN" });
    if (this.v <= 0) return this.endRound(scoreStop(-toMarkerM));
  }

  private endRound(result: BrakeRound) {
    this.moving = false;
    this.holding = false;
    this.hint.setVisible(false);
    this.results.push(result);

    const good = result.label === "PERFECT" || result.label === "GREAT";
    if (result.label === "OVERRUN") {
      this.cameras.main.shake(300, 0.012);
      this.sfx.blip([220, 160], "sawtooth");
    } else if (result.label === "PERFECT") {
      this.cameras.main.flash(180, 255, 242, 168);
      this.sfx.blip([784, 988, 1319]);
    } else {
      this.sfx.blip(good ? [659, 880] : [440]);
    }

    const detail =
      result.errorM === null
        ? "Ran off the platform"
        : `${Math.abs(result.errorM).toFixed(1)} m ${result.errorM >= 0 ? "past" : "short"}`;
    const banner = this.text(W / 2, 250, result.label, result.label === "PERFECT" ? 48 : 40)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setColor(result.label === "OVERRUN" ? "#ff6b5e" : good ? "#f2c200" : "#ffffff")
      .setScale(0.2);
    const sub = this.text(W / 2, 300, `${detail} · +${result.score}`, 16).setOrigin(0.5).setScrollFactor(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 260, ease: "Back.Out" });

    this.time.delayedCall(1500, () => {
      banner.destroy();
      sub.destroy();
      this.round++;
      if (this.round < this.rounds.length) this.startRound();
      else this.finish();
    });
  }

  private finish() {
    const score = this.results.reduce((s, r) => s + r.score, 0);
    this.opts.onFinish({
      score,
      cleared: score >= CLEAR_PER_STOP * this.rounds.length,
      durationMs: Math.round(this.time.now - this.startedAt),
      rounds: this.results,
    });
  }
}

/** Mount the level into `parent`. Call `.destroy(true)` on the result to unmount. */
export function createBrakeGame(parent: HTMLElement, opts: BrakeOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    pixelArt: true,
    backgroundColor: "#0b0b12",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    scene: new BrakeScene(opts),
  });
}
