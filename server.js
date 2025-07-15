require("dotenv").config();
const express = require("express");
const axios = require("axios");
const dayjs = require("dayjs");
const path = require("path");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

const LIBSTAFFER_BASE = "https://greenburghlibrary.libstaffer.com/api/1.0";
const LIBCAL_BASE = "https://greenburghlibrary.libcal.com/api/1.1";

const libstafferUsers = [
  77608, 84005, 62019, 88284, 49960, 45015, 44882, 44879, 45023,
  45017, 95956, 68617, 44830, 45005, 58333, 94241, 44880, 44757,
  52545, 94845, 90883
];
const scheduleIds = [8763, 8781, 10040];
const libcalAppointmentUserId = 86771;

const userIdToName = {
  77608: "Lisa Allen",
  84005: "Michelle Blanyar",
  62019: "Amelia Buccarelli",
  88284: "Angela Carstensen",
  49960: "Emily Dowie",
  45015: "Gail Fell",
  44882: "Antonio Forte",
  44879: "Nicole Guenkel",
  45023: "Janet Heneghan",
  45017: "Susan Kramer",
  95956: "Gary LaPicola",
  68617: "Sarah Northshield",
  44830: "Christa O'Sullivan",
  45005: "Marina Payne",
  58333: "Patricia Perito",
  94241: "TonieAnne Rigano",
  44880: "Joanna Rooney",
  44757: "Christina Ryan-Linder",
  52545: "Justin Sanchez",
  94845: "Alex Shoshani",
  90883: "Claire Tomkin",
  86771: "LibCal Appointment Owner"
};

function isOverlapping(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function getLibstafferToken() {
  const params = new URLSearchParams();
  params.append("client_id", process.env.LIBSTAFFER_CLIENT_ID);
  params.append("client_secret", process.env.LIBSTAFFER_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");

  const { data } = await axios.post(`${LIBSTAFFER_BASE}/oauth/token`, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return data.access_token;
}

async function getLibcalToken() {
  const { data } = await axios.post(`${LIBCAL_BASE}/oauth/token`, new URLSearchParams({
    client_id: process.env.LIBCAL_CLIENT_ID,
    client_secret: process.env.LIBCAL_CLIENT_SECRET,
    grant_type: "client_credentials"
  }), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  return data.access_token;
}

app.get("/", async (req, res) => {
  const start = dayjs().startOf("day");
  const from = start.format("YYYY-MM-DD");

  console.log("⏳ Fetching tokens...");
  const [libstafferToken, libcalToken] = await Promise.all([
    getLibstafferToken(),
    getLibcalToken()
  ]);
  console.log("✅ Tokens received");

  let conflicts = {};

  await Promise.all(libstafferUsers.map(async (userId) => {
    const name = userIdToName[userId] || `User ${userId}`;
    conflicts[name] = [];

    for (let sid of scheduleIds) {
      const { data } = await axios.get(`${LIBSTAFFER_BASE}/users/shifts/${userId}`, {
        headers: { Authorization: `Bearer ${libstafferToken}` },
        params: { date: from, days: 14, scheduleId: sid }
      });
      for (let shift of data?.data?.shifts || []) {
        const s = dayjs(shift.from);
        const e = dayjs(shift.to);
        if (s.hour() >= 9 && e.hour() <= 21) {
          conflicts[name].push({ type: "Shift", from: s, to: e });
        }
      }
    }

    const timeoffRes = await axios.get(`${LIBSTAFFER_BASE}/users/timeoff/${userId}`, {
      headers: { Authorization: `Bearer ${libstafferToken}` },
      params: { date: from, days: 14 }
    });
    for (let t of timeoffRes?.data?.data?.timeOff || []) {
      const s = dayjs(t.from);
      const e = dayjs(t.to);
      if (s.hour() >= 9 && e.hour() <= 21) {
        conflicts[name].push({ type: `Time Off (${t.category})`, from: s, to: e });
      }
    }
  }));

const calendarIds = process.env.LIBCAL_CAL_IDS.split(',').map(id => id.trim());
console.log("📅 Parsed calendar IDs:", calendarIds);

// Send each calendarId as a separate request
for (const calId of calendarIds) {
  const params = new URLSearchParams();
  params.append('cal_id', calId); // ✅ FIXED: use 'cal_id', not 'cal_id[]'
  params.append('date', from);
  params.append('days', '14');
  params.append('limit', '500');

  console.log("📤 Fetching LibCal events with:", params.toString());

  const libcalEvents = await axios.get(`${LIBCAL_BASE}/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${libcalToken}` }
  });

  for (let event of libcalEvents.data) {
    const ownerName = event?.owner?.name;
    if (conflicts[ownerName]) {
      const s = dayjs(event.start);
      const e = dayjs(event.end);
      if (s.hour() >= 9 && e.hour() <= 21) {
        conflicts[ownerName].push({ type: `Event (${event.title})`, from: s, to: e });
      }
    }
  }
}


  const appointments = await axios.get(`${LIBCAL_BASE}/appointments/bookings`, {
    headers: { Authorization: `Bearer ${libcalToken}` },
    params: {
      user_id: libcalAppointmentUserId,
      date: from,
      days: 14,
      limit: 500
    }
  });

  for (let a of appointments.data) {
    const name = a.with.name;
    const s = dayjs(a.from);
    const e = dayjs(a.to);
    if (conflicts[name] && s.hour() >= 9 && e.hour() <= 21) {
      conflicts[name].push({ type: "Appointment", from: s, to: e });
    }
  }

  for (let name in conflicts) {
    conflicts[name].sort((a, b) => a.from - b.from);
    for (let i = 0; i < conflicts[name].length; i++) {
      for (let j = i + 1; j < conflicts[name].length; j++) {
        if (isOverlapping(conflicts[name][i].from, conflicts[name][i].to, conflicts[name][j].from, conflicts[name][j].to)) {
          conflicts[name][i].conflict = true;
          conflicts[name][j].conflict = true;
        }
      }
    }
  }

  res.render("index", { conflicts });
});

app.get("/libcal-test", async (req, res) => {
  try {
    const libcalToken = await getLibcalToken();

    const calendarId = "7925"; // Use just one to isolate problem
    const from = dayjs().startOf("day").format("YYYY-MM-DD");

    const params = new URLSearchParams();
    params.append("cal_id[]", calendarId);
    params.append("date", from);
    params.append("days", "1");
    params.append("limit", "10");

    console.log("📤 Fetching LibCal events with params:", params.toString());

    const response = await axios.get(`${LIBCAL_BASE}/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${libcalToken}` }
    });

    console.log("✅ LibCal events received:", response.data);
    res.send("✅ LibCal API request succeeded. Check logs.");

  } catch (error) {
    console.error("❌ Error fetching LibCal events:", error.response?.data || error.message);
    res.status(500).send("❌ Failed to fetch LibCal events.");
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Desk Conflict Checker running on port ${PORT}`));
