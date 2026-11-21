// Station character chat. Owner: Frontend (UI) + Characters (/api/chat).
// TODO: POST /api/chat and show the reply; optional voice playback.
export default function CharacterChat({ stationId }: { stationId: string }) {
  return <section className="rounded border p-3">Character chat for {stationId} goes here</section>;
}
