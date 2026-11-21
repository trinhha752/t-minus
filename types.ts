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
  /** Mean seconds behind schedule across that line's sampled stops. */
  avgDelaySeconds: number;
  /** How many stops are currently over the threshold. */
  laggingStops: number;
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
