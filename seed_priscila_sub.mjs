import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://fporviwejryfxaoapowc.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwb3J2aXdlanJ5Znhhb2Fwb3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODY5NzIsImV4cCI6MjEwMzI2Mjk3Mn0.JYfzqyrkaCyXGU8FVbJv3Bu4vmgo5gnhbq0gogmUDoA"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seedSubscription() {
  console.log("Signing in as Priscila...")
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: "priscila@evolui.com.br",
    password: "senha123",
  })
  console.log("Auth user id:", auth.user?.id)

  const masterUserId = auth.user?.id || "37f87568-743c-4d0a-8d47-31acb26fe4df"

  console.log("Upserting subscription for Priscila...")
  const { data: subData, error: subErr } = await supabase
    .from("subscriptions")
    .upsert({
      master_user_id: masterUserId,
      plan_id: "clinica",
      max_professionals: 5,
      status: "active",
      customer_email: "priscila@evolui.com.br",
      updated_at: new Date().toISOString(),
    }, { onConflict: "master_user_id" })
    .select()

  console.log("Subscription result:", subData, "Error:", subErr)

  const { data: checkSub, error: cErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("master_user_id", masterUserId)

  console.log("Query check:", checkSub, "Error:", cErr)
}

seedSubscription()
