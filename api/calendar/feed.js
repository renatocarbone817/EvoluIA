const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fporviwejryfxaoapowc.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA";

function formatICSDate(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeICSText(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export default async function handler(req, res) {
  // CORS & Cache Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const rawId = req.query.id || req.query.token || req.query.profId || "";
    const cleanId = String(rawId).replace(/\.ics$/i, "").trim();

    if (!cleanId) {
      return res.status(400).send("ID de profissional ou token da agenda não fornecido.");
    }

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    // 1. Fetch professional details
    let profName = "Agenda EvoluIA";
    try {
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/professionals?id=eq.${cleanId}&select=*`, { headers });
      const profs = await profRes.json();
      if (profs && profs[0]) {
        profName = profs[0].clinic_name || profs[0].full_name || "Agenda EvoluIA";
      }
    } catch (e) {
      console.warn("Could not fetch professional:", e);
    }

    // 2. Fetch appointments for this professional
    const apptsUrl = `${SUPABASE_URL}/rest/v1/appointments?professional_id=eq.${cleanId}&select=*&order=start_time.asc`;
    const apptsRes = await fetch(apptsUrl, { headers });
    const appointments = (await apptsRes.json()) || [];

    // 3. Fetch children names for these appointments
    const childMap = {};
    if (Array.isArray(appointments) && appointments.length > 0) {
      const childIds = [...new Set(appointments.map((a) => a.child_id).filter(Boolean))];
      if (childIds.length > 0) {
        try {
          const childrenRes = await fetch(`${SUPABASE_URL}/rest/v1/children?id=in.(${childIds.join(",")})&select=id,full_name`, { headers });
          const childrenData = await childrenRes.json();
          if (Array.isArray(childrenData)) {
            childrenData.forEach((c) => {
              childMap[c.id] = c.full_name;
            });
          }
        } catch (e) {
          console.warn("Could not fetch children names:", e);
        }
      }
    }

    // 4. Generate iCalendar RFC 5545 String
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EvoluIA//Gestao Psicopedagogica//PT",
      `X-WR-CALNAME:${escapeICSText(`EvoluIA - ${profName}`)}`,
      "X-WR-TIMEZONE:America/Sao_Paulo",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
      "X-PUBLISHED-TTL:PT15M",
    ];

    if (Array.isArray(appointments)) {
      appointments.forEach((appt) => {
        if (appt.status === "cancelled") return;

        const startISO = formatICSDate(appt.start_time);
        const endISO = formatICSDate(
          appt.end_time || new Date(new Date(appt.start_time).getTime() + 50 * 60 * 1000)
        );
        const childName = (appt.child_id && childMap[appt.child_id]) || appt.child?.full_name || "Paciente";
        const title = `${childName} - ${appt.type || "Sessão"}`;
        const desc = `Paciente: ${childName}\\nTipo: ${appt.type || "Atendimento"}\\nStatus: ${appt.status || "Agendado"}${
          appt.notes ? `\\nObservações: ${appt.notes.replace(/\r?\n/g, " ")}` : ""
        }`;

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:evoluia-${appt.id}@evoluia.app`);
        lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
        lines.push(`DTSTART:${startISO}`);
        lines.push(`DTEND:${endISO}`);
        lines.push(`SUMMARY:${escapeICSText(title)}`);
        lines.push(`DESCRIPTION:${desc}`);
        lines.push("STATUS:CONFIRMED");
        lines.push("BEGIN:VALARM");
        lines.push("TRIGGER:-PT30M");
        lines.push("ACTION:DISPLAY");
        lines.push(`DESCRIPTION:${escapeICSText(`Lembrete EvoluIA: ${title}`)}`);
        lines.push("END:VALARM");
        lines.push("END:VEVENT");
      });
    }

    lines.push("END:VCALENDAR");
    const icsString = lines.join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="evoluia-agenda.ics"');
    return res.status(200).send(icsString);
  } catch (error) {
    console.error("Erro ao gerar feed iCal:", error);
    return res.status(500).send("Erro interno ao gerar sincronização de calendário.");
  }
}
