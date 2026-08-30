import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fporviwejryfxaoapowc.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
  console.log("Testing signInWithPassword for priscila@evolui.com.br...")
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: "priscila@evolui.com.br",
    password: "senha123",
  })

  console.log("Auth result:", auth.user ? `User logged in: ${auth.user.id}` : "No user", aErr || "")

  if (auth.user) {
    const { data: profs, error: pErr } = await supabase.from("professionals").select("*")
    console.log("Authenticated Profs query:", profs?.length, pErr || "")
    console.log("Profs list:", profs)

    const { data: children, error: cErr } = await supabase.from("children").select("*")
    console.log("Authenticated Children query:", children?.length, cErr || "")

    const { data: subs, error: sErr } = await supabase.from("subscriptions").select("*")
    console.log("Authenticated Subs query:", subs?.length, sErr || "")
    console.log("Subs list:", subs)
  }
}

testLogin()
