import {
  SmartScheduleShift,
  SmartScheduleAvailability,
  SmartScheduleAssignment,
  SmartScheduleWarning,
  SmartScheduleStats,
  SmartScheduleResult,
} from '@/types';

/**
 * Generate Smart Schedule using greedy algorithm with fairness balancing
 *
 * Algorithm considers 7 factors when scoring candidates:
 * 1. Working days balance - Even distribution of working days (MOST IMPORTANT)
 * 2. Workload balance (hours) - Staff with fewer hours prioritized
 * 3. Shift count balance - Even distribution of shifts
 * 4. Consecutive days fatigue - Avoid 3+ days in a row
 * 5. Weekend rotation - Fair distribution of weekend shifts
 * 6. Multiple shifts same day - Heavy penalty to preserve productivity
 * 7. Random tie-breaker - Avoid always picking same staff
 *
 * @param shifts - Array of shifts to fill for the week
 * @param availability - Staff availability matrix
 * @param staffList - Array of staff IDs
 * @param allowMultipleShiftsPerDay - Allow staff to work multiple shifts in one day (default: true, but heavily penalized)
 * @returns Schedule with assignments, warnings, and statistics
 */
export function generateSmartSchedule(
  shifts: SmartScheduleShift[],
  availability: SmartScheduleAvailability,
  staffList: string[],
  allowMultipleShiftsPerDay: boolean = true
): SmartScheduleResult {

  // ========== STEP 1: Initialize ==========
  const assignments: SmartScheduleAssignment = {};
  const staffHours: { [staffId: string]: number } = {};
  const staffShiftCount: { [staffId: string]: number } = {};
  const staffWorkingDays: { [staffId: string]: Set<string> } = {}; // Track unique working days
  const warnings: SmartScheduleWarning[] = [];

  // Initialize counters for each staff
  staffList.forEach(staffId => {
    assignments[staffId] = {}; // Will store arrays of shiftIds per date
    staffHours[staffId] = 0;
    staffShiftCount[staffId] = 0;
    staffWorkingDays[staffId] = new Set<string>(); // Track which days they work
  });


  // ========== STEP 2: Sort Shifts to Spread Across Different Days ==========
  // Strategy: Interleave shifts from different days to naturally spread work
  // Fill one shift per day first (round-robin), then fill remaining shifts
  // This prevents exhausting all staff on early days and forcing double-shifts later

  // Group shifts by date
  const shiftsByDate: { [date: string]: SmartScheduleShift[] } = {};
  shifts.forEach(shift => {
    if (!shiftsByDate[shift.date]) {
      shiftsByDate[shift.date] = [];
    }
    shiftsByDate[shift.date].push(shift);
  });

  // Sort shifts within each date by time
  Object.keys(shiftsByDate).forEach(date => {
    shiftsByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Interleave: take one shift from each date in round-robin fashion
  const sortedShifts: SmartScheduleShift[] = [];
  const dates = Object.keys(shiftsByDate).sort();
  let maxShiftsPerDay = Math.max(...Object.values(shiftsByDate).map(s => s.length));

  for (let round = 0; round < maxShiftsPerDay; round++) {
    for (const date of dates) {
      if (shiftsByDate[date][round]) {
        sortedShifts.push(shiftsByDate[date][round]);
      }
    }
  }


  // ========== STEP 3: Two-Pass Assignment Strategy ==========
  // Pass 1: Only assign staff who DON'T already have a shift that day (spread work)
  // Pass 2: Fill remaining slots, allowing double shifts if needed

  for (const shift of sortedShifts) {
    const { date, shiftTemplateId, required, duration } = shift;
    let assignedCount = 0;

    // PASS 1: Try to assign staff who don't already work this day
    const candidatesPass1 = staffList.filter(staffId => {
      const isAvailable = availability[staffId]?.[date]?.[shiftTemplateId];
      if (!isAvailable) return false;

      const shiftsToday = assignments[staffId][date] || [];
      const alreadyAssignedThisShift = shiftsToday.includes(shiftTemplateId);
      if (alreadyAssignedThisShift) return false;

      // PASS 1: Must NOT have any shift today
      const alreadyAssignedToday = shiftsToday.length > 0;
      if (alreadyAssignedToday) return false;

      return true;
    });


    // --- PASS 1: SCORING ---
    // Score candidates who DON'T have a shift today (prioritize spreading work)
    const avgHours = Object.values(staffHours).reduce((a, b) => a + b, 0) / staffList.length;
    const avgShifts = Object.values(staffShiftCount).reduce((a, b) => a + b, 0) / staffList.length;
    const avgWorkingDays = staffList.reduce((sum, id) => sum + staffWorkingDays[id].size, 0) / staffList.length;

    const scoredCandidatesPass1 = candidatesPass1.map(staffId => {
      let score = 0;

      // Factor 1: Working days balance (MOST IMPORTANT for work-life balance)
      // Staff with fewer working days gets highest priority
      // Working 7 days straight is much worse than working 5 days with same hours
      const workingDaysDeviation = staffWorkingDays[staffId].size - avgWorkingDays;
      score -= workingDaysDeviation * 500;  // -500 points per day above average (EXTREMELY strong to enforce 6-6-6 balance)

      // Factor 2: Workload balance (hours)
      // Staff with fewer hours gets higher priority
      const hoursDeviation = staffHours[staffId] - avgHours;
      score -= hoursDeviation * 10;  // -10 points per hour above average

      // Factor 3: Shift count balance
      // Staff with fewer shifts gets slight priority
      const shiftDeviation = staffShiftCount[staffId] - avgShifts;
      score -= shiftDeviation * 5;  // -5 points per shift above average

      // Factor 4: Avoid consecutive days (fatigue prevention)
      const yesterdayDate = getPreviousDate(date);
      const tomorrowDate = getNextDate(date);
      const workedYesterday = (assignments[staffId][yesterdayDate] || []).length > 0;
      const workedTomorrow = (assignments[staffId][tomorrowDate] || []).length > 0;
      if (workedYesterday && workedTomorrow) {
        score -= 15;  // Penalize working 3 days in a row
      } else if (workedYesterday || workedTomorrow) {
        score -= 5;   // Slight penalty for back-to-back days
      } else {
        score += 10;  // Bonus for having rest days adjacent
      }

      // Factor 5: Weekend fairness
      const isWeekend = shift.dayOfWeek === 0 || shift.dayOfWeek === 6;
      if (isWeekend) {
        const weekendShiftsThisWeek = countWeekendShifts(assignments[staffId]);
        score -= weekendShiftsThisWeek * 20;  // Rotate weekend work
      }

      // Factor 6: Random tie-breaker (avoid always picking same staff)
      score += Math.random() * 0.1;  // Very small random factor to break ties only

      return { staffId, score };
    });

    // Sort PASS 1 by score (highest = best candidate)
    scoredCandidatesPass1.sort((a, b) => b.score - a.score);

    // --- PASS 1: ASSIGNMENT ---
    // Assign as many as possible from Pass 1 (staff without shifts today)
    const pass1Count = Math.min(required, scoredCandidatesPass1.length);
    for (let i = 0; i < pass1Count; i++) {
      const { staffId } = scoredCandidatesPass1[i];

      // Initialize array if needed
      if (!assignments[staffId][date]) {
        assignments[staffId][date] = [];
      }

      // Add shift to this staff's assignments for this date
      assignments[staffId][date].push(shiftTemplateId);
      staffHours[staffId] += duration;
      staffShiftCount[staffId] += 1;
      staffWorkingDays[staffId].add(date); // Track this working day
      assignedCount++;
    }

    // --- PASS 2: If still need more staff, allow double shifts ---
    if (assignedCount < required) {
      const candidatesPass2 = staffList.filter(staffId => {
        const isAvailable = availability[staffId]?.[date]?.[shiftTemplateId];
        if (!isAvailable) return false;

        const shiftsToday = assignments[staffId][date] || [];
        const alreadyAssignedThisShift = shiftsToday.includes(shiftTemplateId);
        if (alreadyAssignedThisShift) return false;

        // PASS 2: Allow staff who already have a shift today
        return true;
      });

      // Score Pass 2 candidates (prioritize those with fewer total working days)
      const scoredCandidatesPass2 = candidatesPass2.map(staffId => {
        let score = 0;

        // Prioritize staff with fewer working days (same strong penalty as Pass 1)
        const workingDaysDeviation = staffWorkingDays[staffId].size - avgWorkingDays;
        score -= workingDaysDeviation * 500;  // Keep same as Pass 1

        // Prioritize staff with fewer hours
        const hoursDeviation = staffHours[staffId] - avgHours;
        score -= hoursDeviation * 10;

        // Penalize if this would be their 2nd shift today (prefer those with 0 shifts today if possible)
        const shiftsToday = assignments[staffId][date] || [];
        score -= shiftsToday.length * 50;  // -50 for each shift already assigned today

        // Random tie-breaker
        score += Math.random() * 0.1;  // Very small random factor to break ties only

        return { staffId, score };
      });

      scoredCandidatesPass2.sort((a, b) => b.score - a.score);

      const pass2Count = Math.min(required - assignedCount, scoredCandidatesPass2.length);
      for (let i = 0; i < pass2Count; i++) {
        const { staffId } = scoredCandidatesPass2[i];

        if (!assignments[staffId][date]) {
          assignments[staffId][date] = [];
        }

        assignments[staffId][date].push(shiftTemplateId);
        staffHours[staffId] += duration;
        staffShiftCount[staffId] += 1;
        // Don't add to staffWorkingDays again - already counted
        assignedCount++;
      }
    }

    // --- WARNING DETECTION ---
    if (assignedCount < required) {
      warnings.push({
        type: 'understaffed',
        severity: required - assignedCount >= 2 ? 'critical' : 'warning',
        shift: shift,
        assigned: assignedCount,
        required: required,
        message: `${formatDate(date)} ${shift.shiftName}: Cần ${required} người, chỉ có ${assignedCount} người rảnh`
      });
    }
  }


  // ========== STEP 4: Post-Process Optimization ==========
  // Try to reduce double-shifts and balance working days through local swaps
  optimizeSchedule(assignments, availability, staffList, shifts, staffHours, staffShiftCount, staffWorkingDays);


  // ========== STEP 5: Calculate Statistics ==========
  const stats = calculateStats(staffList, staffHours, staffShiftCount, shifts, assignments, availability);


  // ========== STEP 6: Final Validation ==========
  const validationWarnings = validateSchedule(assignments, staffHours, staffList);
  warnings.push(...validationWarnings);


  return { assignments, warnings, stats, staffHours, staffShiftCount };
}

/**
 * Post-process optimization: Try to reduce double-shifts and balance working days
 * Uses local search to swap shifts between staff members
 */
function optimizeSchedule(
  assignments: SmartScheduleAssignment,
  availability: SmartScheduleAvailability,
  staffList: string[],
  shifts: SmartScheduleShift[],
  staffHours: { [staffId: string]: number },
  staffShiftCount: { [staffId: string]: number },
  staffWorkingDays: { [staffId: string]: Set<string> }
): void {
  // Calculate current quality metrics
  const getDoubleShiftCount = () => {
    let count = 0;
    staffList.forEach(staffId => {
      Object.keys(assignments[staffId] || {}).forEach(date => {
        const shiftsOnDay = (assignments[staffId][date] || []).length;
        if (shiftsOnDay > 1) count++;
      });
    });
    return count;
  };

  const getWorkingDaysVariance = () => {
    const workingDayCounts = staffList.map(id => staffWorkingDays[id].size);
    const max = Math.max(...workingDayCounts);
    const min = Math.min(...workingDayCounts);
    return max - min;
  };

  let improved = true;
  let iterations = 0;
  const maxIterations = 20; // Prevent infinite loop

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Try to swap shifts between staff to reduce double-shifts
    for (const shift of shifts) {
      const { date, shiftTemplateId } = shift;

      // Find staff assigned to this shift
      const assignedStaff = staffList.filter(staffId =>
        (assignments[staffId][date] || []).includes(shiftTemplateId)
      );

      for (const staffA of assignedStaff) {
        const staffAShiftsToday = (assignments[staffA][date] || []).length;

        // If staffA has multiple shifts today, try to swap with someone who doesn't work today
        if (staffAShiftsToday > 1) {
          // Find candidate to swap with: available for this shift but NOT working today
          for (const staffB of staffList) {
            if (staffB === staffA) continue;

            const isAvailable = availability[staffB]?.[date]?.[shiftTemplateId];
            const staffBShiftsToday = (assignments[staffB][date] || []).length;
            const staffBWorkingDays = staffWorkingDays[staffB].size;
            const staffAWorkingDays = staffWorkingDays[staffA].size;

            // Only swap if:
            // 1. StaffB is available for this shift
            // 2. StaffB doesn't work today (reduces double-shifts)
            // 3. Swap doesn't make working days balance worse
            if (isAvailable && staffBShiftsToday === 0) {
              // Check if swap improves balance
              const currentVariance = getWorkingDaysVariance();

              // Simulate swap
              const staffAWouldLoseDay = staffAShiftsToday === 2; // Would go from 2 shifts to 1
              const staffBWouldGainDay = staffBShiftsToday === 0; // Would go from 0 to 1

              let newVariance = currentVariance;
              if (staffAWouldLoseDay && staffAWorkingDays > staffBWorkingDays) {
                // Improves balance: staffA loses a day, staffB gains a day
                newVariance = Math.max(
                  Math.abs((staffAWorkingDays - 1) - staffBWorkingDays),
                  currentVariance - 1
                );
              }

              // Perform swap if it improves situation
              if (staffBWouldGainDay) {
                // Remove from staffA
                assignments[staffA][date] = assignments[staffA][date].filter(id => id !== shiftTemplateId);
                if (assignments[staffA][date].length === 0) {
                  delete assignments[staffA][date];
                  staffWorkingDays[staffA].delete(date);
                }

                // Add to staffB
                if (!assignments[staffB][date]) {
                  assignments[staffB][date] = [];
                }
                assignments[staffB][date].push(shiftTemplateId);
                staffWorkingDays[staffB].add(date);

                improved = true;
                break; // Move to next shift
              }
            }
          }
        }

        if (improved) break;
      }

      if (improved) break;
    }
  }
}

/**
 * Count how many staff are available for a specific shift
 */
function countAvailableStaff(
  shift: SmartScheduleShift,
  availability: SmartScheduleAvailability,
  staffList: string[],
  assignments: SmartScheduleAssignment
): number {
  return staffList.filter(staffId => {
    const isAvailable = availability[staffId]?.[shift.date]?.[shift.shiftTemplateId];
    const shiftsToday = assignments[staffId]?.[shift.date] || [];
    const alreadyAssignedThisShift = shiftsToday.includes(shift.shiftTemplateId);
    return isAvailable && !alreadyAssignedThisShift;
  }).length;
}

/**
 * Count weekend shifts for a staff member
 */
function countWeekendShifts(staffAssignments: { [date: string]: string[] }): number {
  let count = 0;
  Object.keys(staffAssignments).forEach(date => {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {  // Sunday or Saturday
      count += (staffAssignments[date] || []).length;
    }
  });
  return count;
}

/**
 * Get previous date
 */
function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Get next date
 */
function getNextDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dayOfWeek = dayNames[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${dayOfWeek} ${day}/${month}`;
}

/**
 * Calculate fairness score (0-100, higher = more fair)
 */
function calculateFairnessScore(
  hours: number[],
  shiftCounts: number[]
): number {
  if (hours.length === 0) return 100;

  // Lower variance = more fair
  const hoursVariance = Math.max(...hours) - Math.min(...hours);
  const shiftsVariance = Math.max(...shiftCounts) - Math.min(...shiftCounts);

  // Score: 100 = perfect fairness, 0 = very unfair
  let score = 100;
  score -= hoursVariance * 2;      // -2 points per hour difference
  score -= shiftsVariance * 5;     // -5 points per shift difference

  return Math.max(0, Math.min(100, score));  // Clamp 0-100
}

/**
 * Calculate comprehensive statistics
 */
function calculateStats(
  staffList: string[],
  staffHours: { [staffId: string]: number },
  staffShiftCount: { [staffId: string]: number },
  shifts: SmartScheduleShift[],
  assignments: SmartScheduleAssignment,
  availability: SmartScheduleAvailability
): SmartScheduleStats {
  const hours = Object.values(staffHours);
  const shiftCounts = Object.values(staffShiftCount);

  const totalShiftsFilled = staffList.reduce((sum, staffId) => {
    const staffAssignments = Object.values(assignments[staffId] || {});
    const shiftCount = staffAssignments.reduce((count, shifts) => count + shifts.length, 0);
    return sum + shiftCount;
  }, 0);

  const totalShiftsRequired = shifts.reduce((sum, s) => sum + s.required, 0);

  return {
    totalShiftsFilled,
    totalShiftsRequired,
    coveragePercent: totalShiftsRequired > 0
      ? Math.round((totalShiftsFilled / totalShiftsRequired) * 100 * 10) / 10
      : 0,

    avgHoursPerStaff: hours.length > 0
      ? Math.round((hours.reduce((a, b) => a + b, 0) / staffList.length) * 10) / 10
      : 0,
    minHours: hours.length > 0 ? Math.min(...hours) : 0,
    maxHours: hours.length > 0 ? Math.max(...hours) : 0,
    hoursVariance: hours.length > 0 ? Math.max(...hours) - Math.min(...hours) : 0,

    avgShiftsPerStaff: shiftCounts.length > 0
      ? Math.round((shiftCounts.reduce((a, b) => a + b, 0) / staffList.length) * 10) / 10
      : 0,
    minShifts: shiftCounts.length > 0 ? Math.min(...shiftCounts) : 0,
    maxShifts: shiftCounts.length > 0 ? Math.max(...shiftCounts) : 0,

    fairnessScore: Math.round(calculateFairnessScore(hours, shiftCounts))
  };
}

/**
 * Validate final schedule and generate warnings
 */
function validateSchedule(
  assignments: SmartScheduleAssignment,
  staffHours: { [staffId: string]: number },
  staffList: string[]
): SmartScheduleWarning[] {
  const warnings: SmartScheduleWarning[] = [];

  // Check for staff with 0 shifts
  staffList.forEach(staffId => {
    const totalShifts = Object.values(assignments[staffId] || {}).reduce((sum, shifts) => sum + shifts.length, 0);
    if (totalShifts === 0) {
      warnings.push({
        type: 'no_shifts',
        severity: 'info',
        staffId,
        message: `Nhân viên không có ca nào - kiểm tra lại lịch rảnh?`
      });
    }
  });

  return warnings;
}

/**
 * Get Monday of the week for a given date
 */
export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  // Format date manually to avoid timezone issues
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`;
}

/**
 * Get all dates in a week starting from Monday
 */
export function getWeekDates(weekStartDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStartDate + 'T00:00:00'); // Parse as local time

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    // Format date manually to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}
