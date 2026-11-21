// Trivia round sized to the wait. Owner: Frontend.
// TODO: GET /api/trivia, POST each answer to /api/trivia/answer.
export default function TriviaRound({ stationId }: { stationId: string }) {
  return <section className="rounded border p-3">Trivia for {stationId} goes here</section>;
}
