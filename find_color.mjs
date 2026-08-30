import fs from "fs"
import path from "path"

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
        searchDir(fullPath)
      }
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") || entry.name.endsWith(".css") || entry.name.endsWith(".html") || entry.name.endsWith(".js"))) {
      const content = fs.readFileSync(fullPath, "utf-8")
      if (content.toLowerCase().includes("#e5eef1") || content.includes("195 24% 92.5%")) {
        console.log("Match in:", fullPath)
      }
    }
  }
}

searchDir("./src")
searchDir("./index.html")
searchDir("./tailwind.config.js")
