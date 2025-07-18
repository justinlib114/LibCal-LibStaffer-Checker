require("dotenv").config();
const express = require("express");
const axios = require("axios");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const path = require("path");

dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

const LIBSTAFFER_BASE = process.env.LIBSTAFFER_BASE;
const LIBCAL_BASE = process.env.LIBCAL_BASE;

const libstafferUsers = process.env.LIBSTAFFER_USERS.split(",").map(id => parseInt(id.trim()));
const scheduleIds = process.env.SCHEDULE_IDS.split(",").map(id => parseInt(id.trim()));
const libcalAppointmentUserId = parseInt(process.env.LIBCAL_APPOINTMENT_USER_ID);

const userIdToName = JSON.parse(process.env.USER_ID_TO_NAME);

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
  const start = dayjs().tz("America/New_York").startOf("day");
  const from = start.format("YYYY-MM-DD");

  const [libstafferToken, libcalToken] = await Promise.all([
    getLibstafferToken(),
    getLibcalToken()
  ]);

  let conflicts = {};

  await Promise.all(libstafferUsers.map(async (userId) => {
    const name = userIdToName[userId] || `User ${userId}`;
    conflicts[name] = [];

    for (let sid of scheduleIds) {
      const { data } = await axios.get(`${LIBSTAFFER_BASE}/users/shifts/${userId}`, {
        headers: { Authorization: `Bearer ${libstafferToken}` },
        params: { date: from, days: 28, scheduleId: sid }
      });

      const shifts = data?.data?.shifts || [];
      for (let shift of shifts) {
        const s = dayjs(shift.from);
        const e = dayjs(shift.to);
        const shiftName = shift.shiftName || shift.scheduleName || "Shift";
        if (s.hour() >= 9 && e.hour() <= 21) {
          conflicts[name].push({ type: `Shift (${shiftName})`, from: s, to: e });
        }
      }
    }

    const timeoffRes = await axios.get(`${LIBSTAFFER_BASE}/users/timeoff/${userId}`, {
      headers: { Authorization: `Bearer ${libstafferToken}` },
      params: { date: from, days: 28 }
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

  for (const calId of calendarIds) {
    const params = new URLSearchParams();
    params.append("cal_id", calId);
    params.append("date", from);
    params.append("days", "28");
    params.append("limit", "500");

    const libcalEvents = await axios.get(`${LIBCAL_BASE}/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${libcalToken}` }
    });

    const events = Array.isArray(libcalEvents.data)
      ? libcalEvents.data
      : Array.isArray(libcalEvents.data.events)
        ? libcalEvents.data.events
        : [];

    for (let event of events) {
      const ownerName = event?.owner?.name;
      if (conflicts[ownerName]) {
        const s = dayjs.utc(event.start).tz("America/New_York");
        const e = dayjs.utc(event.end).tz("America/New_York");
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
      days: 28,
      limit: 500
    }
  });

  for (let a of appointments.data) {
    const name = userIdToName[a.userId];
    const s = dayjs(a.fromDate).tz("America/New_York");
    const e = dayjs(a.toDate).tz("America/New_York");
    if (!name) continue;
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

app.get("/autoschedule", async (req, res) => {
  const dayjs = require("dayjs");
  const startParam = req.query.start || dayjs().format("YYYY-MM-DD");
  const endParam = req.query.end || dayjs().add(13, "day").format("YYYY-MM-DD");
  const startDate = dayjs(startParam).startOf("day");
  const endDate = dayjs(endParam).endOf("day");

  const [libstafferToken, libcalToken] = await Promise.all([
    getLibstafferToken(),
    getLibcalToken()
  ]);

  const groupMap = {
    "Adult Services (AS)": ["Amelia Buccarelli", "Emily Dowie", "Antonio Forte", "Nicole Guenkel", "Janet Heneghan", "Gary LaPicola", "Justin Sanchez"],
    "Youth Services (YS)": ["Michelle Blanyar", "Sarah Northshield", "Marina Payne", "Joanna Rooney", "Claire Tomkin"],
    "Part Timers (PT)": ["Angela Carstensen", "Gail Fell", "Susan Kramer", "Patricia Perito", "TonieAnne Rigano", "Alex Shoshani"],
    "Administration (AD)": ["Christa O'Sullivan", "Christina Ryan-Linder"]
  };

  const staffConflicts = {};

  // Load conflict data (reuses same logic as main route)
  for (const userId of libstafferUsers) {
    const name = userIdToName[userId];
    staffConflicts[name] = [];

    for (const scheduleId of scheduleIds) {
      const { data } = await axios.get(`${LIBSTAFFER_BASE}/users/shifts/${userId}`, {
        headers: { Authorization: `Bearer ${libstafferToken}` },
        params: {
          date: startDate.format("YYYY-MM-DD"),
          days: 90,
          scheduleId
        }
      });

      for (const shift of data?.data?.shifts || []) {
        const from = dayjs(shift.from);
        const to = dayjs(shift.to);
        staffConflicts[name].push({ from, to });
      }
    }

    const timeoffs = await axios.get(`${LIBSTAFFER_BASE}/users/timeoff/${userId}`, {
      headers: { Authorization: `Bearer ${libstafferToken}` },
      params: {
        date: startDate.format("YYYY-MM-DD"),
        days: 90
      }
    });

    for (const t of timeoffs?.data?.data?.timeOff || []) {
      const from = dayjs(t.from);
      const to = dayjs(t.to);
      staffConflicts[name].push({ from, to });
    }
  }

  const scheduleSuggestions = [];

  for (let d = startDate; d.isBefore(endDate); d = d.add(1, "day")) {
    const availableByGroup = {
      AS: [],
      PT: [],
      AD: []
    };

    for (const [group, members] of Object.entries(groupMap)) {
      for (const name of members) {
        const hasConflict = staffConflicts[name]?.some(c => isOverlapping(
          d.hour(9), d.hour(21),
          c.from, c.to
        ));

        if (!hasConflict) {
          const shiftCount = staffConflicts[name]?.length || 0;
          const staffType = group.includes("Adult") ? "AS" : group.includes("Part") ? "PT" : "AD";
          availableByGroup[staffType].push({ name, shiftCount });
        }
      }
    }

    const bestGroup = availableByGroup.AS.length
      ? availableByGroup.AS
      : availableByGroup.PT.length
        ? availableByGroup.PT
        : availableByGroup.AD;

    const sorted = bestGroup.sort((a, b) => a.shiftCount - b.shiftCount);
    scheduleSuggestions.push({ date: d.format("YYYY-MM-DD"), suggestion: sorted[0]?.name || "No one available" });
  }

res.render("autoschedule", {
  scheduleSuggestions,
  startDate: startParam,
  endDate: endParam,
  dayjs // <- pass dayjs to the view
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Desk Conflict Checker running on port ${PORT}`));
