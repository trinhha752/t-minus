// Game screens (map, stations, games, bosses) share the run state and the phone frame.
// Pages outside this group (e.g. /dev, /leaderboard) render full-width without the frame.
import { PhoneFrame } from "@/components/run/PhoneFrame";
import { RunProvider } from "@/components/run/RunProvider";

export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <RunProvider>
      <PhoneFrame>{children}</PhoneFrame>
    </RunProvider>
  );
}
