// Shared contract between frontend and backend.
// Every /api/* route returns ApiResult<T> for one of the response types below.
// Change a shape here first, tell the team, then update the route and the UI.

export type Line = "Red" | "Green" | "Orange" | "Blue";

/** Times always travel as ISO 8601 strings, e.g. "2026-11-21T15:04:05Z". */
export type IsoTime = string;

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// GET /api/trains?line=Red | all            (Transit)
// ---------------------------------------------------------------------------
export interface Train {
  id: string;
  line: Line;
  lat: number;
  lon: number;
  status: string; // MBTA current_status, e.g. "IN_TRANSIT_TO"
}
export type TrainsResponse = Train[];

// ---------------------------------------------------------------------------
// GET /api/predictions?stop=place-pktrm      (Transit)
// ---------------------------------------------------------------------------
export interface Arrival {
  route: string; // e.g. "Red", "Green-B"
  direction: string; // e.g. "Alewife"
  secondsAway: number;
}
export type PredictionsResponse = Arrival[]; // next 3 arrivals

// ---------------------------------------------------------------------------
// GET /api/boss                               (Transit)
// ---------------------------------------------------------------------------
export interface BossState {
  line: Line;
  active: boolean;
  bossEventId: string | null;
  hpTotal: number;
  hpRemaining: number;
  averageDelaySeconds: number;
  since: IsoTime | null;
}
export type BossResponse = BossState[]; // one entry per line

// ---------------------------------------------------------------------------
// GET /api/trivia?stop=place-pktrm&wait=240   (Characters)
// ---------------------------------------------------------------------------
/** Sent to the browser. Never includes the answer index. */
export interface TriviaQuestion {
  id: string;
  stationId: string;
  question: string;
  options: string[];
  verified: boolean;
}
export interface TriviaRound {
  stationId: string;
  waitSeconds: number;
  /** Set when this round damages an active Delay Boss. */
  bossEventId: string | null;
  questions: TriviaQuestion[]; // 1, 3 or 5
}
export type TriviaResponse = TriviaRound;

// ---------------------------------------------------------------------------
// POST /api/trivia/answer                     (Backend)
// ---------------------------------------------------------------------------
export interface TriviaAnswerRequest {
  questionId: string;
  choiceIndex: number;
}
export interface TriviaAnswerResult {
  correct: boolean;
  pointsEarned: number;
  bossDamage: number;
  bossHpRemaining: number | null; // null when no boss is active
}

// ---------------------------------------------------------------------------
// POST /api/checkin                           (Backend)
// ---------------------------------------------------------------------------
export interface CheckinRequest {
  stationId: string;
  lat: number;
  lon: number;
}
export interface Badge {
  type: string; // e.g. "line-complete", "boss-defeated"
  label: string;
  earnedAt: IsoTime;
}
export interface CheckinResult {
  accepted: boolean;
  reason: string | null; // why it was rejected, e.g. "too far"
  pointsEarned: number;
  newBadge: Badge | null;
}

// ---------------------------------------------------------------------------
// POST /api/guess  and  GET /api/guess/[id]   (Backend)
// ---------------------------------------------------------------------------
export interface GuessRequest {
  stationId: string;
  guessMinutes: number;
}
export interface GuessCreated {
  guessId: string;
  targetArrivalAt: IsoTime;
}
export interface GuessStatus {
  guessId: string;
  resolved: boolean;
  actualMinutes: number | null;
  pointsEarned: number | null;
}

// ---------------------------------------------------------------------------
// GET /api/me                                 (Backend)
// ---------------------------------------------------------------------------
export interface Me {
  name: string;
  teamLine: Line;
  level: number;
  points: number;
  streak: number;
  co2SavedKg: number;
  badges: Badge[];
}

// ---------------------------------------------------------------------------
// GET /api/leaderboard?scope=line | user      (Backend)
// ---------------------------------------------------------------------------
export type LeaderboardScope = "line" | "user";
export interface LeaderboardEntry {
  rank: number;
  name: string; // line name when scope=line, rider name when scope=user
  points: number;
  line: Line;
}
export type LeaderboardResponse = LeaderboardEntry[];

// ---------------------------------------------------------------------------
// POST /api/chat                              (Characters)
// ---------------------------------------------------------------------------
export interface ChatRequest {
  stationId: string;
  message: string;
}
export interface Quest {
  id: string;
  stationId: string;
  title: string;
  description: string;
}
export interface ChatReply {
  reply: string;
  questGranted: Quest | null;
}
