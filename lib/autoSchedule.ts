import { supabase } from '@/lib/supabase';
import { generateSmartSchedule } from '@/lib/smartSchedule';

interface AutoScheduleParams {
  storeId: string;
  weekStartDate: string; // YYYY-MM-DD format (Monday)
}

/**
 * Checks if all active staff have submitted availability for the given week
 */
export async function checkAllStaffSubmitted(
  storeId: string,
  weekStartDate: string
): Promise<{ allSubmitted: boolean; totalStaff: number; submittedStaff: number }> {
  try {
    // Get all active staff for this store
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (staffError) throw staffError;

    const totalStaff = staff?.length || 0;
    if (totalStaff === 0) {
      return { allSubmitted: false, totalStaff: 0, submittedStaff: 0 };
    }

    // Get unique staff who have submitted availability for this week
    const { data: submissions, error: submissionError } = await supabase
      .from('staff_availability')
      .select('staff_id')
      .eq('store_id', storeId)
      .eq('week_start_date', weekStartDate);

    if (submissionError) throw submissionError;

    // Get unique staff IDs
    const uniqueStaffIds = new Set((submissions || []).map(s => s.staff_id));
    const submittedStaff = uniqueStaffIds.size;

    return {
      allSubmitted: submittedStaff === totalStaff && totalStaff > 0,
      totalStaff,
      submittedStaff,
    };
  } catch (error) {
    console.error('Error checking staff submissions:', error);
    return { allSubmitted: false, totalStaff: 0, submittedStaff: 0 };
  }
}

/**
 * Automatically generates and applies schedule when all staff submit availability
 */
export async function autoGenerateSchedule({ storeId, weekStartDate }: AutoScheduleParams): Promise<{
  success: boolean;
  message: string;
  generationId?: string;
  warnings?: any[];
}> {
  try {
    console.log('Auto-generating schedule for store:', storeId, 'week:', weekStartDate);

    // 0. Check if auto-schedule is enabled for this store
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('auto_schedule_enabled')
      .eq('id', storeId)
      .single();

    if (storeError) throw storeError;

    if (!storeData?.auto_schedule_enabled) {
      console.log('Auto-schedule is disabled for this store');
      return { success: false, message: 'Auto-schedule feature is disabled' };
    }

    // Check if auto-schedule was already triggered for this week
    const { data: existingTrigger, error: triggerError } = await supabase
      .from('auto_schedule_triggers')
      .select('id, triggered_at')
      .eq('store_id', storeId)
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (triggerError) {
      throw triggerError;
    }

    if (existingTrigger) {
      console.log('Auto-schedule already triggered for this week on:', existingTrigger.triggered_at);
      return { success: false, message: 'Already triggered for this week' };
    }

    // 1. Get all shifts for this store
    const { data: shifts, error: shiftsError } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('store_id', storeId);

    if (shiftsError) throw shiftsError;
    if (!shifts || shifts.length === 0) {
      return { success: false, message: 'No shift templates found' };
    }

    // 2. Get all active staff
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (staffError) throw staffError;
    if (!staff || staff.length === 0) {
      return { success: false, message: 'No active staff found' };
    }

    // 3. Load current week's requirements (set by owner in Settings)
    const { data: currentWeekRequirements, error: reqError } = await supabase
      .from('shift_requirements')
      .select('*')
      .eq('store_id', storeId)
      .eq('week_start_date', weekStartDate);

    if (reqError) throw reqError;

    // If no requirements for current week, skip auto-generation
    if (!currentWeekRequirements || currentWeekRequirements.length === 0) {
      console.log('No requirements set for current week, skipping auto-generation');
      return { success: false, message: 'Chưa có yêu cầu nhân viên cho tuần này. Vui lòng vào Cài Đặt để thiết lập.' };
    }

    // 4. Get staff availability for this week
    const { data: availability, error: availError } = await supabase
      .from('staff_availability')
      .select('*')
      .eq('store_id', storeId)
      .eq('week_start_date', weekStartDate);

    if (availError) throw availError;

    // 5. Prepare data for smart schedule algorithm
    const weekStartDateObj = new Date(weekStartDate);
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDateObj);
      date.setDate(weekStartDateObj.getDate() + i);
      weekDates.push(date);
    }

    // Calculate shift duration helper
    function calculateShiftDuration(startTime: string, endTime: string): number {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;
      if (endMinutes < startMinutes) endMinutes += 24 * 60;
      return (endMinutes - startMinutes) / 60;
    }

    // Build shifts data from current week's requirements
    const shiftsData = [];
    for (const req of currentWeekRequirements) {
      const shift = shifts.find(s => s.id === req.shift_template_id);
      if (!shift) continue;

      const dayIndex = req.day_of_week === 0 ? 6 : req.day_of_week - 1; // Convert to 0-6 (Monday=0)

      shiftsData.push({
        date: weekDates[dayIndex].toISOString().split('T')[0], // Convert Date to string
        shiftTemplateId: shift.id,
        shiftName: shift.name,
        startTime: shift.start_time,
        endTime: shift.end_time,
        duration: calculateShiftDuration(shift.start_time, shift.end_time),
        required: req.required_staff_count,
        dayOfWeek: req.day_of_week,
      });
    }

    if (shiftsData.length === 0) {
      return { success: false, message: 'No shifts with requirements' };
    }

    // Build availability matrix
    const availabilityMatrix: any = {};
    staff.forEach(s => {
      availabilityMatrix[s.id] = {};
      weekDates.forEach((date, dayIndex) => {
        availabilityMatrix[s.id][date.toISOString().split('T')[0]] = {};
        shifts.forEach(shift => {
          // Check if staff is available for this day/shift
          const isAvailable = availability?.some(
            a => a.staff_id === s.id &&
                 a.shift_template_id === shift.id &&
                 a.day_of_week === dayIndex &&
                 a.is_available
          ) || false;

          availabilityMatrix[s.id][date.toISOString().split('T')[0]][shift.id] = isAvailable;
        });
      });
    });

    // 6. Run smart schedule algorithm
    const result = generateSmartSchedule(
      shiftsData,
      availabilityMatrix,
      staff.map(s => s.id)
    );

    // 7. Save schedule generation record with warnings and stats
    const { data: generationData, error: genError } = await supabase
      .from('schedule_generations')
      .insert([
        {
          store_id: storeId,
          week_start_date: weekStartDate,
          total_shifts_required: result.stats.totalShiftsRequired,
          total_shifts_filled: result.stats.totalShiftsFilled,
          coverage_percent: result.stats.coveragePercent,
          fairness_score: result.stats.fairnessScore,
          total_warnings: result.warnings.length,
          warnings: result.warnings, // Store warnings as JSONB
          stats: result.stats, // Store stats as JSONB
          is_auto_generated: true,
          auto_triggered_at: new Date().toISOString(),
          is_accepted: true, // Auto-apply
          accepted_at: new Date().toISOString(),
          needs_review: result.warnings.length > 0, // Show red badge if there are warnings
        },
      ])
      .select()
      .single();

    if (genError) throw genError;

    // 8. Prepare and save schedule records
    const scheduleRecords = [];
    for (const staffId of Object.keys(result.assignments)) {
      for (const dateStr of Object.keys(result.assignments[staffId])) {
        const shiftIds = result.assignments[staffId][dateStr] || [];
        for (const shiftId of shiftIds) {
          scheduleRecords.push({
            staff_id: staffId,
            store_id: storeId,
            shift_template_id: shiftId,
            scheduled_date: dateStr,
            generation_id: generationData.id,
          });
        }
      }
    }

    // 9. Delete existing schedules for this week (if any)
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    await supabase
      .from('staff_schedules')
      .delete()
      .eq('store_id', storeId)
      .gte('scheduled_date', weekStartDate)
      .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

    // 10. Insert new schedules
    if (scheduleRecords.length > 0) {
      const { error: schedError } = await supabase
        .from('staff_schedules')
        .insert(scheduleRecords);

      if (schedError) throw schedError;
    }

    // 11. Record the trigger to prevent re-triggering for this week
    const { error: triggerInsertError } = await supabase
      .from('auto_schedule_triggers')
      .insert({
        store_id: storeId,
        week_start_date: weekStartDate,
        generation_id: generationData.id,
      });

    if (triggerInsertError) {
      console.error('Failed to record trigger (non-critical):', triggerInsertError);
      // Don't fail the entire operation if trigger recording fails
    }

    console.log('Auto-generation complete:', {
      generationId: generationData.id,
      schedules: scheduleRecords.length,
      warnings: result.warnings.length,
    });

    return {
      success: true,
      message: `Đã tự động tạo lịch: ${result.stats.totalShiftsFilled}/${result.stats.totalShiftsRequired} ca`,
      generationId: generationData.id,
      warnings: result.warnings,
    };

  } catch (error) {
    console.error('Error in auto-generate schedule:', error);
    return {
      success: false,
      message: `Lỗi khi tạo lịch tự động: ${(error as Error).message}`,
    };
  }
}
