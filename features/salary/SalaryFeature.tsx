'use client';

import { useState, useEffect } from 'react';
import { FeatureProps } from '@/core/types/feature';
import StoreSalary from '@/components/StoreSalary';
import StaffSalaryDetail from '@/components/salary/StaffSalaryDetail';
import AdjustmentForm from '@/components/salary/AdjustmentForm';
import { supabase } from '@/lib/supabase';
import { StaffSalaryCalculation, SalaryConfirmation, Store, SalaryAdjustment } from '@/types';
import { calculateStaffMonthlySalary, getCurrentMonth } from '@/lib/salaryCalculations';

export default function SalaryFeature({ workspaceId, config, adapter }: FeatureProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [salaryCalculations, setSalaryCalculations] = useState<StaffSalaryCalculation[]>([]);
  const [salaryConfirmations, setSalaryConfirmations] = useState<SalaryConfirmation[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<SalaryAdjustment | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);

  // Get table names from adapter
  const staffTable = adapter?.tables?.people || 'staff';
  const checkInsTable = adapter?.tables?.checkIns || 'check_ins';
  const confirmationsTable = adapter?.tables?.confirmations || 'salary_confirmations';
  const schedulesTable = adapter?.tables?.schedules || 'staff_schedules';
  const shiftsTable = adapter?.tables?.shifts || 'shift_templates';
  const workspaceIdField = adapter?.fields?.workspaceId || 'store_id';

  useEffect(() => {
    loadData();
  }, [workspaceId, selectedMonth]);

  async function loadData() {
    try {
      setLoading(true);

      // Load store/workspace info
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (storeError) throw storeError;
      setStore(storeData);

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from(staffTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null);

      if (staffError) throw staffError;

      // Load shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from(shiftsTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .is('deleted_at', null);

      if (shiftsError) throw shiftsError;

      // Load schedules for the selected month
      const [year, month] = selectedMonth.split('-');
      const monthStart = `${year}-${month}-01`;
      const monthEnd = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

      const { data: schedulesData, error: schedulesError } = await supabase
        .from(schedulesTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);

      if (schedulesError) throw schedulesError;

      // Load check-ins for the selected month
      const { data: checkInsData, error: checkInsError } = await supabase
        .from(checkInsTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .gte('check_in_time', `${monthStart}T00:00:00`)
        .lte('check_in_time', `${monthEnd}T23:59:59`);

      if (checkInsError) throw checkInsError;

      // Load salary confirmations
      const { data: confirmationsData, error: confirmationsError } = await supabase
        .from(confirmationsTable)
        .select('*')
        .eq(workspaceIdField, workspaceId)
        .eq('month', selectedMonth);

      if (confirmationsError) throw confirmationsError;

      // Calculate salaries for each staff member
      const calculations: StaffSalaryCalculation[] = (staffData || []).map(staff => {
        const staffSchedules = (schedulesData || []).filter(s => s.staff_id === staff.id);
        const staffCheckIns = (checkInsData || []).filter(ci => ci.staff_id === staff.id);

        return calculateStaffMonthlySalary(
          staff,
          storeData,
          selectedMonth,
          staffSchedules,
          shiftsData || [],
          staffCheckIns,
          [] // adjustments - can be loaded separately if needed
        );
      });

      setSalaryCalculations(calculations);
      setSalaryConfirmations(confirmationsData || []);

    } catch (error) {
      console.error('Error loading salary data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePaymentStatus(staffId: string, currentStatus: 'paid' | 'unpaid') {
    try {
      const newStatus = currentStatus === 'paid' ? 'draft' : 'paid';

      // Check if confirmation exists
      const existing = salaryConfirmations.find(
        c => c.staff_id === staffId && c.month === selectedMonth
      );

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from(confirmationsTable)
          .update({
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : null
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new - need to calculate salary amounts first
        const staffCalc = salaryCalculations.find(c => c.staff.id === staffId);
        if (!staffCalc) return;

        const { error } = await supabase
          .from(confirmationsTable)
          .insert({
            [workspaceIdField]: workspaceId,
            staff_id: staffId,
            month: selectedMonth,
            provisional_amount: staffCalc.provisional.total,
            adjustments_amount: staffCalc.adjustments.total,
            final_amount: staffCalc.final_amount,
            status: newStatus,
            paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          });

        if (error) throw error;
      }

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error toggling payment status:', error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái thanh toán');
    }
  }

  function handleViewStaffDetail(staffId: string) {
    setSelectedStaffId(staffId);
  }

  async function handleAddAdjustment(staffId: string, data: {
    type: string;
    amount: number;
    date: string;
    note: string;
  }) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const { error } = await supabase
        .from('salary_adjustments')
        .insert({
          staff_id: staffId,
          [workspaceIdField]: workspaceId,
          adjustment_date: data.date,
          type: data.type === 'increase' ? 'bonus' : 'deduction',
          amount: data.amount,
          calculation_base: 'fixed',
          note: data.note,
          created_by: user.id,
        });

      if (error) throw error;

      // Reload salary data
      await loadData();
    } catch (error) {
      console.error('Error adding adjustment:', error);
      alert('Có lỗi xảy ra khi thêm điều chỉnh');
    }
  }

  async function handleEditAdjustment(adjustmentId: string, data: {
    type: string;
    amount: number;
    date: string;
    note: string;
  }) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return;
      }

      const { error } = await supabase
        .from('salary_adjustments')
        .update({
          adjustment_date: data.date,
          type: data.type === 'increase' ? 'bonus' : 'deduction',
          amount: data.amount,
          note: data.note,
          modified_by: user.id,
          modified_at: new Date().toISOString(),
        })
        .eq('id', adjustmentId);

      if (error) throw error;

      // Reload salary data
      await loadData();
    } catch (error) {
      console.error('Error editing adjustment:', error);
      alert('Có lỗi xảy ra khi sửa điều chỉnh');
    }
  }

  async function handleDeleteAdjustment(adjustmentId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa điều chỉnh này?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('salary_adjustments')
        .delete()
        .eq('id', adjustmentId);

      if (error) throw error;

      // Reload salary data
      await loadData();
    } catch (error) {
      console.error('Error deleting adjustment:', error);
      alert('Có lỗi xảy ra khi xóa điều chỉnh');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="p-4 text-center text-gray-600">
        Không tìm thấy thông tin workspace
      </div>
    );
  }

  // Get selected staff calculation
  const selectedCalculation = selectedStaffId
    ? salaryCalculations.find(c => c.staff.id === selectedStaffId)
    : null;

  const selectedConfirmation = selectedStaffId
    ? salaryConfirmations.find(c => c.staff_id === selectedStaffId)
    : null;

  return (
    <>
      <StoreSalary
        store={store}
        salaryCalculations={salaryCalculations}
        confirmations={salaryConfirmations}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onViewStaffDetail={handleViewStaffDetail}
        onTogglePaymentStatus={handleTogglePaymentStatus}
      />

      {/* Staff Detail Modal */}
      {selectedCalculation && (
        <StaffSalaryDetail
          calculation={selectedCalculation}
          storeName={store.name}
          onClose={() => setSelectedStaffId(null)}
          onAddAdjustment={() => {
            setEditingAdjustment(null);
            setShowAdjustmentForm(true);
          }}
          onEditAdjustment={(adjustment) => {
            setEditingAdjustment(adjustment);
            setShowAdjustmentForm(true);
          }}
          onDeleteAdjustment={(adjustmentId) => {
            handleDeleteAdjustment(adjustmentId);
          }}
          onTogglePaymentStatus={() => {
            if (selectedStaffId) {
              handleTogglePaymentStatus(selectedStaffId, selectedConfirmation?.status === 'paid' ? 'paid' : 'unpaid');
            }
          }}
          isPaid={selectedConfirmation?.status === 'paid'}
          onRefresh={loadData}
        />
      )}

      {/* Adjustment Form Modal */}
      {showAdjustmentForm && selectedCalculation && (
        <AdjustmentForm
          staffName={selectedCalculation.staff.display_name}
          month={selectedMonth}
          editingAdjustment={editingAdjustment}
          onSave={async (data) => {
            if (editingAdjustment) {
              await handleEditAdjustment(editingAdjustment.id, data);
            } else if (selectedStaffId) {
              await handleAddAdjustment(selectedStaffId, data);
            }
            setShowAdjustmentForm(false);
            setEditingAdjustment(null);
          }}
          onCancel={() => {
            setShowAdjustmentForm(false);
            setEditingAdjustment(null);
          }}
        />
      )}
    </>
  );
}
