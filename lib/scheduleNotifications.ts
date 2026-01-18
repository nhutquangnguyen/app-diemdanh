import { supabase } from '@/lib/supabase';

/**
 * Checks if there are any schedule generations that need review for a given store
 */
export async function checkScheduleNeedsReview(storeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('schedule_generations')
      .select('id')
      .eq('store_id', storeId)
      .eq('needs_review', true)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking schedule needs review:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkScheduleNeedsReview:', error);
    return false;
  }
}
