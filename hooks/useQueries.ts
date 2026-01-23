import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Store, Staff, CheckIn, ShiftTemplate, StaffSchedule, SalaryAdjustment } from '@/types';

// Query keys factory
export const queryKeys = {
  stores: (ownerId?: string) => ['stores', ownerId] as const,
  store: (storeId: string) => ['store', storeId] as const,
  staff: (storeId: string) => ['staff', storeId] as const,
  staffByEmail: (email: string) => ['staff', 'email', email] as const,
  checkIns: (params: { storeId?: string; staffId?: string; date?: string }) =>
    ['checkIns', params] as const,
  shifts: (storeId: string) => ['shifts', storeId] as const,
  schedules: (storeId: string, startDate?: string, endDate?: string) =>
    ['schedules', storeId, startDate, endDate] as const,
  salaryAdjustments: (storeId: string, month: string) =>
    ['salaryAdjustments', storeId, month] as const,
};

// Stores queries
export function useStores(ownerId?: string) {
  return useQuery({
    queryKey: queryKeys.stores(ownerId),
    queryFn: async () => {
      let query = supabase.from('stores').select('*').order('name');

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Store[];
    },
    enabled: !!ownerId,
  });
}

export function useStore(storeId: string) {
  return useQuery({
    queryKey: queryKeys.store(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      return data as Store;
    },
    enabled: !!storeId,
  });
}

// Staff queries
export function useStaff(storeId: string) {
  return useQuery({
    queryKey: queryKeys.staff(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('store_id', storeId)
        .order('name');

      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!storeId,
  });
}

export function useStaffByEmail(email: string) {
  return useQuery({
    queryKey: queryKeys.staffByEmail(email),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('email', email);

      if (error) throw error;
      return data as Staff[];
    },
    enabled: !!email,
  });
}

// Check-ins queries
export function useCheckIns(params: {
  storeId?: string;
  staffId?: string;
  date?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.checkIns(params),
    queryFn: async () => {
      let query = supabase
        .from('check_ins')
        .select('*')
        .order('check_in_time', { ascending: false });

      if (params.storeId) {
        query = query.eq('store_id', params.storeId);
      }

      if (params.staffId) {
        query = query.eq('staff_id', params.staffId);
      }

      if (params.date) {
        const startDate = new Date(params.date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(params.date);
        endDate.setHours(23, 59, 59, 999);

        query = query
          .gte('check_in_time', startDate.toISOString())
          .lte('check_in_time', endDate.toISOString());
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CheckIn[];
    },
    enabled: !!(params.storeId || params.staffId),
  });
}

// Shifts queries
export function useShifts(storeId: string) {
  return useQuery({
    queryKey: queryKeys.shifts(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('store_id', storeId)
        .order('start_time');

      if (error) throw error;
      return data as ShiftTemplate[];
    },
    enabled: !!storeId,
  });
}

// Schedules queries
export function useSchedules(storeId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.schedules(storeId, startDate, endDate),
    queryFn: async () => {
      let query = supabase
        .from('staff_schedules')
        .select('*')
        .eq('store_id', storeId)
        .order('date');

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StaffSchedule[];
    },
    enabled: !!storeId,
  });
}

// Salary adjustments queries
export function useSalaryAdjustments(storeId: string, month: string) {
  return useQuery({
    queryKey: queryKeys.salaryAdjustments(storeId, month),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_adjustments')
        .select('*')
        .eq('store_id', storeId)
        .eq('month', month);

      if (error) throw error;
      return data as SalaryAdjustment[];
    },
    enabled: !!(storeId && month),
  });
}
