from IPython.display import display, HTML

readme_html = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body>
  <h1>🧭 Desk Conflict Checker</h1>
  <p>
    This Node.js-based application <strong>detects schedule conflicts</strong> for library staff by aggregating data from
    <strong>LibStaffer and LibCal APIs</strong>. It shows a <strong>visual dashboard</strong> for spotting overlaps in shifts, time off, events, and appointments.
  </p>

  <h2>🔍 Features</h2>
  <ul>
    <li>Fetches data from:
      <ul>
        <li><strong>LibStaffer:</strong> shifts and approved time off</li>
        <li><strong>LibCal:</strong> calendar events and appointment bookings</li>
      </ul>
    </li>
    <li>Flags <strong>overlapping conflicts</strong> in bold red</li>
    <li>Provides:
      <ul>
        <li><strong>Name filter</strong> with live search</li>
        <li><strong>Type filter</strong> (shift, event, time off, appointment, conflict)</li>
        <li><strong>Date range filter</strong></li>
      </ul>
    </li>
    <li>Groups staff into collapsible sections:
      <ul>
        <li>Adult Services (AS)</li>
        <li>Youth Services (YS)</li>
        <li>Part Timers (PT)</li>
        <li>Administration (AD)</li>
      </ul>
    </li>
    <li>Shows only entries between <strong>9:00 AM and 9:00 PM</strong></li>
  </ul>

  <h2>🎨 UI Overview</h2>
  <ul>
    <li><strong>Color Legend:</strong>
      <ul>
        <li><span style="color:blue;">💙 Shift</span></li>
        <li><span style="color:orange;">🟠 Time Off</span></li>
        <li><span style="color:green;">🟢 Event</span></li>
        <li><span style="color:purple;">💜 Appointment</span></li>
        <li><span style="color:red;font-weight:bold;">🔴 Conflict</span></li>
      </ul>
    </li>
    <li>Filter bar: <em>live search, type checkboxes, and date pickers</em></li>
    <li>Collapsible team sections with distinct headers</li>
  </ul>

  <h2>🛠️ Tech Stack</h2>
  <ul>
    <li>Node.js + Express</li>
    <li>Axios for API calls</li>
    <li>Day.js for timezones</li>
    <li>EJS for rendering</li>
    <li><strong>.env for configuration</strong> (uses JSON string for ID-name mapping)</li>
  </ul>

  <h2>⚙️ Setup</h2>
  <ol>
    <li><strong>Install dependencies:</strong> <code>npm install</code></li>
    <li>Create a <code>.env</code> file with:
      <pre><code>LIBSTAFFER_CLIENT_ID=
LIBSTAFFER_CLIENT_SECRET=
LIBCAL_CLIENT_ID=
LIBCAL_CLIENT_SECRET=
LIBCAL_CAL_IDS=7925
LIBSTAFFER_USERS=77608,84005,...
SCHEDULE_IDS=8763,8781,10040
LIBCAL_APPOINTMENT_USER_ID=86771
USER_ID_TO_NAME={"77608":"Lisa Allen",...}
PORT=3000</code></pre>
    </li>
    <li><strong>Run:</strong> <code>node server.js</code></li>
    <li>View in browser: <a href="http://localhost:3000">http://localhost:3000</a></li>
  </ol>

  <h2>🚀 Deploy on Render</h2>
  <ol>
    <li>Push to GitHub</li>
    <li>Create a Web Service at <a href="https://render.com">render.com</a></li>
    <li>Set environment:
      <ul>
        <li>Start command: <code>npm start</code></li>
        <li>Environment variables as shown in <code>.env</code></li>
      </ul>
    </li>
    <li>Deploy and visit your app’s Render URL</li>
  </ol>
</body>
</html>
"""

display(HTML(readme_html))
