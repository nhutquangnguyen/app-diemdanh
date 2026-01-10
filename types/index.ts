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
  user_id: string;
  email: string;
  full_name: string;
  name?: string; // Custom memorable name (optional)
  phone: string;
  store_id: string;
  hour_rate: number; // Hourly rate in VND
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
