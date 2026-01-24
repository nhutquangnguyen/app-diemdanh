import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const {
      checkInId,
      scheduleId,
      staffId,
      storeId,
      shiftTemplateId,
      checkInTime,
      checkOutTime,
      reason,
      userId
    } = await request.json();

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Case 1: Creating new check-in for absent day
    if (!checkInId && scheduleId && staffId && storeId && shiftTemplateId) {
      if (!checkInTime) {
        return NextResponse.json(
          { error: 'Check-in time is required for new check-ins' },
          { status: 400 }
        );
      }

      // Verify ownership (user owns the store)
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('owner_id')
        .eq('id', storeId)
        .single();

      if (!store || store.owner_id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Create new check-in record with default values
      const { data: newCheckIn, error: createError } = await supabaseAdmin
        .from('check_ins')
        .insert({
          staff_id: staffId,
          store_id: storeId,
          check_in_time: checkInTime,
          check_out_time: checkOutTime || null,
          latitude: 0, // Default latitude (owner-added)
          longitude: 0, // Default longitude (owner-added)
          distance_meters: 0, // Default distance (owner-added)
          check_out_latitude: checkOutTime ? 0 : null,
          check_out_longitude: checkOutTime ? 0 : null,
          check_out_distance_meters: checkOutTime ? 0 : null,
          selfie_url: '', // No selfie for owner-added check-ins
          status: 'success', // Default to success
          notes: `Thêm bởi chủ cửa hàng: ${reason}`,
          is_edited: true,
          edit_reason: reason,
          edited_by: userId,
          edited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Create check-in error:', createError);
        return NextResponse.json(
          { error: 'Failed to create check-in' },
          { status: 500 }
        );
      }

      // Create audit trail for new check-in
      await supabaseAdmin
        .from('check_in_edits')
        .insert({
          check_in_id: newCheckIn.id,
          field_changed: 'both',
          old_check_in_time: null,
          new_check_in_time: checkInTime,
          old_check_out_time: null,
          new_check_out_time: checkOutTime,
          reason: `Tạo mới: ${reason}`,
          edited_by: userId,
        });

      return NextResponse.json({
        success: true,
        data: newCheckIn,
      });
    }

    // Case 2: Editing existing check-in
    if (!checkInId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current check-in record
    const { data: currentCheckIn, error: fetchError } = await supabaseAdmin
      .from('check_ins')
      .select('*')
      .eq('id', checkInId)
      .single();

    if (fetchError || !currentCheckIn) {
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      );
    }

    // Verify ownership (user owns the store)
    const { data: store } = await supabaseAdmin
      .from('stores')
      .select('owner_id')
      .eq('id', currentCheckIn.store_id)
      .single();

    if (!store || store.owner_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Create audit trail record
    const { error: auditError } = await supabaseAdmin
      .from('check_in_edits')
      .insert({
        check_in_id: checkInId,
        field_changed: checkInTime && checkOutTime ? 'both' : checkInTime ? 'check_in_time' : 'check_out_time',
        old_check_in_time: currentCheckIn.check_in_time,
        new_check_in_time: checkInTime || currentCheckIn.check_in_time,
        old_check_out_time: currentCheckIn.check_out_time,
        new_check_out_time: checkOutTime || currentCheckIn.check_out_time,
        reason,
        edited_by: userId,
      });

    if (auditError) {
      console.error('Audit trail error:', auditError);
      return NextResponse.json(
        { error: 'Failed to create audit trail' },
        { status: 500 }
      );
    }

    // Update check-in record
    const updateData: any = {
      is_edited: true,
      edit_reason: reason,
      edited_by: userId,
      edited_at: new Date().toISOString(),
    };

    if (checkInTime) {
      updateData.check_in_time = checkInTime;
    }

    if (checkOutTime) {
      updateData.check_out_time = checkOutTime;
    }

    const { data: updatedCheckIn, error: updateError } = await supabaseAdmin
      .from('check_ins')
      .update(updateData)
      .eq('id', checkInId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update check-in' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCheckIn,
    });
  } catch (error: any) {
    console.error('Check-in edit error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
