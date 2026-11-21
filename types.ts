// types.ts
// The contract between frontend and backend. Everyone codes against this file.
// Change a shape HERE and nowhere else, then tell the team in chat.

/* ---------- lines ---------- */

// The MBTA's own route ids. Green has four branches.
export type RouteId =
  | "Red"
  | "Orange"
  | "Blue"
  | "Green-B"
  | "Green-C"
  | "Green-D"
  | "Green-E";

// What a player picks as their team, and what a boss spawns on.
// All four Green branches collapse into one "Green".
export type TeamLine = "Red" | "Orange" | "Blue" | "Green";

export const ALL_ROUTES: RouteId[] = [
  "Red",
  "Orange",
  "Blue",
  "Green-B",
  "Green-C",
  "Green-D",
  "Green-E",
];

export const ALL_TEAMS: TeamLine[] = ["Red", "Orange", "Blue", "Green"];

export function routeToTeam(route: RouteId): TeamLine {
  return route.startsWith("Green") ? "Green" : (route as TeamLine);
}

/* ---------- envelope ---------- */
// Every route returns one of these. No exceptions, so the frontend
// has exactly one error path.

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export const ok = <T,>(data: T): ApiOk<T> => ({ ok: true, data });
export const err = (error: string): ApiErr => ({ ok: false, error });

/* ---------- transit ---------- */

export interface Station {
  /** MBTA stop id, e.g. "place-pktrm". The primary key everywhere. */
  id: string;
  name: string;
  routes: RouteId[];
  lat: number;
  lon: number;
}

export interface Arrival {
  /** MBTA prediction id. */
  id: string;
  stopId: string;
  route: RouteId;
  /** 0 or 1. The MBTA defines which end each means per route. */
  directionId: 0 | 1;
  /** Where the train is headed, for display. May be null. */
  headsign: string | null;
  /** ISO string. arrival_time, falling back to departure_time. */
  time: string;
  /** Seconds from now. Negative means it already went. */
  secondsAway: number;
  /** MBTA status text, e.g. "On time". Often null on subway. */
  status: string | null;
}

export interface Vehicle {
  id: string;
  route: RouteId;
  lat: number;
  lon: number;
  bearing: number | null;
  /** INCOMING_AT | STOPPED_AT | IN_TRANSIT_TO */
  currentStatus: string | null;
  stopId: string | null;
}

/* ---------- boss ---------- */

export interface BossState {
  line: TeamLine;
  active: boolean;
  /** Mean seconds behind schedule over the last 15 min (delay_5m), never negative. */
  avgDelaySeconds: number;
  /** Distinct trains on this line currently 5+ min late, from the latest poll. */
  lateTrains: number;
  hpTotal: number;
  hpRemaining: number;
  /** ISO string, null when no boss is up. */
  startedAt: string | null;
  defeated: boolean;
}

/* ---------- player ---------- */

export interface Badge {
  type: "station" | "line" | "streak" | "boss";
  label: string;
  earnedAt: string;
}

export interface Me {
  id: string;
  name: string;
  team: TeamLine;
  level: number;
  points: number;
  streak: number;
  co2SavedKg: number;
  stampedStationIds: string[];
  badges: Badge[];
}

/* ---------- check in ---------- */

export interface CheckinRequest {
  stationId: string;
  lat: number;
  lon: number;
  /** Demo escape hatch. Skips the distance test. Keep it off in prod. */
  teleport?: boolean;
}

export interface CheckinResult {
  accepted: boolean;
  /** Why it was rejected, for the toast. */
  reason?: "too_far" | "already_today" | "unknown_station";
  metresAway?: number;
  pointsEarned: number;
  newBadges: Badge[];
}

/* ---------- arrival guess ---------- */

export interface GuessRequest {
  stationId: string;
  guessMinutes: number;
}

export interface Guess {
  id: string;
  stationId: string;
  guessMinutes: number;
  /** The prediction we are scoring against. */
  targetArrivalIso: string;
  resolved: boolean;
  actualMinutes: number | null;
  pointsEarned: number | null;
}

/* ---------- trivia ---------- */

/** What the browser is allowed to see. Note: no answer index. */
export interface TriviaQuestion {
  id: string;
  stationId: string;
  question: string;
  options: string[];
  /** false means a human has not checked this fact yet. Do not ship these. */
  verified: boolean;
}

export interface TriviaRound {
  roundId: string;
  stationId: string;
  questions: TriviaQuestion[];
  /** True when a boss is up on this station's line: answers do damage. */
  bossActive: boolean;
}

export interface TriviaAnswerRequest {
  roundId: string;
  questionId: string;
  choiceIndex: number;
}

export interface TriviaAnswerResult {
  correct: boolean;
  /** Only revealed after answering. */
  correctIndex: number;
  explanation: string | null;
  pointsEarned: number;
  /** 0 when no boss is up. */
  bossDamage: number;
  bossHpRemaining: number | null;
}

/* ---------- progression: stations are levels, a boss ends each chapter ---------- */

/**
 * The game engines. Each station reskins one of these, so a new station is
 * new art and copy, not a new game. The frontend picks the component by engine.
 */
export type GameEngine =
  | "timing"
  | "memory"
  | "pick-the-lie"
  | "rhythm"
  | "dodge"
  | "runner"
  | "puzzle";

/** POST /api/minigame/result: sent when a mini-game ends. */
export interface MiniGameResultRequest {
  stationId: string;
  /** From the chapter's station entry, e.g. "rooftop-run". */
  gameId: string;
  /** Whatever the game scores. Clamped server-side to 0..10000. */
  score: number;
  /** Did the player beat the level? Only a cleared run counts toward progress. */
  cleared: boolean;
  /** How long the run took. A "cleared" run under 3 seconds is rejected. */
  durationMs: number;
}

export interface MiniGameResult {
  runId: string;
  pointsEarned: number;
  /** True the first time this rider clears this station. */
  stationCleared: boolean;
  /** Set when this clear unlocked a chapter's final boss. */
  chapterBossUnlocked: string | null;
}

export interface ChapterStation {
  stationId: string;
  name: string;
  gameId: string;
  engine: GameEngine;
  cleared: boolean;
  bestScore: number | null;
}

export interface Chapter {
  id: string;
  name: string;
  line: TeamLine;
  bossStationId: string;
  bossName: string;
  stations: ChapterStation[];
  /** Every station in the chapter cleared. */
  bossUnlocked: boolean;
  bossDefeated: boolean;
  /** An unfinished final boss fight, to resume. */
  activeFightId: string | null;
}

/** Earned by helping beat a delay (mini) boss. Spent on a final boss fight. */
export interface Buff {
  id: string;
  type: "boss_damage";
  /** 0.5 means +50% damage. */
  value: number;
  grantedAt: string;
  expiresAt: string;
  /** Which line's mini boss granted it. */
  fromLine: TeamLine | null;
}

/** GET /api/progress */
export interface Progress {
  chapters: Chapter[];
  /** Unspent, unexpired buffs. */
  buffs: Buff[];
}

/** POST /api/final-boss/start { chapterId } -> FinalBossFight (resumes an open one). */
export interface FinalBossStartRequest {
  chapterId: string;
}

export interface FinalBossFight {
  id: string;
  chapterId: string;
  bossName: string;
  hpTotal: number;
  hpRemaining: number;
  /** 1 plus every buff spent on this fight. */
  damageMultiplier: number;
  defeated: boolean;
  startedAt: string;
  endedAt: string | null;
}

/** POST /api/final-boss/hit { fightId }: one landed attack (a cleared round or a correct answer). */
export interface FinalBossHitRequest {
  fightId: string;
}

export interface FinalBossHitResult {
  damage: number;
  hpRemaining: number;
  defeated: boolean;
  /** Bonus points, only on the killing blow. */
  pointsEarned: number;
}

/* ---------- leaderboard ---------- */

export interface LeaderboardRow {
  rank: number;
  name: string;
  points: number;
  team: TeamLine;
}

export interface Leaderboard {
  scope: "line" | "user";
  rows: LeaderboardRow[];
  /** Points per team line, for the map. */
  teamTotals: Record<TeamLine, number>;
}

/* ---------- characters ---------- */

export interface ChatRequest {
  stationId: string;
  message: string;
}

export interface ChatReply {
  characterName: string;
  text: string;
  questGranted: string | null;
}
