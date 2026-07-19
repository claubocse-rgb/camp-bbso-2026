import TeamsManager from '../components/TeamsManager'

export default function EchipeJocuri() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Echipe jocuri</h1>
        <p className="muted">Grupele pentru jocuri și competiții. Echipa ta e evidențiată.</p>
      </header>
      <TeamsManager kind="game" />
    </div>
  )
}
