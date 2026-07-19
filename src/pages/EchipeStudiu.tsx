import TeamsManager from '../components/TeamsManager'

export default function EchipeStudiu() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Echipe studiu</h1>
        <p className="muted">Grupele de studiu și membrii lor. Echipa ta e evidențiată.</p>
      </header>
      <TeamsManager kind="study" />
    </div>
  )
}
