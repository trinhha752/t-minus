// mastra/index.ts — the Mastra instance: the Conductor agent and the plan-ride
// workflow, with storage (memory, workflow snapshots) in Tiger Data.
// Used by /api/chat and /api/plan-ride.

import { Mastra } from "@mastra/core";
import { storage } from "./storage";
import { conductor } from "./agents/conductor";
import { planRide } from "./workflows/plan-ride";

export const mastra = new Mastra({
  agents: { conductor },
  workflows: { planRide },
  storage,
});
