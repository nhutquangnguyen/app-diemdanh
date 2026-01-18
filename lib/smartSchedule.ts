import {
  SmartScheduleShift,
  SmartScheduleAvailability,
  SmartScheduleAssignment,
  SmartScheduleWarning,
  SmartScheduleStats,
  SmartScheduleResult,
} from '@/types';

/**
 * Generate Smart Schedule using Variance-Greedy algorithm that maximizes fairness score
 *
 * Algorithm: For each shift, assigns to staff that results in lowest overall variance
 * Includes local swap optimization to refine results (+3-8 points)
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
  console.log(`[SmartSchedule] Using Variance-Greedy algorithm`);

  // Generate initial schedule
  let result = varianceGreedySchedule(shifts, availability, staffList, allowMultipleShiftsPerDay);

  // Refine with local swap optimization
  console.log(`[SmartSchedule] Initial score: ${result.stats.fairnessScore}`);
  result = localSwapOptimization(result, shifts, availability, staffList);
  console.log(`[SmartSchedule] Final score after refinement: ${result.stats.fairnessScore}`);

  return result;
}

/**
 * Variance-Greedy Algorithm: Minimizes variance at each step
 * For each shift, assigns to staff that results in lowest overall variance
 */
function varianceGreedySchedule(
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

  // Smart sorting: Process shifts with fewer available staff first (scarcity-first)
  // This prevents the algorithm from "wasting" scarce staff on easy-to-fill shifts
  const sortedShifts = shifts.map(shift => {
    // Count how many staff are available for this shift (and don't have other shifts that day)
    const availableCount = staffList.filter(staffId => {
      const isAvailable = availability[staffId]?.[shift.date]?.[shift.shiftTemplateId];
      return isAvailable;
    }).length;

    return { shift, availableCount };
  })
  .sort((a, b) => {
    // Primary: Fewer available staff = higher priority (process first)
    if (a.availableCount !== b.availableCount) {
      return a.availableCount - b.availableCount;
    }
    // Secondary: Earlier date = higher priority
    if (a.shift.date !== b.shift.date) {
      return a.shift.date.localeCompare(b.shift.date);
    }
    // Tertiary: Earlier time = higher priority
    return a.shift.startTime.localeCompare(b.shift.startTime);
  })
  .map(item => item.shift);


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
      // VARIANCE-MINIMIZING APPROACH:
      // Simulate assigning this shift to this staff and calculate resulting variance
      const tempHours = { ...staffHours };
      tempHours[staffId] += duration;

      // Calculate variance only for active staff (those with hours > 0)
      const activeHours = Object.values(tempHours).filter(h => h > 0);
      const variance = activeHours.length > 1
        ? Math.max(...activeHours) - Math.min(...activeHours)
        : 0;

      // Primary score: negative variance (lower variance = higher score)
      let score = -variance * 100;

      // Secondary factors (to balance with variance):

      // Avoid double shifts (weight 10000 - ABSOLUTE priority!)
      // Make double shifts virtually impossible unless no other option exists
      // This prevents double shifts even if variance benefit is large
      const shiftsToday = assignments[staffId][date] || [];
      if (shiftsToday.length > 0) {
        score -= 10000; // Huge penalty if already working today
      }

      // Shift count balance (weight 10)
      const shiftDeviation = staffShiftCount[staffId] - avgShifts;
      score -= shiftDeviation * 10;

      // Avoid consecutive days (weight 5-15)
      const yesterdayDate = getPreviousDate(date);
      const tomorrowDate = getNextDate(date);
      const workedYesterday = (assignments[staffId][yesterdayDate] || []).length > 0;
      const workedTomorrow = (assignments[staffId][tomorrowDate] || []).length > 0;
      if (workedYesterday && workedTomorrow) {
        score -= 15;
      } else if (workedYesterday || workedTomorrow) {
        score -= 5;
      }

      // Weekend fairness (weight 20)
      const isWeekend = shift.dayOfWeek === 0 || shift.dayOfWeek === 6;
      if (isWeekend) {
        const weekendShiftsThisWeek = countWeekendShifts(assignments[staffId]);
        score -= weekendShiftsThisWeek * 20;
      }

      // Deterministic tie-breaker: use staff index (no random!)
      score += staffList.indexOf(staffId) * 0.01;

      return { staffId, score, variance };
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

      // Score Pass 2 candidates (allow double shifts when necessary)
      const scoredCandidatesPass2 = candidatesPass2.map(staffId => {
        // VARIANCE-MINIMIZING APPROACH (same as Pass 1)
        const tempHours = { ...staffHours };
        tempHours[staffId] += duration;

        const activeHours = Object.values(tempHours).filter(h => h > 0);
        const variance = activeHours.length > 1
          ? Math.max(...activeHours) - Math.min(...activeHours)
          : 0;

        // Primary score: negative variance
        let score = -variance * 100;

        // Secondary factors:
        const shiftsToday = assignments[staffId][date] || [];
        if (shiftsToday.length > 0) {
          score -= 10000; // Huge penalty if already working today (PASS 2 should be last resort)
        }

        const shiftDeviation = staffShiftCount[staffId] - avgShifts;
        score -= shiftDeviation * 10;

        // Deterministic tie-breaker
        score += staffList.indexOf(staffId) * 0.01;

        return { staffId, score, variance };
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
 * Aggressive Local Swap Optimization: Eliminates double shifts and balances hours
 * Priority 1: Eliminate double shifts
 * Priority 2: Reduce variance
 */
function localSwapOptimization(
  result: SmartScheduleResult,
  shifts: SmartScheduleShift[],
  availability: SmartScheduleAvailability,
  staffList: string[],
  maxIterations: number = 100
): SmartScheduleResult {
  let { assignments, staffHours, staffShiftCount, warnings, stats } = result;

  // PHASE 1: Aggressively eliminate double shifts (high priority)
  console.log('[Optimization] Phase 1: Eliminating double shifts...');
  let doubleShiftEliminated = true;
  let phase1Iterations = 0;

  while (doubleShiftEliminated && phase1Iterations < 50) {
    doubleShiftEliminated = false;

    // Find all double shifts
    const doubleShifts: { staffId: string; date: string; shifts: string[] }[] = [];
    for (const staffId of staffList) {
      for (const date in assignments[staffId]) {
        const shiftsToday = assignments[staffId][date] || [];
        if (shiftsToday.length > 1) {
          doubleShifts.push({ staffId, date, shifts: shiftsToday });
        }
      }
    }

    console.log(`[Optimization] Found ${doubleShifts.length} double shifts`);

    // Try to eliminate each double shift by swapping one of the shifts
    for (const { staffId: staffA, date, shifts: shiftsToday } of doubleShifts) {
      // Try to move one of the shifts to another staff
      for (const shiftId of shiftsToday) {
        const shift = shifts.find(s => s.date === date && s.shiftTemplateId === shiftId);
        if (!shift) continue;

        // Find staff who are available but DON'T have a shift today
        const candidates = staffList.filter(staffB => {
          if (staffA === staffB) return false;

          // Must be available for this shift
          const isAvailable = availability[staffB]?.[date]?.[shiftId];
          if (!isAvailable) return false;

          // Must NOT already have this shift
          const hasShift = (assignments[staffB][date] || []).includes(shiftId);
          if (hasShift) return false;

          // Prefer staff who DON'T have any shift today (to avoid creating new double shifts)
          const shiftsToday = (assignments[staffB][date] || []).length;
          return shiftsToday === 0;
        });

        if (candidates.length > 0) {
          // Pick candidate with most similar hours (to maintain balance)
          const bestCandidate = candidates.reduce((best, staffB) => {
            const aDiff = Math.abs(staffHours[staffB] - staffHours[staffA]);
            const bDiff = Math.abs(staffHours[best] - staffHours[staffA]);
            return aDiff < bDiff ? staffB : best;
          }, candidates[0]);

          // Perform swap: Move shift from staffA to bestCandidate
          console.log(`[Optimization] Moving ${shiftId} on ${date} from ${staffA} to ${bestCandidate}`);

          assignments[staffA][date] = assignments[staffA][date].filter(id => id !== shiftId);
          staffHours[staffA] -= shift.duration;
          staffShiftCount[staffA] -= 1;
          if (assignments[staffA][date].length === 0) {
            delete assignments[staffA][date];
          }

          if (!assignments[bestCandidate][date]) {
            assignments[bestCandidate][date] = [];
          }
          assignments[bestCandidate][date].push(shiftId);
          staffHours[bestCandidate] += shift.duration;
          staffShiftCount[bestCandidate] += 1;

          doubleShiftEliminated = true;
          break;
        }
      }
      if (doubleShiftEliminated) break;
    }

    phase1Iterations++;
  }

  // PHASE 2: Reduce variance through swaps (lower priority)
  console.log('[Optimization] Phase 2: Reducing variance...');
  let varianceImproved = true;
  let phase2Iterations = 0;

  while (varianceImproved && phase2Iterations < 50) {
    varianceImproved = false;
    const currentVariance = calculateVarianceFromHours(staffHours, staffShiftCount);

    // Try swapping each shift
    for (const shift of shifts) {
      const assignedStaff = staffList.filter(staffId =>
        (assignments[staffId][shift.date] || []).includes(shift.shiftTemplateId)
      );

      for (const staffA of assignedStaff) {
        for (const staffB of staffList) {
          if (staffA === staffB) continue;

          const isAvailable = availability[staffB]?.[shift.date]?.[shift.shiftTemplateId];
          if (!isAvailable) continue;

          const staffBShifts = assignments[staffB][shift.date] || [];
          if (staffBShifts.includes(shift.shiftTemplateId)) continue;

          // Check if swap would create a double shift
          const wouldCreateDoubleShift = staffBShifts.length > 0;
          const wouldEliminateDoubleShift = (assignments[staffA][shift.date] || []).length > 1;

          // Simulate swap
          const tempHours = { ...staffHours };
          tempHours[staffA] -= shift.duration;
          tempHours[staffB] += shift.duration;
          const newVariance = calculateVarianceFromHours(tempHours, staffShiftCount);

          // Accept swap if: reduces variance AND doesn't create new double shifts
          // OR eliminates a double shift even if variance increases slightly
          const shouldSwap =
            (newVariance < currentVariance && !wouldCreateDoubleShift) ||
            (wouldEliminateDoubleShift && !wouldCreateDoubleShift);

          if (shouldSwap) {
            // Perform swap
            assignments[staffA][shift.date] = assignments[staffA][shift.date].filter(
              id => id !== shift.shiftTemplateId
            );
            staffHours[staffA] -= shift.duration;
            staffShiftCount[staffA] -= 1;
            if (assignments[staffA][shift.date].length === 0) {
              delete assignments[staffA][shift.date];
            }

            if (!assignments[staffB][shift.date]) {
              assignments[staffB][shift.date] = [];
            }
            assignments[staffB][shift.date].push(shift.shiftTemplateId);
            staffHours[staffB] += shift.duration;
            staffShiftCount[staffB] += 1;

            varianceImproved = true;
            break;
          }
        }
        if (varianceImproved) break;
      }
      if (varianceImproved) break;
    }

    phase2Iterations++;
  }

  console.log(`[Optimization] Completed: Phase1=${phase1Iterations} iterations, Phase2=${phase2Iterations} iterations`);

  // Recalculate stats after optimization
  stats = calculateStats(staffList, staffHours, staffShiftCount, shifts, assignments, availability);

  return { assignments, warnings, stats, staffHours, staffShiftCount };
}

/**
 * Calculate variance from hours map (helper for optimization)
 */
function calculateVarianceFromHours(
  staffHours: { [staffId: string]: number },
  staffShiftCount: { [staffId: string]: number }
): number {
  const activeHours = Object.entries(staffHours)
    .filter(([staffId, hours]) => staffShiftCount[staffId] > 0)
    .map(([_, hours]) => hours);

  if (activeHours.length <= 1) return 0;
  return Math.max(...activeHours) - Math.min(...activeHours);
}

/**
 * Post-process optimization: Try to reduce double-shifts and balance hours
 * Uses local search to swap shifts between staff members
 *
 * IMPORTANT: Must update staffHours and staffShiftCount when swapping!
 *
 * NOTE: This function is now superseded by localSwapOptimization above,
 * but kept for backward compatibility
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
  const getHoursVariance = () => {
    const hours = Object.values(staffHours);
    if (hours.length === 0) return 0;
    return Math.max(...hours) - Math.min(...hours);
  };

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

  let improved = true;
  let iterations = 0;
  const maxIterations = 20; // Prevent infinite loop

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Try to swap shifts between staff to reduce double-shifts and balance hours
    for (const shift of shifts) {
      const { date, shiftTemplateId } = shift;

      // Find staff assigned to this shift
      const assignedStaff = staffList.filter(staffId =>
        (assignments[staffId][date] || []).includes(shiftTemplateId)
      );

      for (const staffA of assignedStaff) {
        const staffAShiftsToday = (assignments[staffA][date] || []).length;
        const staffAHours = staffHours[staffA];

        // Try to swap with someone who has fewer hours or doesn't work today
        for (const staffB of staffList) {
          if (staffB === staffA) continue;

          const isAvailable = availability[staffB]?.[date]?.[shiftTemplateId];
          const staffBShiftsToday = (assignments[staffB][date] || []).length;
          const staffBHours = staffHours[staffB];

          // Only swap if:
          // 1. StaffB is available for this shift
          // 2. Swap improves hours balance OR reduces double shifts
          if (isAvailable) {
            const currentHoursVariance = getHoursVariance();
            const currentDoubleShifts = getDoubleShiftCount();

            // Check if swap would improve situation
            const wouldReduceDoubleShifts = staffAShiftsToday > 1 && staffBShiftsToday === 0;
            const wouldImproveHoursBalance = staffAHours > staffBHours + shift.duration;

            if (wouldReduceDoubleShifts || wouldImproveHoursBalance) {
              // Get shift duration for updating hours
              const shiftDuration = shift.duration;

              // Remove from staffA
              assignments[staffA][date] = assignments[staffA][date].filter(id => id !== shiftTemplateId);
              staffHours[staffA] -= shiftDuration;
              staffShiftCount[staffA] -= 1;
              if (assignments[staffA][date].length === 0) {
                delete assignments[staffA][date];
                staffWorkingDays[staffA].delete(date);
              }

              // Add to staffB
              if (!assignments[staffB][date]) {
                assignments[staffB][date] = [];
              }
              assignments[staffB][date].push(shiftTemplateId);
              staffHours[staffB] += shiftDuration;
              staffShiftCount[staffB] += 1;
              staffWorkingDays[staffB].add(date);

              improved = true;
              break; // Move to next shift
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
 * Calculate fairness score based on hours variance only
 * Excludes staff with 0 shifts from calculation
 * Score can be negative (no clamping)
 */
function calculateFairnessScore(
  hours: number[],
  shiftCounts: number[]
): number {
  // Filter out staff with 0 shifts
  const activeHours = hours.filter((h, idx) => shiftCounts[idx] > 0);

  // If no one has shifts or only 1 person has shifts, perfect score
  if (activeHours.length === 0) return 100;
  if (activeHours.length === 1) return 100;

  // Lower variance = more fair
  const hoursVariance = Math.max(...activeHours) - Math.min(...activeHours);

  // Score: 100 = perfect fairness, negative = very unfair
  // Only penalize based on hours difference
  let score = 100;
  score -= hoursVariance * 2;      // -2 points per hour difference

  return score;  // No clamping - allow negative scores
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
