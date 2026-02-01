import { useQuery } from '@tanstack/react-query';
import { getCurrentUserSync } from '@/lib/auth';

interface SalaryCalculationParams {
  storeId: string;
  staffId: string;
  month: string; // Format: YYYY-MM
}

export function useSalaryCalculation({ storeId, staffId, month }: SalaryCalculationParams) {
  return useQuery({
    queryKey: ['salary-calculation', storeId, staffId, month],
    queryFn: async () => {
      const user = getCurrentUserSync();
      if (!user) throw new Error('User not authenticated');

      const response = await fetch('/api/salary/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          storeId,
          staffId,
          month,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate salary');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!(storeId && staffId && month),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
