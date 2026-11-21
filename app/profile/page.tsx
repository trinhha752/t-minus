// Profile screen: level, streak, CO2 saved, badges. Owner: Frontend.
import BadgeGrid from "@/components/BadgeGrid";

export default function ProfilePage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p>Level, points, streak and CO₂ saved go here (GET /api/me).</p>
      <BadgeGrid />
    </main>
  );
}
