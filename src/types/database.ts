export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      professionals: {
        Row: Professional
        Insert: Omit<Professional, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Professional, 'id' | 'created_at'>>
      }
      guardians: {
        Row: Guardian
        Insert: Omit<Guardian, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Guardian, 'id' | 'created_at'>>
      }
      children: {
        Row: Child
        Insert: Omit<Child, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Child, 'id' | 'created_at'>>
      }
      guardian_children: {
        Row: GuardianChild
        Insert: Omit<GuardianChild, 'id' | 'created_at'>
        Update: Partial<Omit<GuardianChild, 'id' | 'created_at'>>
      }
      appointments: {
        Row: Appointment
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Appointment, 'id' | 'created_at'>>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Session, 'id' | 'created_at'>>
      }
      session_documents: {
        Row: SessionDocument
        Insert: Omit<SessionDocument, 'id' | 'created_at'>
        Update: Partial<Omit<SessionDocument, 'id' | 'created_at'>>
      }
      initial_assessments: {
        Row: InitialAssessment
        Insert: Omit<InitialAssessment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InitialAssessment, 'id' | 'created_at'>>
      }
      assessment_questions: {
        Row: AssessmentQuestion
        Insert: Omit<AssessmentQuestion, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<AssessmentQuestion, 'id' | 'created_at'>>
      }
      assessment_answers: {
        Row: AssessmentAnswer
        Insert: Omit<AssessmentAnswer, 'id' | 'created_at'>
        Update: Partial<Omit<AssessmentAnswer, 'id' | 'created_at'>>
      }
      tests: {
        Row: Test
        Insert: Omit<Test, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Test, 'id' | 'created_at'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at'>
        Update: Partial<Omit<Document, 'id' | 'created_at'>>
      }
      evolution_notes: {
        Row: EvolutionNote
        Insert: Omit<EvolutionNote, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<EvolutionNote, 'id' | 'created_at'>>
      }
      care_plans: {
        Row: CarePlan
        Insert: Omit<CarePlan, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CarePlan, 'id' | 'created_at'>>
      }
      financial_records: {
        Row: FinancialRecord
        Insert: Omit<FinancialRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FinancialRecord, 'id' | 'created_at'>>
      }
      reports: {
        Row: Report
        Insert: Omit<Report, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Report, 'id' | 'created_at'>>
      }
    }
  }
}

export type ProfessionalRole = 'master' | 'professional'

export interface Professional {
  role?: ProfessionalRole
  master_id?: string | null
  allow_master_data_access?: boolean
  is_active?: boolean
  id: string
  full_name: string
  email: string
  phone: string | null
  crp: string | null
  specialty: string | null
  bio: string | null
  logo_url: string | null
  clinic_name: string | null
  address: string | null
  city: string | null
  state: string | null
  created_at: string
  updated_at: string
}

export interface Guardian {
  id: string
  professional_id: string
  full_name: string
  cpf: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ChildStatus = 'initial_assessment' | 'in_progress' | 'report_in_progress' | 'report_completed' | 'paused' | 'closed' | 'archived'

export interface Child {
  id: string
  professional_id: string
  full_name: string
  birth_date: string | null
  school: string | null
  grade: string | null
  main_complaint: string | null
  status: ChildStatus
  notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface GuardianChild {
  id: string
  guardian_id: string
  child_id: string
  relationship: string | null
  is_primary: boolean
  created_at: string
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'done' | 'cancelled' | 'missed' | 'rescheduled'

export interface Appointment {
  id: string
  professional_id: string
  child_id: string
  start_time: string
  end_time: string
  type: string
  status: AppointmentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type SessionStatus = 'in_progress' | 'completed'

export interface Session {
  id: string
  professional_id: string
  child_id: string
  appointment_id: string | null
  session_number: number | null
  date: string
  start_time: string | null
  end_time: string | null
  objective: string | null
  what_was_worked: string | null
  activities: string | null
  test_results: string | null
  professional_notes: string | null
  next_objectives: string | null
  status: SessionStatus
  created_at: string
  updated_at: string
}

export interface SessionDocument {
  id: string
  session_id: string
  professional_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

export type AssessmentStatus = 'pending' | 'completed'

export interface InitialAssessment {
  id: string
  professional_id: string
  child_id: string
  date: string
  referral_source: string | null
  school_name: string | null
  teacher_name: string | null
  reason: string | null
  notes: string | null
  status: AssessmentStatus
  created_at: string
  updated_at: string
}

export type QuestionType = 'short_text' | 'long_text' | 'select' | 'multi_select' | 'yes_no' | 'scale'

export interface AssessmentQuestion {
  id: string
  professional_id: string
  question_text: string
  question_type: QuestionType
  options: Json | null
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentAnswer {
  id: string
  assessment_id: string
  question_id: string
  answer_text: string | null
  answer_options: Json | null
  notes: string | null
  created_at: string
}

export interface Test {
  id: string
  professional_id: string
  child_id: string
  session_id: string | null
  name: string
  type: string | null
  date: string
  objective: string | null
  result: string | null
  observations: string | null
  conclusion: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  professional_id: string
  child_id: string
  session_id: string | null
  assessment_id: string | null
  test_id: string | null
  category: string | null
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

export interface EvolutionNote {
  id: string
  professional_id: string
  child_id: string
  area: string
  initial_observation: string | null
  current_observation: string | null
  date: string
  created_at: string
  updated_at: string
}

export interface CarePlan {
  id: string
  professional_id: string
  child_id: string
  start_date: string
  frequency: number | null
  day_of_week: number[] | null
  session_time: string | null
  duration_minutes: number | null
  price_per_session: number | null
  payment_type: string | null
  payment_due_day: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type FinancialStatus = 'pending' | 'paid' | 'cancelled'
export type FinancialRecordType = 'income' | 'expense'

export interface FinancialRecord {
  id: string
  professional_id: string
  child_id: string | null
  record_type?: FinancialRecordType | null
  category?: string | null
  description?: string | null
  month: number
  year: number
  amount: number
  status: FinancialStatus
  payment_date: string | null
  notes: string | null
  discount: number | null
  created_at: string
  updated_at: string
}

export type ReportStatus = 'draft' | 'final' | 'in_progress' | 'completed'

export interface Report {
  id: string
  professional_id: string
  child_id: string
  title: string
  period_start: string | null
  period_end: string | null
  content: Json | null
  status: ReportStatus
  created_at: string
  updated_at: string
}

// Joined types
export interface ChildWithGuardians extends Child {
  guardians?: (GuardianChild & { guardian: Guardian })[]
}

export interface AppointmentWithChild extends Appointment {
  child: Child
}

export interface SessionWithDocuments extends Session {
  documents?: SessionDocument[]
  child?: Child
}
