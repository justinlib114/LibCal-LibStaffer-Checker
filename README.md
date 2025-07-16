<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  
<body>

  <h1>🧭 Desk Conflict Checker</h1>

  <p>
    This is a Node.js-based application that <strong>identifies scheduling conflicts</strong> for library staff by aggregating data from 
    <strong>Springshare's LibStaffer and LibCal APIs</strong>. It provides a <strong>visual interface</strong> for filtering and reviewing overlapping shifts, events, appointments, and time off.
  </p>

  <h2>🔍 Features</h2>
  <ul>
    <li><strong>Pulls data from:</strong>
      <ul>
        <li><strong>LibStaffer:</strong> Scheduled shifts (filtered by time window), Approved time off</li>
        <li><strong>LibCal:</strong> Calendar events (multiple calendars), Appointment bookings</li>
      </ul>
    </li>
    <li>Detects and flags <strong>overlapping schedule conflicts</strong></li>
    <li>Renders a <strong>grouped and color-coded dashboard</strong> with filters by:
      <ul>
        <li>Name</li>
        <li>Entry type (shift, time off, event, appointment, conflict)</li>
        <li>Date range</li>
      </ul>
    </li>
    <li>Staff grouped in collapsible sections:
      <ul>
        <li>Adult Services (AS)</li>
        <li>Youth Services (YS)</li>
        <li>Part Timers (PT)</li>
        <li>Administration (AD)</li>
      </ul>
    </li>
    <li>Filters to working hours: <strong>9:00 AM – 9:00 PM</strong></li>
  </ul>

  <h2>🖥️ UI Overview</h2>
  <ul>
    <li><strong>Color Coding:</strong>
      <ul>
        <li>💙 Shift = Blue</li>
        <li>🟠 Time Off = Orange</li>
        <li>🟢 Event = Green</li>
        <li>💜 Appointment = Purple</li>
        <li>🔴 Conflict = Red (bold)</li>
      </ul>
    </li>
    <li><strong>Filters:</strong> Live search, checkboxes, and date range inputs</li>
    <li><strong>Collapsible sections:</strong> Toggle groups open/closed</li>
  </ul>

  <h2>🛠️ Tech Stack</h2>
  <ul>
    <li>Node.js + Express</li>
    <li>Axios (for API requests)</li>
    <li>Day.js (for date & timezone logic)</li>
    <li>EJS (for server-rendered views)</li>
    <li>Environment variables for sensitive config</li>
  </ul>

  <h2>⚙️ Setup Instructions</h2>
  <ol>
    <li><strong>Clone this repo</strong> and install dependencies:
      <pre><code>npm install</code></pre>
    </li>
    <li><strong>Create a <code>.env</code> file</strong> with your credentials:
      <pre><code>LIBSTAFFER_CLIENT_ID=your_libstaffer_client_id
LIBSTAFFER_CLIENT_SECRET=your_libstaffer_client_secret
LIBCAL_CLIENT_ID=your_libcal_client_id
LIBCAL_CLIENT_SECRET=your_libcal_client_secret
LIBCAL_CAL_IDS=12345,67890
PORT=3000</code></pre>
    </li>
    <li><strong>Run the server:</strong>
      <pre><code>node server.js</code></pre>
    </li>
    <li>Open your browser to <a href="http://localhost:3000">http://localhost:3000</a></li>
  </ol>

  <h2>📎 Notes</h2>
  <ul>
    <li>All times are in <strong>America/New_York</strong> timezone</li>
    <li>Events outside 9AM–9PM are excluded from conflict detection</li>
    <li>Staff display names and groups are mapped manually</li>
  </ul>

 <h1>🚀 Deploy Desk Conflict Checker to Render</h1>

  <div class="section">
    <h2>📝 Prerequisites</h2>
    <ul>
      <li>A <a href="https://render.com" target="_blank">Render</a> account</li>
      <li>Your code pushed to a GitHub repository</li>
    </ul>
  </div>

  <div class="section">
    <h2>🔧 Step 1: Push to GitHub</h2>
    <pre><code>git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main</code></pre>
  </div>

  <div class="section">
    <h2>🛠️ Step 2: Prepare for Render</h2>
    <ul>
      <li>Ensure your project has a <code>package.json</code> file with a start script:</li>
    </ul>
    <pre><code>{
  "scripts": {
    "start": "node server.js"
  }
}</code></pre>
    <ul>
      <li>Ensure you have a <code>server.js</code> file</li>
      <li>Optionally include a <code>.env.example</code> file:</li>
    </ul>
    <pre><code>LIBSTAFFER_CLIENT_ID=
LIBSTAFFER_CLIENT_SECRET=
LIBCAL_CLIENT_ID=
LIBCAL_CLIENT_SECRET=
LIBCAL_CAL_IDS=
PORT=3000</code></pre>
  </div>

  <div class="section">
    <h2>🌐 Step 3: Create a Web Service</h2>
    <ol>
      <li>Log in at <a href="https://dashboard.render.com" target="_blank">https://dashboard.render.com</a></li>
      <li>Click <strong>New +</strong> → <strong>Web Service</strong></li>
      <li>Connect to your GitHub repository</li>
      <li>Fill in the fields as follows:</li>
    </ol>


      <tr><th>Setting</th><th>Value</th></tr>
      <tr><td>Name</td><td><code>desk-conflict-checker</code></td></tr>
      <tr><td>Environment</td><td><code>Node</code></td></tr>
      <tr><td>Build Command</td><td><code>npm install</code></td></tr>
      <tr><td>Start Command</td><td><code>npm start</code></td></tr>
      <tr><td>Region</td><td><code>US</code></td></tr>
      <tr><td>Branch</td><td><code>main</code></td></tr>

  </div>

  <div class="section">
    <h2>🔐 Step 4: Add Environment Variables</h2>
    <p>In the Render dashboard, go to the <strong>Environment</strong> tab and add:</p>
    <table>
      <tr><th>Key</th><th>Value</th></tr>
      <tr><td>LIBSTAFFER_CLIENT_ID</td><td>Your LibStaffer API Client ID</td></tr>
      <tr><td>LIBSTAFFER_CLIENT_SECRET</td><td>Your LibStaffer Secret</td></tr>
      <tr><td>LIBCAL_CLIENT_ID</td><td>Your LibCal API Client ID</td></tr>
      <tr><td>LIBCAL_CLIENT_SECRET</td><td>Your LibCal Secret</td></tr>
      <tr><td>LIBCAL_CAL_IDS</td><td>Comma-separated calendar IDs</td></tr>
      <tr><td>PORT</td><td><code>10000</code> (optional — Render will auto-assign)</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>⏳ Step 5: Deploy and Test</h2>
    <ul>
      <li>Click <strong>Manual Deploy</strong> or let Render deploy automatically</li>
      <li>Visit your app at the URL provided by Render (e.g. <code>https://desk-conflict-checker.onrender.com</code>)</li>
    </ul>
  </div>

</body>
</html>
