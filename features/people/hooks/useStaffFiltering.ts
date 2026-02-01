import { useMemo } from 'react';
import { Staff, CheckIn, StaffFilter } from '@/types';

export function useStaffFiltering(
  staff: Staff[],
  todayCheckIns: CheckIn[],
  staffFilter: StaffFilter,
  staffSearch: string
) {
  // Calculate filter counts
  const currentlyWorking = useMemo(
    () => todayCheckIns.filter((c) => !c.check_out_time),
    [todayCheckIns]
  );

  const notCheckedIn = useMemo(() => {
    const staffWithCheckIns = new Set(todayCheckIns.map((c) => c.staff_id));
    return staff.filter((s) => !staffWithCheckIns.has(s.id)).length;
  }, [staff, todayCheckIns]);

  const lateCount = useMemo(
    () => todayCheckIns.filter((c: CheckIn) => c.status === 'late').length,
    [todayCheckIns]
  );

  // Filter staff based on search and filter
  const filteredStaff = useMemo(() => {
    return staff.filter((s: Staff) => {
      // Filter by search first
      if (staffSearch && !s.full_name?.toLowerCase().includes(staffSearch.toLowerCase())) {
        return false;
      }

      // Get staff's check-ins
      const staffCheckIns = todayCheckIns.filter((c: CheckIn) => c.staff_id === s.id);

      // Apply status filter
      if (staffFilter === 'not_checked') {
        return staffCheckIns.length === 0;
      } else if (staffFilter === 'working') {
        return staffCheckIns.some((c) => c.status === 'success' && !c.check_out_time);
      } else if (staffFilter === 'late') {
        return staffCheckIns.some((c) => c.status === 'late' && !c.check_out_time);
      }

      return true; // 'all'
    });
  }, [staff, todayCheckIns, staffFilter, staffSearch]);

  return {
    currentlyWorking,
    notCheckedIn,
    lateCount,
    filteredStaff,
  };
}
