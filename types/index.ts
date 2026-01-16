export interface Store {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  qr_code: string;
  radius_meters: number; // Bán kính cho phép check-in (mét)
  gps_required: boolean; // Yêu cầu xác thực GPS
  selfie_required: boolean; // Yêu cầu chụp selfie
  access_mode: 'staff_only' | 'anyone'; // Chế độ truy cập
  late_penalty_rate: number; // Multiplier for late penalty (1.0 = same as hourly rate)
  early_checkout_penalty_rate: number; // Multiplier for early checkout penalty
  overtime_multiplier: number; // Multiplier for overtime (1.5 = time and a half)
  overtime_grace_minutes: number; // Grace period before counting overtime
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
  hour_rate: number; // Hourly rate in VND
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
  shift_name?: string;
  shift_time?: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'on_time' | 'late' | 'early_checkout' | 'absent' | 'overtime';
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
