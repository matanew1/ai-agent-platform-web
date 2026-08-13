export function LoadingScreen() {
  return (
    <div className="loading">
      <div className="loading-screen-inner">
        <span className="loading-spinner" />
        <span>Connecting to your workspace…</span>
      </div>
    </div>
  );
}
