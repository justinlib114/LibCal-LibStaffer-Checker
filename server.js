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
        params: { date: from, days: 60, scheduleId: sid }
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
      params: { date: from, days: 60 }
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
    params.append("days", "60");
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
      days: 60,
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


function formatTimeBlock(from, to) {
  const format = h => {
    const hour = Math.floor(h);
    const minute = h % 1 === 0 ? '' : ':30';
    const suffix = hour >= 12 ? 'pm' : 'am';
    const displayHour = ((hour + 11) % 12 + 1) + minute;
    return displayHour + suffix;
  };
  return `${format(from)}–${format(to)}`;
}


app.get("/autoschedule", async (req, res) => {
  const startParam = req.query.start || dayjs().format("YYYY-MM-DD");
  const endParam = req.query.end || dayjs().add(13, "day").format("YYYY-MM-DD");
  const startDate = dayjs(startParam).startOf("day");
  const endDate = dayjs(endParam).endOf("day");

  const [libstafferToken] = await Promise.all([
    getLibstafferToken(),
    getLibcalToken()
  ]);

  const groupMap = {
    "Adult Services (AS)": ["Amelia Buccarelli", "Emily Dowie", "Antonio Forte", "Nicole Guenkel", "Janet Heneghan", "Gary LaPicola", "Justin Sanchez"],
    "Part Timers (PT)": ["Angela Carstensen", "Gail Fell", "Susan Kramer", "Patricia Perito", "ToniAnne Rigano", "Alex Shoshani"],
    "Administration (AD)": ["Christa O'Sullivan", "Christina Ryan-Linder"]
  };

  const weekdayBlocks = {
    1: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }],
    2: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }, { from: 17, to: 19 }, { from: 19, to: 20.5 }],
    3: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }, { from: 17, to: 19 }, { from: 19, to: 20.5 }],
    4: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }],
    5: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }]
  };

  const MAX_SHIFTS_PER_DAY = 10;
  const MAX_SHIFTS_PER_WEEK = 20;

  const staffConflicts = {};
  const shiftCounts = {};
  const scheduleSuggestions = [];

  // Collect all conflicts and track shift counts
  for (const userId of libstafferUsers) {
    const name = userIdToName[userId];
    staffConflicts[name] = [];

    for (const scheduleId of scheduleIds) {
      const { data } = await axios.get(`${LIBSTAFFER_BASE}/users/shifts/${userId}`, {
        headers: { Authorization: `Bearer ${libstafferToken}` },
        params: { date: startDate.format("YYYY-MM-DD"), days: 90, scheduleId }
      });

      for (const shift of data?.data?.shifts || []) {
        const from = dayjs(shift.from);
        const to = dayjs(shift.to);
        staffConflicts[name].push({ from, to, type: "Shift", title: shift.shiftName || "" });

        const weekKey = from.startOf("week").format("YYYY-MM-DD");
        shiftCounts[name] = shiftCounts[name] || {};
        shiftCounts[name][weekKey] = (shiftCounts[name][weekKey] || 0) + 1;
      }
    }

    const timeoffs = await axios.get(`${LIBSTAFFER_BASE}/users/timeoff/${userId}`, {
      headers: { Authorization: `Bearer ${libstafferToken}` },
      params: { date: startDate.format("YYYY-MM-DD"), days: 90 }
    });

    for (const t of timeoffs?.data?.data?.timeOff || []) {
      const from = dayjs(t.from);
      const to = dayjs(t.to);
      staffConflicts[name].push({ from, to, type: "Time Off" });
    }
  }

  for (let d = startDate; d.isBefore(endDate); d = d.add(1, "day")) {
    const dow = d.day();
    if (!weekdayBlocks[dow]) continue;

    for (const block of weekdayBlocks[dow]) {
      const fromTime = d.hour(Math.floor(block.from)).minute((block.from % 1) * 60);
      const toTime = d.hour(Math.floor(block.to)).minute((block.to % 1) * 60);

      // Check if someone is already scheduled for this block
let skipBlock = false;
Object.entries(staffConflicts).forEach(([_, events]) => {
  if (events.some(e => isOverlapping(fromTime, toTime, e.from, e.to))) {
    skipBlock = true;
  }
});


      const allSuggestions = [];

      for (const [group, names] of Object.entries(groupMap)) {
        const groupSuggestions = [];

        for (const name of names) {
          const conflicts = staffConflicts[name] || [];
          const hasConflict = conflicts.some(c => isOverlapping(fromTime, toTime, c.from, c.to));
          if (hasConflict) continue;

          const dateStr = d.format("YYYY-MM-DD");
          const weekStr = d.startOf("week").format("YYYY-MM-DD");

          const dayCount = conflicts.filter(c => dayjs(c.from).isSame(d, "day")).length;
          const weekCount = (shiftCounts[name]?.[weekStr] || 0);

          if (dayCount >= MAX_SHIFTS_PER_DAY || weekCount >= MAX_SHIFTS_PER_WEEK) continue;

const priorShift = conflicts.find(c =>
  c.type === "Shift" &&
  dayjs(c.from).isSame(d, "day") &&
  c.from.isBefore(fromTime)
);

const futureShift = conflicts.find(c =>
  c.type === "Shift" &&
  dayjs(c.from).isSame(d, "day") &&
  c.from.isAfter(toTime)
);

const hasAnySameDayShift = priorShift || futureShift;


let timeNote = "";
if (priorShift) {
  timeNote = ` – Prior: ${formatTimeBlock(
    priorShift.from.hour() + priorShift.from.minute() / 60,
    priorShift.to.hour() + priorShift.to.minute() / 60
  )}`;
} else if (futureShift) {
  timeNote = ` – Later: ${formatTimeBlock(
    futureShift.from.hour() + futureShift.from.minute() / 60,
    futureShift.to.hour() + futureShift.to.minute() / 60
  )}`;
}

          groupSuggestions.push({
            name,
            label: `${name} (${dayCount})${timeNote}`,
            alreadyAssigned: hasAnySameDayShift
          });
        } // ← this closes the for (const name of names) loop

        groupSuggestions.sort((a, b) => {
          const weekA = shiftCounts[a.name]?.[d.startOf("week").format("YYYY-MM-DD")] || 0;
          const weekB = shiftCounts[b.name]?.[d.startOf("week").format("YYYY-MM-DD")] || 0;
          return weekA - weekB;
        });

        if (groupSuggestions.length > 0) {
          allSuggestions.push({
            group,
            people: groupSuggestions
          });
        }
      } // closes the for (const [group, names]) loop


const adultServices = groupMap["Adult Services (AS)"];
const scheduledNames = Object.entries(staffConflicts)
  .filter(([name, events]) =>
    groupMap["Adult Services (AS)"].includes(name) &&
    events.some(e =>
      e.type === "Shift" &&
      isOverlapping(fromTime, toTime, e.from, e.to) &&
      !(e.title?.toLowerCase().includes("off") || e.title?.toLowerCase().includes("close") || e.title?.toLowerCase().includes("closer"))
    )
  )
  .map(([name]) => name);


scheduleSuggestions.push({
  date: d.format("dddd, MMMM D, YYYY"),
  block: formatTimeBlock(block.from, block.to),
  scheduled: scheduledNames,
  suggestions: allSuggestions.length > 0
    ? allSuggestions
    : [{ group: "None", people: [{ label: "No one available", alreadyAssigned: false }] }]
});
    }
  } // FIXED — closes both for-loops over weekday blocks and days



  res.render("autoschedule", {
    scheduleSuggestions,
    startDate: startParam,
    endDate: endParam,
    dayjs,
    staffConflicts
  });
});

app.get("/autoschedule/generate", (req, res) => {
  const start = dayjs().format("YYYY-MM-DD");
  const end = dayjs().add(13, "day").format("YYYY-MM-DD");
  res.render("generate-form", { start, end, dayjs });
});

app.get("/autoschedule/compare", async (req, res) => {
  const startParam = req.query.start || dayjs().format("YYYY-MM-DD");
  const endParam = req.query.end || dayjs().add(6, "day").format("YYYY-MM-DD");
  const startDate = dayjs(startParam).startOf("day");
  const endDate = dayjs(endParam).endOf("day");

  const groupMap = {
    "Adult Services (AS)": ["Amelia Buccarelli", "Emily Dowie", "Antonio Forte", "Nicole Guenkel", "Janet Heneghan", "Gary LaPicola", "Justin Sanchez"]
  };

  const allStaff = [...groupMap["Adult Services (AS)"]];
  const shiftMap = {
    1: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }],
    2: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }, { from: 17, to: 19 }, { from: 19, to: 20.5 }],
    3: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }, { from: 17, to: 19 }, { from: 19, to: 20.5 }],
    4: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }],
    5: [{ from: 9, to: 11 }, { from: 11, to: 13 }, { from: 13, to: 15 }, { from: 15, to: 17 }]
  };

  const staffConflicts = req.app.locals.staffConflicts || {};
  const assignedShiftsPerDay = {};

  function isUnavailable(name, dayNum, hour) {
    const after5pm = hour >= 17;
    const before12_30 = hour < 12.5;

    if (dayNum === 2) { // Tuesday
      if (after5pm && ["Justin Sanchez", "Gary LaPicola", "Amelia Buccarelli"].includes(name)) return true;
      if (before12_30 && ["Nicole Guenkel", "Janet Heneghan", "Emily Dowie", "Antonio Forte"].includes(name)) return true;
    }

    if (dayNum === 3) { // Wednesday
      if (after5pm && ["Nicole Guenkel", "Janet Heneghan", "Emily Dowie", "Antonio Forte"].includes(name)) return true;
      if (before12_30 && ["Justin Sanchez", "Gary LaPicola", "Amelia Buccarelli"].includes(name)) return true;
    }

    return false;
  }

  function getAvailableStaff(from, to, dayNum) {
    return allStaff.filter(name => {
      if (isUnavailable(name, dayNum, from.hour() + from.minute() / 60)) return false;

      const conflicts = staffConflicts[name] || [];
      if (conflicts.some(c => isOverlapping(from, to, c.from, c.to))) return false;

      // Check per-day shift assignment for AS
      const dateKey = from.format("YYYY-MM-DD");
      const shiftsToday = assignedShiftsPerDay[dateKey]?.[name] || 0;
      if (shiftsToday >= 1) return false;

      return true;
    });
  }

  function assign(strategy, rotationState) {
    const result = [];

    for (let d = startDate; d.isBefore(endDate); d = d.add(1, "day")) {
      const dayNum = d.day();
      const blocks = shiftMap[dayNum];
      if (!blocks) continue;

      const dateStr = d.format("YYYY-MM-DD");
      if (!assignedShiftsPerDay[dateStr]) assignedShiftsPerDay[dateStr] = {};
      const dayData = [];

      for (const block of blocks) {
        const from = d.hour(Math.floor(block.from)).minute((block.from % 1) * 60);
        const to = d.hour(Math.floor(block.to)).minute((block.to % 1) * 60);
        const blockLabel = `${formatTime(from)}–${formatTime(to)}`;

        const available = getAvailableStaff(from, to, dayNum);
        let name = "—";

        if (strategy === "rotation" && available.length > 0) {
          name = available[rotationState.index % available.length];
          rotationState.index++;
        } else if (strategy === "random" && available.length > 0) {
          name = available[Math.floor(Math.random() * available.length)];
        } else if (strategy === "roundrobin" && available.length > 0) {
          while (rotationState.queue.length) {
            const candidate = rotationState.queue.shift();
            if (available.includes(candidate)) {
              name = candidate;
              rotationState.queue.push(candidate);
              break;
            }
          }
        }

        if (name !== "—") {
          assignedShiftsPerDay[dateStr][name] = (assignedShiftsPerDay[dateStr][name] || 0) + 1;
        }

        dayData.push({ block: blockLabel, assigned: name });
      }

      result.push({ date: dateStr, blocks: dayData });
    }

    return result;
  }

  const result = {
    rotation: assign("rotation", { index: 0 }),
    random: assign("random", {}),
    roundrobin: assign("roundrobin", { queue: [...allStaff] })
  };

  res.render("compare", {
    suggestions: result,
    startDate: startParam,
    endDate: endParam,
    dayjs
  });
});



function formatTime(hour) {
  const h = hour.hour();
  const m = hour.minute();
  const suffix = h >= 12 ? "pm" : "am";
  const hr = ((h + 11) % 12 + 1);
  return `${hr}${m === 0 ? "" : ":30"}${suffix}`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Desk Conflict Checker running on port ${PORT}`));
