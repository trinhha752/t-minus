// /play was the stand-alone test page. Its flow now lives inside the game:
// map → station card → Play → /station/[id]/arrive → the station's game.
import { redirect } from "next/navigation";

export default function PlayPage() {
  redirect("/");
}
