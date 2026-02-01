import { useMutation } from '@tanstack/react-query';
import { getCurrentUserSync } from '@/lib/auth';
import type {
  SmartScheduleShift,
  SmartScheduleAvailability,
  SmartScheduleResult,
} from '@/types';

interface GenerateScheduleParams {
  storeId: string;
  shifts: SmartScheduleShift[];
  availability: SmartScheduleAvailability;
  staffList: string[];
  allowMultipleShiftsPerDay?: boolean;
}

export function useSmartSchedule() {
  return useMutation({
    mutationFn: async ({
      storeId,
      shifts,
      availability,
      staffList,
      allowMultipleShiftsPerDay = true,
    }: GenerateScheduleParams): Promise<SmartScheduleResult> => {
      const user = getCurrentUserSync();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 [useSmartSchedule] Calling API...');

      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          shifts,
          availability,
          staffList,
          allowMultipleShiftsPerDay,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate schedule');
      }

      const result = await response.json();
      console.log('✅ [useSmartSchedule] API call successful');
      return result.data;
    },
  });
}
