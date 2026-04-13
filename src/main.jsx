import './index.css'

const root = document.getElementById('root')
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
const isConfigured = apiKey && !apiKey.startsWith('your_')

if (!isConfigured) {
  root.innerHTML = `<style>
body{margin:0;background:#080d1a}
.sw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.sc{max-width:520px;width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:40px;text-align:center;font-family:-apple-system,sans-serif}
.si{font-size:3.5rem;margin-bottom:16px;color:#f5c842}
h1{color:#f5c842;font-size:1.6rem;font-weight:800;margin-bottom:12px}
p{color:#8892b0;font-size:.95rem;line-height:1.6;margin-bottom:24px}
code{color:#f5c842;background:rgba(245,200,66,.1);padding:2px 8px;border-radius:4px;font-family:monospace}
.sb{background:rgba(0,0,0,.4);border-radius:12px;padding:20px;text-align:left;margin-bottom:24px}
.sbt{color:#60a5fa;font-size:.82rem;font-weight:700;margin-bottom:10px;text-transform:uppercase}
ol{color:#8892b0;font-size:.9rem;line-height:2.4;padding-left:20px;margin:0}
ol strong{color:#f0f4ff}
</style>
<div class='sw'><div class='sc'>
<div class='si'>&#x2B21;</div>
<h1>Firebase Setup Required</h1>
<p>Your <code>.env</code> file has placeholder values. Add real Firebase keys to launch CertifyPro.</p>
<div class='sb'>
<p class='sbt'>How to fix (5 minutes):</p>
<ol>
<li>Go to <strong>console.firebase.google.com</strong></li>
<li>Create project &rarr; Add Web App &rarr; copy config</li>
<li>Paste values into your <strong>\.env</strong> file</li>
<li>Restart: <strong>Ctrl+C</strong> then <strong>npm run dev</strong></li>
</ol>
</div>
<p style='color:#4a556e;font-size:.8rem;margin:0'>See the Firebase Setup Guide artifact for details.</p>
</div></div>`
} else {
  Promise.all([import('react'), import('react-dom/client'), import('./App.jsx')])
    .then(([React, ReactDOM, { default: App }]) => {
      ReactDOM.createRoot(root).render(
        React.createElement(React.StrictMode, null, React.createElement(App))
      )
    })
}
