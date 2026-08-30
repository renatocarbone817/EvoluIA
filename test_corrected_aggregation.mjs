import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testCorrected() {
  await supabase.auth.signInWithPassword({
    email: "priscila@evolui.com.br",
    password: "senha123",
  })

  const { data: profs } = await supabase.from("professionals").select("*")
  const masterProfs = profs.filter((p) => p.role === "master" || !p.master_id)
  const activeMembers = profs.filter((p) => p.role === "professional" && p.master_id && p.is_active === true)

  console.log("Master count:", masterProfs.length)
  console.log("Active team members:", activeMembers.length)
  activeMembers.forEach(m => console.log("Active member:", m.full_name, m.email))

  masterProfs.forEach(m => {
    const myTeam = activeMembers.filter(tm => tm.master_id === m.id)
    console.log(`Clinic: ${m.clinic_name || m.full_name} | Team Active Count: ${1 + myTeam.length}`)
  })
}

testCorrected()
