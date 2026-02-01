import { useQuery } from '@tanstack/react-query';
import type { Store, Staff, ShiftTemplate, StaffSchedule, CheckIn } from '@/types';

interface DashboardData {
  store: Store;
  staff: Staff[];
  shifts: ShiftTemplate[];
  schedules: StaffSchedule[];
  checkIns: CheckIn[];
  meta: {
    fetchedAt: string;
    date: string;
    storeId: string;
  };
}

/**
 * Batch fetch all dashboard data in a single API call
 * Reduces 4-5 separate requests into 1 request
 *
 * @param storeId - Store ID
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 */
export function useDashboardData(storeId: string, date?: string) {
  const dateParam = date || new Date().toISOString().split('T')[0];

  return useQuery<DashboardData>({
    queryKey: ['dashboard-data', storeId, dateParam],
    queryFn: async () => {
      const response = await fetch(
        `/api/dashboard-data?storeId=${storeId}&date=${dateParam}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch dashboard data');
      }

      return response.json();
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 2, // 2 minutes (fairly current data)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
