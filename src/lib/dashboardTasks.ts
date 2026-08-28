export interface TaskItem {
  id: string
  text: string
  dueDate?: string // YYYY-MM-DD
  dueText?: string
  dueColor?: "red" | "orange" | "gray" | "green"
  completed: boolean
}

export function addDashboardTask(
  profId: string | undefined,
  task: { text: string; dueDate?: string }
) {
  const profKey = profId ? `evoluia_dashboard_tasks_${profId}` : null
  const defaultKey = "evoluia_dashboard_tasks"

  const saved = (profKey && localStorage.getItem(profKey)) || localStorage.getItem(defaultKey)
  let tasks: TaskItem[] = []
  if (saved) {
    try {
      tasks = JSON.parse(saved)
    } catch (e) {
      tasks = []
    }
  }

  // Check if a task with similar text already exists to avoid duplicates
  const existing = tasks.find(
    (t) => t.text.toLowerCase().trim() === task.text.toLowerCase().trim() && !t.completed
  )

  if (!existing) {
    const newTask: TaskItem = {
      id: "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      text: task.text,
      dueDate: task.dueDate || undefined,
      completed: false,
    }
    tasks.unshift(newTask)

    if (profKey) localStorage.setItem(profKey, JSON.stringify(tasks))
    localStorage.setItem(defaultKey, JSON.stringify(tasks))
    window.dispatchEvent(new Event("evoluia_tasks_updated"))
  }
}

export function completeDashboardTaskForChild(profId: string | undefined, childName: string) {
  const profKey = profId ? `evoluia_dashboard_tasks_${profId}` : null
  const defaultKey = "evoluia_dashboard_tasks"

  const saved = (profKey && localStorage.getItem(profKey)) || localStorage.getItem(defaultKey)
  if (!saved) return
  try {
    let tasks: TaskItem[] = JSON.parse(saved)
    let changed = false
    tasks = tasks.map((t) => {
      if (t.text.toLowerCase().includes(childName.toLowerCase()) && !t.completed) {
        changed = true
        return { ...t, completed: true }
      }
      return t
    })
    if (changed) {
      if (profKey) localStorage.setItem(profKey, JSON.stringify(tasks))
      localStorage.setItem(defaultKey, JSON.stringify(tasks))
      window.dispatchEvent(new Event("evoluia_tasks_updated"))
    }
  } catch (e) {}
}
