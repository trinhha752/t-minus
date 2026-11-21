// Map screen. Owner: Frontend.
import Link from "next/link";
import TMap from "@/components/TMap";
import BossBar from "@/components/BossBar";

const DEMO_STATIONS = [
  { id: "place-pktrm", name: "Park Street" },
  { id: "place-bucen", name: "BU Central" },
  { id: "place-harsq", name: "Harvard" },
  { id: "place-aqucl", name: "Aquarium" },
  { id: "place-chncl", name: "Chinatown" },
];

export default function MapPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Enchanted T</h1>
      <BossBar />
      <TMap />
      <ul className="flex flex-col gap-2">
        {DEMO_STATIONS.map((s) => (
          <li key={s.id}>
            <Link className="underline" href={`/station/${s.id}`}>
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
      <nav className="flex gap-4 text-sm">
        <Link href="/profile">Profile</Link>
        <Link href="/leaderboard">Leaderboard</Link>
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
