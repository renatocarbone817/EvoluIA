async function checkLiveMetrics() {
  console.log("Fetching live Vercel endpoint: https://evolu-ia-seven.vercel.app/api/admin/metrics ...")
  try {
    const res = await fetch("https://evolu-ia-seven.vercel.app/api/admin/metrics")
    const data = await res.json()
    console.log("Status:", res.status)
    console.log("Success:", data.success)
    console.log("MRR:", data.metrics?.mrr)
    console.log("Total Clinics:", data.metrics?.totalClinics)
    console.log("Total Professionals:", data.metrics?.totalProfessionals)
    console.log("Total Patients:", data.metrics?.totalPatients)
    console.log("Clinics list:", data.clinics)
  } catch (err) {
    console.error("Error fetching live metrics:", err)
  }
}

checkLiveMetrics()
