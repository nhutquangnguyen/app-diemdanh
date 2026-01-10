import {
  Store,
  Staff,
  CheckIn,
  ShiftTemplate,
  StaffSchedule,
  SalaryAdjustment,
  DailyWorkBreakdown,
  ProvisionalSalary,
  StaffSalaryCalculation,
} from '@/types';

/**
 * Calculate the duration of a shift in hours
 */
export function calculateShiftDurationInHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

  // Handle shifts that cross midnight
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  return totalMinutes / 60;
}

/**
 * Calculate how many minutes late a check-in is
 * Returns 0 if within grace period or early
 */
export function calculateLateMinutes(
  checkInTime: string,
  shiftStartTime: string,
  gracePeriodMinutes: number
): number {
  const checkIn = new Date(checkInTime);
  const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);

  const shiftStart = new Date(checkIn);
  shiftStart.setHours(shiftHour, shiftMin, 0, 0);

  const diffMs = checkIn.getTime() - shiftStart.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  // If within grace period or early, not late
  if (diffMinutes <= gracePeriodMinutes) {
    return 0;
  }

  return diffMinutes - gracePeriodMinutes;
}

/**
 * Calculate how many minutes early a checkout is
 * Returns 0 if on time or late
 */
export function calculateEarlyCheckoutMinutes(
  checkOutTime: string,
  shiftEndTime: string
): number {
  const checkOut = new Date(checkOutTime);
  const [shiftHour, shiftMin] = shiftEndTime.split(':').map(Number);

  const shiftEnd = new Date(checkOut);
  shiftEnd.setHours(shiftHour, shiftMin, 0, 0);

  const diffMs = shiftEnd.getTime() - checkOut.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  // If on time or worked past shift end, not early
  if (diffMinutes <= 0) {
    return 0;
  }

  return diffMinutes;
}

/**
 * Calculate overtime minutes (working past shift end time)
 * Returns 0 if within grace period or didn't work overtime
 */
export function calculateOvertimeMinutes(
  checkOutTime: string,
  shiftEndTime: string,
  gracePeriodMinutes: number
): number {
  const checkOut = new Date(checkOutTime);
  const [shiftHour, shiftMin] = shiftEndTime.split(':').map(Number);

  const shiftEnd = new Date(checkOut);
  shiftEnd.setHours(shiftHour, shiftMin, 0, 0);

  const diffMs = checkOut.getTime() - shiftEnd.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  // If within grace period or left early, no overtime
  if (diffMinutes <= gracePeriodMinutes) {
    return 0;
  }

  return diffMinutes - gracePeriodMinutes;
}

/**
 * Calculate salary for a single staff member for a given month
 */
export function calculateStaffMonthlySalary(
  staff: Staff,
  store: Store,
  month: string, // Format: YYYY-MM
  schedules: StaffSchedule[],
  shifts: ShiftTemplate[],
  checkIns: CheckIn[],
  adjustments: SalaryAdjustment[]
): StaffSalaryCalculation {
  const dailyBreakdown: DailyWorkBreakdown[] = [];

  let totalBase = 0;
  let totalLateDeductions = 0;
  let totalEarlyDeductions = 0;
  let totalOvertime = 0;

  // Process each scheduled shift
  schedules.forEach(schedule => {
    const shift = shifts.find(s => s.id === schedule.shift_template_id);
    if (!shift) return;

    // Find check-in for this date
    const checkIn = checkIns.find(c => {
      const checkInDate = new Date(c.check_in_time).toISOString().split('T')[0];
      return checkInDate === schedule.scheduled_date;
    });

    // Calculate shift base pay
    const shiftDurationHours = calculateShiftDurationInHours(shift.start_time, shift.end_time);
    const basePay = shiftDurationHours * staff.hour_rate;

    if (!checkIn) {
      // Absent - no pay
      dailyBreakdown.push({
        date: schedule.scheduled_date,
        shift_name: shift.name,
        shift_time: `${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}`,
        status: 'absent',
        base_pay: 0,
        late_penalty: 0,
        early_penalty: 0,
        overtime_pay: 0,
        subtotal: 0,
      });
      return;
    }

    // Calculate penalties and overtime
    const lateMinutes = calculateLateMinutes(
      checkIn.check_in_time,
      shift.start_time,
      shift.grace_period_minutes
    );
    const latePenalty = lateMinutes > 0
      ? (lateMinutes / 60) * staff.hour_rate * store.late_penalty_rate
      : 0;

    let earlyMinutes = 0;
    let earlyPenalty = 0;
    let overtimeMinutes = 0;
    let overtimePay = 0;

    if (checkIn.check_out_time) {
      earlyMinutes = calculateEarlyCheckoutMinutes(checkIn.check_out_time, shift.end_time);
      earlyPenalty = earlyMinutes > 0
        ? (earlyMinutes / 60) * staff.hour_rate * store.early_checkout_penalty_rate
        : 0;

      overtimeMinutes = calculateOvertimeMinutes(
        checkIn.check_out_time,
        shift.end_time,
        store.overtime_grace_minutes
      );
      overtimePay = overtimeMinutes > 0
        ? (overtimeMinutes / 60) * staff.hour_rate * store.overtime_multiplier
        : 0;
    }

    // Determine status
    let status: DailyWorkBreakdown['status'] = 'on_time';
    if (overtimeMinutes > 0) status = 'overtime';
    else if (earlyMinutes > 0) status = 'early_checkout';
    else if (lateMinutes > 0) status = 'late';

    const subtotal = basePay - latePenalty - earlyPenalty + overtimePay;

    dailyBreakdown.push({
      date: schedule.scheduled_date,
      shift_name: shift.name,
      shift_time: `${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}`,
      check_in_time: checkIn.check_in_time,
      check_out_time: checkIn.check_out_time,
      status,
      base_pay: basePay,
      late_penalty: -latePenalty,
      early_penalty: -earlyPenalty,
      overtime_pay: overtimePay,
      subtotal,
    });

    totalBase += basePay;
    totalLateDeductions += latePenalty;
    totalEarlyDeductions += earlyPenalty;
    totalOvertime += overtimePay;
  });

  // Sort daily breakdown by date
  dailyBreakdown.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate provisional salary
  const provisionalTotal = totalBase - totalLateDeductions - totalEarlyDeductions + totalOvertime;

  const provisional: ProvisionalSalary = {
    base: totalBase,
    late_deductions: totalLateDeductions,
    early_deductions: totalEarlyDeductions,
    overtime: totalOvertime,
    total: provisionalTotal,
  };

  // Calculate adjustments total
  const adjustmentsTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  // Calculate final amount and round to nearest thousand
  const finalAmount = Math.round((provisionalTotal + adjustmentsTotal) / 1000) * 1000;

  return {
    month,
    staff,
    provisional,
    adjustments: {
      items: adjustments,
      total: adjustmentsTotal,
    },
    final_amount: finalAmount,
    daily_breakdown: dailyBreakdown,
  };
}

/**
 * Format currency in Vietnamese Dong
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Format currency without symbol (just number with separators)
 * Rounds to nearest thousand
 */
export function formatAmount(amount: number): string {
  const rounded = Math.round(amount / 1000) * 1000;
  return new Intl.NumberFormat('vi-VN').format(rounded);
}

/**
 * Get month display name in Vietnamese
 */
export function getMonthDisplayName(month: string): string {
  const [year, monthNum] = month.split('-');
  return `Tháng ${parseInt(monthNum)}/${year}`;
}

/**
 * Get previous month in YYYY-MM format
 */
export function getPreviousMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get next month in YYYY-MM format
 */
export function getNextMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const date = new Date(year, monthNum - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
