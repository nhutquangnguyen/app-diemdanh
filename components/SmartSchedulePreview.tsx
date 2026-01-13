import { useState, useEffect, useRef } from 'react';
import { Staff, ShiftTemplate, SmartScheduleResult } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface SmartSchedulePreviewProps {
  schedule: SmartScheduleResult;
  staff: Staff[];
  shifts: ShiftTemplate[];
  weekDates: string[];
  storeId: string;
  weekStartStr: string;
  onClose: () => void;
  onApplied: () => void;
}

export default function SmartSchedulePreview({
  schedule,
  staff,
  shifts,
  weekDates,
  storeId,
  weekStartStr,
  onClose,
  onApplied,
}: SmartSchedulePreviewProps) {
  const toast = useToast();
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'schedule' | 'distribution'>('stats');
  const [viewMode, setViewMode] = useState<'staff-rows' | 'date-rows'>('staff-rows'); // Toggle between views
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const { assignments, warnings, stats, staffHours, staffShiftCount } = schedule;

  // Close help tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(null);
      }
    }

    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHelp]);

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Get staff member by ID
  const getStaff = (staffId: string) => staff.find(s => s.id === staffId);

  // Get shift by ID
  const getShift = (shiftId: string) => shifts.find(s => s.id === shiftId);

  // Get assignments for staff on date (returns array of shift IDs)
  const getAssignments = (staffId: string, date: string): string[] => {
    return assignments[staffId]?.[date] || [];
  };

  // Apply the generated schedule to actual schedules
  async function handleApply() {
    try {
      setApplying(true);

      // Create schedule generation record
      const { data: generationData, error: genError } = await supabase
        .from('schedule_generations')
        .insert([
          {
            store_id: storeId,
            week_start_date: weekStartStr,
            total_shifts_required: stats.totalShiftsRequired,
            total_shifts_filled: stats.totalShiftsFilled,
            coverage_percent: stats.coveragePercent,
            fairness_score: stats.fairnessScore,
            total_warnings: warnings.length,
            is_accepted: true,
            accepted_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (genError) throw genError;

      // Prepare schedule records
      const scheduleRecords = [];
      for (const staffId of Object.keys(assignments)) {
        for (const date of Object.keys(assignments[staffId])) {
          const shiftIds = assignments[staffId][date] || [];
          for (const shiftId of shiftIds) {
            scheduleRecords.push({
              staff_id: staffId,
              store_id: storeId,
              shift_template_id: shiftId,
              scheduled_date: date,
              generation_id: generationData.id,
            });
          }
        }
      }

      // Delete existing schedules for this week
      const weekEnd = new Date(weekStartStr);
      weekEnd.setDate(weekEnd.getDate() + 6);

      await supabase
        .from('staff_schedules')
        .delete()
        .eq('store_id', storeId)
        .gte('scheduled_date', weekStartStr)
        .lte('scheduled_date', weekEnd.toISOString().split('T')[0]);

      // Insert new schedules
      if (scheduleRecords.length > 0) {
        const { error: schedError } = await supabase
          .from('staff_schedules')
          .insert(scheduleRecords);

        if (schedError) throw schedError;
      }

      toast.success(`Đã áp dụng lịch! ${stats.totalShiftsFilled}/${stats.totalShiftsRequired} ca được xếp`);
      onApplied();

    } catch (error) {
      console.error('Error applying schedule:', error);
      toast.error('Lỗi khi áp dụng lịch');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 z-30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Xem Trước Lịch Tự Động</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 -mb-px">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Thống Kê
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Lịch Làm Việc
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'distribution'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Phân Bổ
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'stats' && (
          <div>

          {/* Statistics */}
          <div ref={helpRef} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 relative">
              <div className="flex items-center gap-1 mb-1">
                <div className="text-xs text-gray-600">Độ Phủ</div>
                <button
                  onClick={() => setShowHelp(showHelp === 'coverage' ? null : 'coverage')}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                  aria-label="Giải thích Độ Phủ"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {showHelp === 'coverage' && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-blue-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                  <p className="font-semibold text-blue-700 mb-1">Độ Phủ</p>
                  <p>Tỷ lệ phần trăm (%) ca làm việc được xếp thành công so với tổng số ca cần xếp. Độ phủ càng cao thì lịch càng đầy đủ.</p>
                </div>
              )}
              <div className="text-2xl font-bold text-blue-600">{stats.coveragePercent}%</div>
              <div className="text-xs text-gray-500">{stats.totalShiftsFilled}/{stats.totalShiftsRequired} ca</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 relative">
              <div className="flex items-center gap-1 mb-1">
                <div className="text-xs text-gray-600">Công Bằng</div>
                <button
                  onClick={() => setShowHelp(showHelp === 'fairness' ? null : 'fairness')}
                  className="text-green-600 hover:text-green-700 transition-colors"
                  aria-label="Giải thích Độ Công Bằng"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {showHelp === 'fairness' && (
                <div className="absolute z-50 top-full right-0 mt-1 bg-white border border-green-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                  <p className="font-semibold text-green-700 mb-1">Độ Công Bằng</p>
                  <p>Điểm đánh giá mức độ cân bằng giờ làm việc giữa các nhân viên. Điểm càng cao (gần 100) thì việc phân bổ ca càng công bằng, tránh người làm nhiều người làm ít.</p>
                </div>
              )}
              <div className="text-2xl font-bold text-green-600">{stats.fairnessScore}/100</div>
              <div className="text-xs text-gray-500">Điểm công bằng</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 relative">
              <div className="flex items-center gap-1 mb-1">
                <div className="text-xs text-gray-600">Giờ Trung Bình</div>
                <button
                  onClick={() => setShowHelp(showHelp === 'hours' ? null : 'hours')}
                  className="text-purple-600 hover:text-purple-700 transition-colors"
                  aria-label="Giải thích Giờ Trung Bình"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {showHelp === 'hours' && (
                <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-purple-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                  <p className="font-semibold text-purple-700 mb-1">Giờ Trung Bình</p>
                  <p>Số giờ làm việc trung bình mỗi nhân viên trong tuần. Khoảng nhỏ nhất - lớn nhất cho biết người làm ít nhất và nhiều nhất có bao nhiêu giờ.</p>
                </div>
              )}
              <div className="text-2xl font-bold text-purple-600">{stats.avgHoursPerStaff}h</div>
              <div className="text-xs text-gray-500">{stats.minHours}h - {stats.maxHours}h</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 relative">
              <div className="flex items-center gap-1 mb-1">
                <div className="text-xs text-gray-600">Cảnh Báo</div>
                <button
                  onClick={() => setShowHelp(showHelp === 'warnings' ? null : 'warnings')}
                  className="text-orange-600 hover:text-orange-700 transition-colors"
                  aria-label="Giải thích Cảnh Báo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              {showHelp === 'warnings' && (
                <div className="absolute z-50 top-full right-0 mt-1 bg-white border border-orange-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-48 sm:w-64 max-w-[calc(100vw-2rem)]">
                  <p className="font-semibold text-orange-700 mb-1">Cảnh Báo</p>
                  <p>Số vấn đề tiềm ẩn được phát hiện trong lịch (vd: ca thiếu người, nhân viên làm quá nhiều giờ, làm liên tục nhiều ngày). Kiểm tra chi tiết bên dưới để xem cụ thể.</p>
                </div>
              )}
              <div className="text-2xl font-bold text-orange-600">{warnings.length}</div>
              <div className="text-xs text-gray-500">Vấn đề phát hiện</div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-2 mb-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <div className="font-semibold text-yellow-800 text-sm mb-2">Cảnh báo ({warnings.length}):</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-2 py-1 rounded ${
                          warning.severity === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : warning.severity === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          )}

          {activeTab === 'schedule' && (
          <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Lịch Làm Việc:</h3>

          {/* View Toggle & Legend */}
          <div className="mb-4 space-y-3">
            {/* Toggle Button */}
            <div className="flex justify-end">
              <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
                <button
                  onClick={() => setViewMode('staff-rows')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'staff-rows'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Nhân viên theo hàng
                </button>
                <button
                  onClick={() => setViewMode('date-rows')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'date-rows'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Ngày theo hàng
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 bg-gray-50 p-3 rounded-lg">
              {shifts.map(shift => (
                <div key={shift.id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: shift.color }}
                  />
                  <span className="text-xs font-medium text-gray-700">{shift.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            {viewMode === 'staff-rows' ? (
              // Original View: Staff as Rows
              <table className="w-full border-collapse min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-2 sm:p-3 text-gray-700 font-bold text-xs sm:text-sm border-r border-gray-200 sticky left-0 bg-white z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)] w-20 sm:w-auto">
                      <div className="whitespace-nowrap">Nhân Viên</div>
                    </th>
                    {weekDates.map((date, dayIndex) => (
                      <th key={date} className="p-0.5 sm:p-2 text-center border-r border-gray-200 last:border-r-0 w-[25px] sm:w-[80px]">
                        <div className="text-[9px] sm:text-xs font-semibold text-gray-600">{dayNames[dayIndex]}</div>
                        <div className="text-[8px] sm:text-xs text-gray-500">
                          {new Date(date).getDate()}/{new Date(date).getMonth() + 1}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((staffMember, index) => (
                    <tr
                      key={staffMember.id}
                      className={`border-b border-gray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className={`p-2 sm:p-3 border-r border-gray-200 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <div className="font-semibold text-gray-800 text-xs sm:text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] sm:max-w-none" title={staffMember.name || staffMember.full_name}>
                          {(() => {
                            const name = staffMember.name || staffMember.full_name;
                            return name.length > 8 ? `${name.substring(0, 7)}...` : name;
                          })()}
                        </div>
                      </td>
                      {weekDates.map((date) => {
                        const shiftIds = getAssignments(staffMember.id, date);
                        const assignedShifts = shiftIds.map(id => getShift(id)).filter(Boolean);

                        return (
                          <td
                            key={date}
                            className="p-0 sm:p-1 border-r border-gray-200 last:border-r-0 text-center align-top w-[25px] sm:w-[80px]"
                          >
                            {assignedShifts.length > 0 ? (
                              <div className="flex flex-col gap-0.5 min-h-[30px] sm:min-h-[40px] py-1">
                                {assignedShifts.map((shift) => shift && (
                                  <div
                                    key={shift.id}
                                    className="w-full h-3 sm:h-4 rounded"
                                    style={{ backgroundColor: shift.color }}
                                    title={`${shift.name}\n${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}`}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-300 text-[10px] sm:text-xs min-h-[30px] sm:min-h-[40px] flex items-center justify-center">--</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // New View: Dates as Rows, Staff as Columns
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left p-3 text-gray-700 font-bold text-sm border-r border-gray-200 sticky left-0 bg-white z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                      Ngày
                    </th>
                    {staff.map((staffMember) => (
                      <th key={staffMember.id} className="p-3 text-center border-r border-gray-200 last:border-r-0 min-w-[120px]">
                        <div className="font-semibold text-gray-800 text-sm">
                          {staffMember.name || staffMember.full_name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekDates.map((date, dayIndex) => (
                    <tr
                      key={date}
                      className={`border-b border-gray-200 ${
                        dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className={`p-3 border-r border-gray-200 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${
                        dayIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        <div className="font-semibold text-gray-800 text-sm">
                          {dayNames[dayIndex]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(date).getDate()}/{new Date(date).getMonth() + 1}
                        </div>
                      </td>
                      {staff.map((staffMember) => {
                        const shiftIds = getAssignments(staffMember.id, date);
                        const assignedShifts = shiftIds.map(id => getShift(id)).filter(Boolean);

                        return (
                          <td
                            key={staffMember.id}
                            className="p-2 border-r border-gray-200 last:border-r-0 text-center align-middle"
                          >
                            {assignedShifts.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {assignedShifts.map((shift) => shift && (
                                  <div
                                    key={shift.id}
                                    className="px-2 py-1 rounded text-xs font-medium text-white"
                                    style={{ backgroundColor: shift.color }}
                                  >
                                    {shift.name}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-red-500 text-xs font-medium bg-red-50 py-1 px-2 rounded">
                                OFF
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </div>
          )}

          {activeTab === 'distribution' && (
          <div>
          {/* Workload Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 text-sm mb-3">Phân Bổ Công Việc:</h4>
            <div className="space-y-2">
              {staff.map((staffMember) => {
                const hours = staffHours[staffMember.id] || 0;
                const shiftCount = staffShiftCount[staffMember.id] || 0;
                const maxHours = Math.max(...Object.values(staffHours));
                const percentage = maxHours > 0 ? (hours / maxHours) * 100 : 0;

                return (
                  <div key={staffMember.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-700 truncate" title={staffMember.name || staffMember.full_name}>
                      {staffMember.name || staffMember.full_name}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${percentage}%` }}
                      >
                        {hours > 0 && (
                          <span className="text-xs font-semibold text-white">
                            {shiftCount} ca, {hours}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3 justify-end z-30">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {applying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang Áp Dụng...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Chấp Nhận & Áp Dụng
              </>
            )}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
