import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  console.log("Signing in as authenticated system agent...")
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "priscila@evolui.com.br",
    password: "senha123",
  })
  console.log("Auth success:", !!auth.user, authErr || "")

  const [profsRes, childrenRes, apptsRes, subsRes, eventsRes] = await Promise.all([
    supabase.from("professionals").select("*"),
    supabase.from("children").select("id, professional_id"),
    supabase.from("appointments").select("id"),
    supabase.from("subscriptions").select("*"),
    supabase.from("subscription_events").select("*"),
  ])

  console.log("Profs found:", profsRes.data?.length)
  console.log("Children found:", childrenRes.data?.length)
  console.log("Appts found:", apptsRes.data?.length)
  console.log("Subs found:", subsRes.data?.length)
  console.log("Events found:", eventsRes.data?.length)
  console.log("First prof:", profsRes.data?.[0]?.full_name, profsRes.data?.[0]?.clinic_name)
}

run()
