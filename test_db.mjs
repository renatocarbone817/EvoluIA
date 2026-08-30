import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fporviwejryfxaoapowc.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Checking Supabase tables...")
  const { data: profs, error: pErr } = await supabase.from("professionals").select("*")
  console.log("Professionals count:", profs?.length, "Error:", pErr)
  console.log("Profs:", profs)

  const { data: subs, error: sErr } = await supabase.from("subscriptions").select("*")
  console.log("Subscriptions count:", subs?.length, "Error:", sErr)
  console.log("Subs:", subs)

  const { data: children, error: cErr } = await supabase.from("children").select("*")
  console.log("Children count:", children?.length, "Error:", cErr)
  console.log("Children sample:", children?.slice(0, 3))

  const { data: appts, error: aErr } = await supabase.from("appointments").select("*")
  console.log("Appointments count:", appts?.length, "Error:", aErr)

  const { data: events, error: eErr } = await supabase.from("subscription_events").select("*")
  console.log("Events count:", events?.length, "Error:", eErr)
}

test()
