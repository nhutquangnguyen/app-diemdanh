# Xếp lịch AI - Smart Scheduling Algorithm

## Overview

The Xếp lịch AI (AI Smart Scheduling) uses a **two-stage optimization approach** to automatically generate fair and efficient work schedules for staff members. The algorithm prioritizes work-life balance by minimizing consecutive working days and reducing instances where staff work multiple shifts in a single day.

## Problem Statement

Given:
- A set of shifts to fill for a week (Monday-Sunday)
- Each shift has: date, time, required staff count, duration
- Staff availability matrix (who can work which shifts)
- A list of active staff members

Objectives (in priority order):
1. **Maximize coverage** - Fill as many required positions as possible
2. **Balance working days** - Distribute working days evenly (target: 6-6-6 for 3 staff, 21 total shifts)
3. **Minimize double-shifts** - Avoid assigning multiple shifts to the same person on the same day
4. **Balance workload** - Distribute total hours and shift counts fairly
5. **Rotate weekends** - Share weekend shift burden
6. **Avoid fatigue** - Minimize 3+ consecutive working days

## Algorithm Architecture

### Stage 1: Greedy Assignment with Fairness Scoring

The first stage quickly generates a baseline schedule using a greedy algorithm with strong fairness constraints.

#### Step 1.1: Shift Ordering (Round-Robin Interleaving)

Instead of chronological order (T2 → T3 → T4...), shifts are interleaved across days:

```
Round 1: T2 Ca sáng, T3 Ca sáng, T4 Ca sáng, T5 Ca sáng, T6 Ca sáng, T7 Ca sáng, CN Ca sáng
Round 2: T2 Ca trưa, T3 Ca trưa, T4 Ca trưa, T5 Ca trưa, T6 Ca trưa, T7 Ca trưa, CN Ca trưa
Round 3: T2 Ca tối, T3 Ca tối, T4 Ca tối, T5 Ca tối, T6 Ca tối, T7 Ca tối, CN Ca tối
```

**Why?** This naturally spreads work across different days before any day gets multiple shifts, reducing the need for double-shifts.

#### Step 1.2: Two-Pass Assignment

For each shift, the algorithm attempts assignment in two passes:

**Pass 1: Spread Work (Prevent Double-Shifts)**
- Only considers staff who DON'T already have a shift that day
- Scores candidates based on 6 fairness factors (see below)
- Fills as many positions as possible without double-shifts

**Pass 2: Fill Remaining (Allow Double-Shifts if Necessary)**
- Only triggered if Pass 1 couldn't fill all required positions
- Allows staff who already have a shift today
- Prioritizes staff with fewer working days to maintain balance
- Penalizes based on existing shifts today (-50 per shift)

#### Step 1.3: Scoring System

Candidates are scored using 6 weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **1. Working Days Balance** | -500 per day | Staff with fewer working days get highest priority. MOST IMPORTANT for work-life balance. |
| **2. Workload Balance (Hours)** | -10 per hour | Staff with fewer total hours prioritized |
| **3. Shift Count Balance** | -5 per shift | Even distribution of shift counts |
| **4. Consecutive Days Fatigue** | -15 to +10 | Penalize 3+ consecutive days, reward rest days |
| **5. Weekend Fairness** | -20 per weekend | Rotate weekend work fairly |
| **6. Random Tie-Breaker** | +0 to +0.1 | Very small randomness to break ties |

**Scoring Formula:**
```typescript
score =
  - (workingDays - avgWorkingDays) * 500
  - (hours - avgHours) * 10
  - (shifts - avgShifts) * 5
  - consecutiveDaysPenalty
  - weekendShifts * 20
  + random(0, 0.1)
```

Higher score = better candidate. The -500 penalty for working days deviation is intentionally very strong to enforce the 6-6-6 balance.

### Stage 2: Post-Processing Optimization (Local Search)

After the greedy phase, the algorithm performs iterative local optimization to fix problems.

#### Step 2.1: Problem Identification

For each shift assignment, check if staff member has multiple shifts that day.

#### Step 2.2: Local Swap Search

For each double-shift problem:

1. **Find swap candidate**: Look for another staff member who:
   - Is available for that shift
   - Does NOT work that day (reduces double-shift count)
   - Has fewer or equal working days (maintains balance)

2. **Evaluate swap**: Check if swap improves:
   - Double-shift count (decreases)
   - Working days variance (doesn't get worse)

3. **Execute swap**: If beneficial:
   ```typescript
   // Remove shift from staffA
   assignments[staffA][date].remove(shiftId)
   if (assignments[staffA][date].isEmpty) {
     staffWorkingDays[staffA].delete(date)
   }

   // Add shift to staffB
   assignments[staffB][date].add(shiftId)
   staffWorkingDays[staffB].add(date)
   ```

#### Step 2.3: Iteration

Repeat swap attempts until:
- No more improvements found, OR
- Maximum 20 iterations reached (prevent infinite loop)

## Data Structures

### Input Types

```typescript
SmartScheduleShift {
  date: string              // YYYY-MM-DD
  shiftTemplateId: string   // e.g., "morning", "afternoon", "evening"
  shiftName: string         // Display name
  startTime: string         // HH:mm
  endTime: string           // HH:mm
  duration: number          // hours
  required: number          // staff count needed
  dayOfWeek: number         // 0-6 (0=Sunday)
}

SmartScheduleAvailability {
  [staffId: string]: {
    [date: string]: {
      [shiftId: string]: boolean  // true = available
    }
  }
}
```

### Internal Tracking

```typescript
assignments: {
  [staffId: string]: {
    [date: string]: string[]  // array of shiftIds assigned
  }
}

staffHours: { [staffId: string]: number }
staffShiftCount: { [staffId: string]: number }
staffWorkingDays: { [staffId: string]: Set<string> }  // unique dates
```

## Output

```typescript
SmartScheduleResult {
  assignments: SmartScheduleAssignment
  warnings: SmartScheduleWarning[]
  stats: SmartScheduleStats
  staffHours: { [staffId: string]: number }
  staffShiftCount: { [staffId: string]: number }
}

SmartScheduleStats {
  totalShiftsFilled: number
  totalShiftsRequired: number
  coveragePercent: number        // 0-100

  avgHoursPerStaff: number
  minHours: number
  maxHours: number
  hoursVariance: number

  avgShiftsPerStaff: number
  minShifts: number
  maxShifts: number

  fairnessScore: number         // 0-100 (higher = more fair)
}
```

## Performance Characteristics

- **Time Complexity**: O(S × N × log(N) + I × S × N²)
  - S = number of shifts
  - N = number of staff
  - I = optimization iterations (max 20)
  - Typically ~100ms for 21 shifts, 5 staff

- **Space Complexity**: O(S × N)
  - Stores assignments for all staff-shift combinations

## Example Scenario

**Input:**
- 3 shifts/day × 7 days = 21 shifts total
- 3 active staff: Yên, Thủy, Vy
- 2 inactive staff: Quang (dummy), My (limited availability)
- Target: 7 shifts per active staff

**Expected Output:**
- Coverage: 95-100% (20-21 shifts filled)
- Working days: 6-6-6 or 6-6-7 (balanced)
- Double-shifts: 0-2 per week (minimized)
- Fairness score: 90-98

**Sample Result:**
```
Yên:  T3, T4, T5 (2 shifts), T6, T7, CN  = 6 days, 1 double-shift, 7 shifts
Thủy: T2, T3, T4, T5, T6, CN            = 6 days, 0 double-shifts, 6 shifts
Vy:   T2, T3, T4, T5, T6, T7, CN        = 7 days, 0 double-shifts, 7 shifts
```

## Known Limitations

1. **Greedy Foundation**: The algorithm makes locally optimal decisions that may not be globally optimal. The optimization phase helps but cannot guarantee perfect results.

2. **Limited Backtracking**: Stage 2 can only fix problems through swaps. It cannot "undo" and try completely different assignment patterns.

3. **Availability Constraints**: If staff availability is very limited or unbalanced, perfect fairness may be impossible.

4. **No Multi-Week Optimization**: Each week is scheduled independently without considering previous weeks.

## Future Improvements

Potential enhancements to consider:

1. **Multi-Week Balancing**: Track working days across multiple weeks to ensure long-term fairness

2. **Integer Linear Programming (ILP)**: Use optimization solver for guaranteed optimal solutions (higher complexity)

3. **Simulated Annealing**: Add randomized optimization for better global search

4. **User Preferences**: Allow staff to specify preferred days/shifts with weighted scoring

5. **Shift Swapping UI**: Let managers manually swap shifts with conflict detection

6. **History-Aware Scheduling**: Consider past schedules when generating new ones

7. **Fatigue Modeling**: More sophisticated models for rest days and recovery

## References

- Location: `/lib/smartSchedule.ts`
- Related Types: `/types/index.ts`
- UI Component: `/components/SmartSchedule.tsx`
- Database Tables: `staff_availability`, `shift_requirements`, `schedule_generations`

---

**Last Updated**: January 2026
**Algorithm Version**: 2.0 (Two-Stage Optimization)
**Author**: Claude Code + Product Team
