import "./Loader.css";

// Loader component — shows a spinning gold ring
// Usage:
//   <Loader />              → inline spinner
//   <Loader fullScreen />   → covers the entire viewport (used by ProtectedRoute)

export default function Loader({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="loader-fullscreen">
        <div className="loader-inner">
          <div className="loader-ring" />
          <span className="loader-brand">CertifyPro</span>
        </div>
      </div>
    );
  }
  return <div className="loader-ring" />;
}
