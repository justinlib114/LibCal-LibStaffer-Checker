<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; line-height: 1.6; padding: 20px;">

  <h1>🧭 Desk Conflict Checker</h1>
  <p>
    This Node.js-based application detects schedule conflicts for library staff by aggregating data from LibStaffer and LibCal APIs. It shows a visual dashboard for spotting overlaps in shifts, time off, events, and appointments.
  </p>

  <h2>🔍 Features</h2>
  <ul>
    <li><strong>Fetches data from:</strong>
      <ul>
        <li><strong>LibStaffer:</strong> shifts and approved time off (filtered by schedule IDs)</li>
        <li><strong>LibCal:</strong> calendar events (by calendar ID) and appointment bookings (by user ID)</li>
      </ul>
    </li>
    <li>Flags <strong>overlapping conflicts</strong> in bold red</li>
    <li>Provides:
      <ul>
        <li>Name filter with live search</li>
        <li>Type filter (shift, event, time off, appointment, conflict)</li>
        <li>Date range filter</li>
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
    <li>Shows only entries between <strong>9:00 AM – 9:00 PM</strong></li>
  </ul>

  <h2>🎨 UI Overview</h2>
  <ul>
    <li><strong>Color Legend:</strong>
      <ul>
        <li>💙 Shift</li>
        <li>🟠 Time Off</li>
        <li>🟢 Event</li>
        <li>💜 Appointment</li>
        <li>🔴 Conflict (bold + red)</li>
      </ul>
    </li>
    <li><strong>UI Components:</strong>
      <ul>
        <li>Filter bar with live search, type checkboxes, and date pickers</li>
        <li>Collapsible department sections</li>
      </ul>
    </li>
  </ul>

  <h2>🛠️ Tech Stack</h2>
  <ul>
    <li>Node.js + Express</li>
    <li>Axios for API calls</li>
    <li>Day.js (with timezone support)</li>
    <li>EJS for templating</li>
    <li><code>.env</code> for configuration (includes a JSON string for ID-to-name mapping)</li>
  </ul>

  <h2>⚙️ Setup</h2>
  <ol>
    <li><strong>Install dependencies:</strong>
      <pre><code>npm install</code></pre>
    </li>
    <li><strong>Create a <code>.env</code> file:</strong>
      <pre><code>
LIBCAL_APPOINTMENT_USER_ID=
LIBCAL_BASE=
LIBCAL_CAL_IDS=
LIBCAL_CLIENT_ID=
LIBCAL_CLIENT_SECRET=
LIBSTAFFER_BASE=
LIBSTAFFER_CLIENT_ID=
LIBSTAFFER_CLIENT_SECRET=
LIBSTAFFER_USERS=
SCHEDULE_IDS=
USER_ID_TO_NAME=`{"12345":"Example 1","67890":"Example 2"}`
      </code></pre>
    </li>
    <li><strong>Run the server:</strong>
      <pre><code>node server.js</code></pre>
    </li>
    <li><strong>View in browser:</strong> <a href="http://localhost:3000">http://localhost:3000</a></li>
  </ol>

  <h2>🚀 Deploy on Render</h2>
  <ol>
    <li>Push the project to GitHub</li>
    <li>Create a <strong>Web Service</strong> at <a href="https://render.com" target="_blank">render.com</a></li>
    <li>Configure Render:
      <ul>
        <li><strong>Start command:</strong> <code>npm start</code></li>
        <li><strong>Build command:</strong> <code>npm install</code></li>
        <li><strong>Environment:</strong> <code>Node</code></li>
        <li><strong>Environment variables:</strong> match your <code>.env</code> file</li>
      </ul>
    </li>
    <li>Deploy and visit your Render URL (e.g. <code>https://desk-conflict-checker.onrender.com</code>)</li>
  </ol>

</body>
</html>
