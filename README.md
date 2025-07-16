<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Desk Conflict Checker - README</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      background: #fefefe;
      color: #333;
    }
    h1, h2, h3 {
      color: #222;
    }
    code {
      background: #eee;
      padding: 2px 4px;
      border-radius: 4px;
    }
    pre {
      background: #f4f4f4;
      padding: 10px;
      overflow-x: auto;
      border-radius: 5px;
    }
    ul {
      margin-top: 0;
    }
  </style>
</head>
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

</body>
</html>
