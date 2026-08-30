import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testFull() {
  await supabase.auth.signInWithPassword({
    email: "priscila@evolui.com.br",
    password: "senha123",
  })

  const [
    profsRes,
    childrenRes,
    apptsRes,
    subsRes,
    eventsRes,
  ] = await Promise.all([
    supabase.from("professionals").select("*"),
    supabase.from("children").select("id, professional_id"),
    supabase.from("appointments").select("id"),
    supabase.from("subscriptions").select("*"),
    supabase.from("subscription_events").select("*"),
  ])

  const profs = profsRes.data || []
  const children = childrenRes.data || []
  const masterProfs = profs.filter((p) => p.role === "master" || !p.master_id)
  const teamMembers = profs.filter((p) => p.role === "professional" && p.master_id)

  console.log("Master profs:", masterProfs.length)
  console.log("Team members:", teamMembers.length)
  console.log("Total children:", children.length)
  console.log("Appointments:", apptsRes.data?.length)

  masterProfs.forEach((m) => {
    const myTeam = teamMembers.filter((tm) => tm.master_id === m.id)
    const myPatients = children.filter((c) => c.professional_id === m.id || myTeam.some((tm) => tm.id === c.professional_id))
    console.log(`Clinic: ${m.clinic_name || m.full_name}, Team: ${myTeam.length + 1}, Patients: ${myPatients.length}`)
  })
}

testFull()
