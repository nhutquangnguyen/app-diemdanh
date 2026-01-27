// Workspace types - can be business (store/staff) or education (class/students)
export type WorkspaceType = 'business' | 'education';

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude?: number | null; // Optional for education workspaces
  longitude?: number | null; // Optional for education workspaces
  qr_code: string;
  radius_meters: number; // Bán kính cho phép check-in (mét)
  gps_required: boolean; // Yêu cầu xác thực GPS
  selfie_required: boolean; // Yêu cầu chụp selfie (for business) / allow_self_checkin (for education)
  access_mode: 'staff_only' | 'anyone'; // Chế độ truy cập
  late_penalty_enabled: boolean; // Enable/disable late penalty
  late_penalty_rate: number; // Multiplier for late penalty (1.0 = same as hourly rate)
  early_checkout_penalty_enabled: boolean; // Enable/disable early checkout penalty
  early_checkout_penalty_rate: number; // Multiplier for early checkout penalty
  overtime_enabled: boolean; // Enable/disable overtime pay
  overtime_multiplier: number; // Multiplier for overtime (1.5 = time and a half)
  overtime_grace_minutes: number; // Grace period before counting overtime
  auto_schedule_enabled?: boolean; // Auto-generate schedule when all staff submit availability

  // Workspace type
  workspace_type: WorkspaceType; // 'business' or 'education'

  // Education-specific fields (only for workspace_type='education')
  subject?: string | null; // Subject taught (e.g., "Mathematics", "English")
  grade_level?: string | null; // Grade level (e.g., "Grade 10", "Advanced")
  room_number?: string | null; // Classroom number (e.g., "204")
  academic_year?: string | null; // Academic year (e.g., "2024-2025")
  late_threshold_minutes?: number; // Minutes after session start to mark as late (default 15)

  deleted_at?: string | null; // Soft delete timestamp
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  name?: string; // Custom memorable name (optional)
  display_name: string; // Auto-computed: name > full_name > email (always non-null)
  phone: string | null;
  store_id: string;
  salary_type: 'hourly' | 'monthly' | 'daily'; // Salary type
  hour_rate: number; // Hourly rate in VND (for hourly type)
  monthly_rate?: number; // Monthly salary in VND (for monthly type)
  daily_rate?: number; // Daily rate in VND (for daily type)
  status?: 'active' | 'invited' | 'expired' | 'inactive'; // Staff status
  invited_at?: string;
  invitation_token?: string | null;
  invitation_expires_at?: string;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  store_id: string;
  name: string;
  start_time: string; // HH:mm format
  end_time: string;   // HH:mm format
  days_of_week: number[]; // 0-6, 0 = Chủ nhật
}

export interface CheckIn {
  id: string;
  staff_id: string;
  store_id: string;
  shift_template_id: string;
  check_in_time: string;
  check_out_time?: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  check_out_distance_meters?: number;
  selfie_url: string;
  checkout_selfie_url?: string;
  status: 'success' | 'late' | 'wrong_location';
  notes?: string;
  is_edited?: boolean;
  edit_reason?: string;
  edited_by?: string;
  edited_at?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
}

export interface ShiftTemplate {
  id: string;
  store_id: string;
  name: string;
  start_time: string; // HH:mm:ss format
  end_time: string; // HH:mm:ss format
  grace_period_minutes: number;
  color: string; // Hex color code
  created_at: string;
  updated_at: string;
}

export interface StaffSchedule {
  id: string;
  staff_id: string;
  store_id: string;
  shift_template_id: string;
  scheduled_date: string; // YYYY-MM-DD format
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Extended types for component usage
export interface ScheduleWithDetails extends StaffSchedule {
  shift_template?: ShiftTemplate;
  staff?: Staff;
}

// Shared component types
export type StaffFilter = 'all' | 'working' | 'late' | 'not_checked';

export type AccessMode = 'staff_only' | 'anyone';

export type CheckInStatus = 'success' | 'late' | 'wrong_location';

// Week summary type for schedule
export interface WeekSummary {
  totalShifts: number;
  staffCount: number;
  totalHours: number;
}

// Salary system types
export interface SalaryAdjustment {
  id: string;
  staff_id: string;
  store_id: string;
  adjustment_date: string; // YYYY-MM-DD
  type: 'increase' | 'decrease' | 'bonus' | 'penalty' | 'overtime' | 'deduction' | 'other';
  amount: number;
  calculation_base: 'hours' | 'fixed' | 'percentage';
  hours?: number;
  note?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryConfirmation {
  id: string;
  staff_id: string;
  store_id: string;
  month: string; // YYYY-MM
  provisional_amount: number;
  adjustments_amount: number;
  final_amount: number;
  status: 'draft' | 'confirmed' | 'paid';
  confirmed_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyWorkBreakdown {
  date: string;
  check_in_id?: string; // Check-in record ID (null for absent days)
  schedule_id?: string; // Schedule ID (needed to create check-in for absent days)
  shift_template_id?: string; // Shift template ID (needed to create check-in for absent days)
  shift_name?: string;
  shift_time?: string;
  check_in_time?: string;
  check_out_time?: string;
  is_edited?: boolean; // Indicates if check-in/out times were edited
  status: 'on_time' | 'late' | 'early_checkout' | 'absent' | 'overtime' | 'upcoming';
  base_pay: number;
  late_penalty: number;
  early_penalty: number;
  overtime_pay: number;
  subtotal: number;
}

export interface ProvisionalSalary {
  base: number;
  late_deductions: number;
  early_deductions: number;
  overtime: number;
  total: number;
}

export interface StaffSalaryCalculation {
  month: string;
  staff: Staff;
  provisional: ProvisionalSalary;
  adjustments: {
    items: SalaryAdjustment[];
    total: number;
  };
  final_amount: number;
  daily_breakdown: DailyWorkBreakdown[];
  confirmation?: SalaryConfirmation;
}

// Smart Schedule types
export interface StaffAvailability {
  id: string;
  staff_id: string;
  store_id: string;
  week_start_date: string; // YYYY-MM-DD (Monday)
  shift_template_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftRequirement {
  id: string;
  store_id: string;
  week_start_date: string; // YYYY-MM-DD (Monday)
  shift_template_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  required_staff_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleGeneration {
  id: string;
  store_id: string;
  week_start_date: string;
  total_shifts_required: number;
  total_shifts_filled: number;
  coverage_percent: number;
  fairness_score: number;
  total_warnings: number;
  is_accepted: boolean;
  accepted_at?: string;
  created_by?: string;
  created_at: string;
}

// Smart schedule algorithm types
export interface SmartScheduleShift {
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  duration: number; // hours
  required: number; // staff count needed
  dayOfWeek: number; // 0-6
}

export interface SmartScheduleAvailability {
  [staffId: string]: {
    [date: string]: {
      [shiftId: string]: boolean; // true = available
    };
  };
}

export interface SmartScheduleAssignment {
  [staffId: string]: {
    [date: string]: string[]; // array of shiftIds
  };
}

export interface SmartScheduleWarning {
  type: 'understaffed' | 'overstaffed' | 'no_shifts' | 'overwork';
  severity: 'critical' | 'warning' | 'info';
  shift?: SmartScheduleShift;
  staffId?: string;
  assigned?: number;
  required?: number;
  message: string;
}

export interface SmartScheduleStats {
  totalShiftsFilled: number;
  totalShiftsRequired: number;
  coveragePercent: number;
  avgHoursPerStaff: number;
  minHours: number;
  maxHours: number;
  hoursVariance: number;
  avgShiftsPerStaff: number;
  minShifts: number;
  maxShifts: number;
  fairnessScore: number;
}

export interface SmartScheduleResult {
  assignments: SmartScheduleAssignment;
  warnings: SmartScheduleWarning[];
  stats: SmartScheduleStats;
  staffHours: { [staffId: string]: number };
  staffShiftCount: { [staffId: string]: number };
}

// ============================================================================
// EDUCATION WORKSPACE TYPES
// ============================================================================

// Student status types
export type StudentStatus = 'active' | 'invited' | 'inactive' | 'withdrawn';

// Attendance status types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// Who marked the attendance
export type AttendanceMarkedBy = 'teacher' | 'student' | 'system';

// Student interface (similar to Staff but for education)
export interface Student {
  id: string;
  class_id: string; // References Store where workspace_type='education'
  user_id: string | null; // NULL if student hasn't created account

  // Basic Info
  full_name: string;
  student_id?: string | null; // School student ID (e.g., "SV001")
  email?: string | null;
  phone?: string | null;

  // Parent/Guardian Info
  parent_name?: string | null;
  parent_email?: string | null;
  parent_phone?: string | null;

  // Status
  status: StudentStatus;
  enrollment_date: string; // YYYY-MM-DD

  // Invitation System (like staff)
  invitation_token?: string | null;
  invitation_expires_at?: string | null;
  invited_at?: string | null;

  created_at: string;
  updated_at: string;
}

// Class Session interface (similar to ShiftTemplate but for weekly recurring classes)
export interface ClassSession {
  id: string;
  class_id: string; // References Store where workspace_type='education'

  // Session Info
  name: string; // e.g., "Period 1", "Monday Morning"
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:mm format (e.g., "09:00")
  end_time: string; // HH:mm format (e.g., "10:30")

  // UI
  color: string; // Hex color code for calendar display

  created_at: string;
  updated_at: string;
}

// Attendance Record interface (core attendance tracking for students)
export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  session_id?: string | null; // References ClassSession

  // Date & Time
  attendance_date: string; // YYYY-MM-DD
  marked_at: string; // Timestamp when marked
  check_in_time?: string | null; // HH:mm:ss (for self-check-in mode)

  // Status
  status: AttendanceStatus;

  // Who marked it
  marked_by: AttendanceMarkedBy;
  marked_by_user_id?: string | null; // Which teacher/student marked it

  // Notes
  note?: string | null; // e.g., "Sick", "Family emergency"

  // Edit tracking
  is_edited?: boolean;
  edited_at?: string | null;
  edited_by?: string | null;
  edit_reason?: string | null;

  created_at: string;
}

// Student Note interface (teacher observations)
export interface StudentNote {
  id: string;
  student_id: string;
  class_id: string;
  teacher_id: string;

  note: string;
  note_date: string; // YYYY-MM-DD

  created_at: string;
  updated_at: string;
}

// Extended types for component usage
export interface AttendanceRecordWithDetails extends AttendanceRecord {
  student?: Student;
  session?: ClassSession;
}

export interface StudentWithStats extends Student {
  attendance_percentage?: number;
  total_sessions?: number;
  present_count?: number;
  late_count?: number;
  absent_count?: number;
  excused_count?: number;
  current_streak?: number;
}

// Attendance summary for student
export interface StudentAttendanceSummary {
  student: Student;
  total_sessions: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  excused_count: number;
  attendance_percentage: number;
  current_streak: number; // days
  records: AttendanceRecord[];
}

// Daily attendance data for teacher "Today" view
export interface DailyAttendanceData {
  date: string; // YYYY-MM-DD
  sessions: ClassSession[];
  students: StudentWithAttendanceStatus[];
}

export interface StudentWithAttendanceStatus extends Student {
  attendance_status?: AttendanceStatus;
  check_in_time?: string;
  attendance_record_id?: string;
}

// Timetable data structure
export interface WeeklyTimetable {
  [dayOfWeek: number]: ClassSession[]; // 0-6 -> array of sessions
}

// Class statistics
export interface ClassStats {
  total_students: number;
  active_students: number;
  total_sessions_this_week: number;
  average_attendance: number;
  present_today: number;
  late_today: number;
  absent_today: number;
}
