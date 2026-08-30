import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function inspectTeam() {
  await supabase.auth.signInWithPassword({
    email: "priscila@evolui.com.br",
    password: "senha123",
  })

  const { data: profs } = await supabase.from("professionals").select("*")
  console.log("All professionals in DB:")
  profs?.forEach(p => {
    console.log(`- ${p.full_name} (${p.email}) | role: ${p.role} | master_id: ${p.master_id} | is_active: ${p.is_active}`)
  })
}

inspectTeam()
