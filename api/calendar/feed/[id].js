const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://fporviwejryfxaoapowc.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA";

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

    // 1. Authenticate with Supabase
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "priscila@evolui.com.br",
        password: "senha123",
      }),
    });

    const authData = await authRes.json();
    const token = authData.access_token || SUPABASE_KEY;

    // 2. Fetch professional details
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/professionals?id=eq.${cleanId}&select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    const profs = await profRes.json();
    const prof = profs && profs[0] ? profs[0] : null;
    const profName = prof ? prof.full_name : "Agenda EvoluIA";

    // 3. Find all accessible professional IDs
    let profIds = [cleanId];
    if (prof) {
      if (prof.role === "master" || !prof.master_id) {
        const subRes = await fetch(`${SUPABASE_URL}/rest/v1/professionals?master_id=eq.${prof.id}&select=id`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
        });
        const subProfs = await subRes.json();
        if (subProfs && Array.isArray(subProfs)) {
          profIds = profIds.concat(subProfs.map((p) => p.id));
        }
      } else if (prof.master_id && prof.allow_master_data_access) {
        profIds.push(prof.master_id);
      }
    }

    // 4. Fetch appointments
    const apptsUrl = `${SUPABASE_URL}/rest/v1/appointments?professional_id=in.(${profIds.join(",")})&select=*,child:children(id,full_name)&order=start_time.asc`;
    const apptsRes = await fetch(apptsUrl, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    const appointments = (await apptsRes.json()) || [];

    // 5. Generate iCalendar RFC 5545 String
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

    appointments.forEach((appt) => {
      if (appt.status === "cancelled") return;

      const startISO = formatICSDate(appt.start_time);
      const endISO = formatICSDate(
        appt.end_time || new Date(new Date(appt.start_time).getTime() + 50 * 60 * 1000)
      );
      const childName = appt.child?.full_name || "Paciente";
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
