import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

interface ScheduleWarning {
  type: 'understaffed' | 'overstaffed' | 'no_shifts' | 'overwork';
  severity: 'critical' | 'warning' | 'info';
  shift?: {
    date: string;
    shiftTemplateId: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    duration: number;
    required: number;
    dayOfWeek: number;
  };
  staffId?: string;
  assigned?: number;
  required?: number;
  message: string;
}

interface ScheduleWarningsProps {
  storeId: string;
  weekStartDate: string; // YYYY-MM-DD format
}

export default function ScheduleWarnings({ storeId, weekStartDate }: ScheduleWarningsProps) {
  const toast = useToast();
  const [warnings, setWarnings] = useState<ScheduleWarning[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [needsReview, setNeedsReview] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resolvedWarnings, setResolvedWarnings] = useState<number[]>([]);
  const [resolving, setResolving] = useState<number | null>(null);

  useEffect(() => {
    loadWarnings();
  }, [storeId, weekStartDate]);

  async function loadWarnings() {
    try {
      setLoading(true);

      // Get the latest generation for this week
      const { data, error } = await supabase
        .from('schedule_generations')
        .select('*')
        .eq('store_id', storeId)
        .eq('week_start_date', weekStartDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No generation found - this is normal if schedule wasn't AI-generated
        setWarnings([]);
        setStats(null);
        setNeedsReview(false);
        setGenerationId(null);
        return;
      }

      if (data) {
        setWarnings(data.warnings || []);
        setStats(data.stats || null);
        setNeedsReview(data.needs_review || false);
        setGenerationId(data.id);
        setResolvedWarnings(data.resolved_warnings || []);

        // Mark as viewed if this was auto-generated and hasn't been viewed yet
        if (data.is_auto_generated && !data.has_been_viewed) {
          await supabase
            .from('schedule_generations')
            .update({
              has_been_viewed: true,
              viewed_at: new Date().toISOString(),
              needs_review: false, // Remove red badge once viewed
            })
            .eq('id', data.id);

          setNeedsReview(false);
        }
      }

    } catch (error) {
      console.error('Error loading schedule warnings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveAll() {
    if (!generationId) {
      toast.error('Không tìm thấy ID lịch tạo');
      return;
    }

    try {
      setResolving(0); // Use 0 to indicate "all" is resolving

      // Mark all warnings as resolved
      const allWarningIndices = warnings.map((_, idx) => idx);

      const { data, error } = await supabase
        .from('schedule_generations')
        .update({
          resolved_warnings: allWarningIndices,
        })
        .eq('id', generationId)
        .select();

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error, null, 2));
        toast.error(`Lỗi: ${error.message || 'Không thể cập nhật'}`);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No data returned from update');
        toast.error('Không tìm thấy bản ghi để cập nhật');
        return;
      }

      console.log('Successfully updated:', data);
      toast.success('Đã ẩn tất cả cảnh báo');

      // Update local state
      setResolvedWarnings(allWarningIndices);

    } catch (error: any) {
      console.error('Error resolving warnings:', error);
      if (error?.message) {
        console.error('Error message:', error.message);
      }
      // Don't show toast again if already shown above
      if (!error?.message) {
        toast.error('Có lỗi xảy ra khi ẩn cảnh báo');
      }
    } finally {
      setResolving(null);
    }
  }

  // Don't show anything if there are no warnings
  if (loading || !warnings || warnings.length === 0) {
    return null;
  }

  // Filter out resolved warnings
  const activeWarnings = warnings.filter((_, idx) => !resolvedWarnings.includes(idx));

  // Don't show if all warnings are resolved
  if (activeWarnings.length === 0) {
    return null;
  }

  // Group active warnings by severity (with original indices)
  const criticalWarnings = warnings
    .map((w, idx) => ({ warning: w, index: idx }))
    .filter(({ warning, index }) => warning.severity === 'critical' && !resolvedWarnings.includes(index));
  const warningWarnings = warnings
    .map((w, idx) => ({ warning: w, index: idx }))
    .filter(({ warning, index }) => warning.severity === 'warning' && !resolvedWarnings.includes(index));
  const infoWarnings = warnings
    .map((w, idx) => ({ warning: w, index: idx }))
    .filter(({ warning, index }) => warning.severity === 'info' && !resolvedWarnings.includes(index));

  return (
    <div className="mb-4 mt-4">
      {/* Warning Card Header */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl overflow-hidden shadow-md">
        <div className="w-full p-3">
          {/* Title and Icon */}
          <div className="flex items-start gap-2 mb-3">
            <div className="text-xl sm:text-2xl flex-shrink-0">⚠️</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-orange-800 text-base sm:text-lg">
                Cảnh báo lịch tự động ({activeWarnings.length})
              </div>
              <div className="text-xs sm:text-sm text-orange-700 break-words">
                {criticalWarnings.length > 0 && `${criticalWarnings.length} cảnh báo`}
                {warningWarnings.length > 0 && criticalWarnings.length > 0 && ', '}
                {warningWarnings.length > 0 && `${warningWarnings.length} cảnh báo`}
                {infoWarnings.length > 0 && (criticalWarnings.length > 0 || warningWarnings.length > 0) && ', '}
                {infoWarnings.length > 0 && `${infoWarnings.length} thông tin`}
                {resolvedWarnings.length > 0 && (
                  <span className="block sm:inline sm:ml-2 text-green-700 mt-1 sm:mt-0">
                    • {resolvedWarnings.length} đã giải quyết
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Dismiss All Button */}
            <button
              onClick={handleResolveAll}
              disabled={resolving === 0}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-sm"
            >
              {resolving === 0 ? 'Đang ẩn...' : '✓ Đã hiểu, ẩn cảnh báo'}
            </button>

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-2 bg-orange-200 hover:bg-orange-300 rounded-lg transition-all"
            >
              <svg
                className={`w-4 h-4 sm:w-5 sm:h-5 text-orange-700 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Warning Content (Collapsible) */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {/* Statistics Summary */}
            {stats && (
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="text-sm font-semibold text-gray-700 mb-2">Thống kê lịch:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-gray-600">Độ phủ</div>
                    <div className="font-bold text-blue-600">{stats.coveragePercent || 0}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Công bằng</div>
                    <div className="font-bold text-green-600">{stats.fairnessScore || 0}/100</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Ca đã xếp</div>
                    <div className="font-bold text-purple-600">
                      {stats.totalShiftsFilled || 0}/{stats.totalShiftsRequired || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Giờ TB</div>
                    <div className="font-bold text-gray-700">{stats.avgHoursPerStaff || 0}h</div>
                  </div>
                </div>
              </div>
            )}

            {/* Critical Warnings */}
            {criticalWarnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-red-700 uppercase">Nghiêm trọng</div>
                {criticalWarnings.map(({ warning, index }) => (
                  <div
                    key={index}
                    className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 font-bold text-lg">•</span>
                      <div className="flex-1">
                        <div className="text-red-800 font-semibold">{warning.message}</div>
                        {warning.shift && (
                          <div className="text-xs text-red-700 mt-1 space-y-0.5">
                            <div>📅 Ngày: {new Date(warning.shift.date).toLocaleDateString('vi-VN')}</div>
                            <div>🕐 Ca: {warning.shift.shiftName} ({warning.shift.startTime} - {warning.shift.endTime})</div>
                            {warning.assigned !== undefined && warning.required !== undefined && (
                              <div>👥 Đã xếp: {warning.assigned}/{warning.required} người</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warning Level Warnings */}
            {warningWarnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-orange-700 uppercase">Cảnh báo</div>
                {warningWarnings.map(({ warning, index }) => (
                  <div
                    key={index}
                    className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold text-lg">•</span>
                      <div className="flex-1">
                        <div className="text-orange-800">{warning.message}</div>
                        {warning.shift && (
                          <div className="text-xs text-orange-700 mt-1 space-y-0.5">
                            <div>📅 Ngày: {new Date(warning.shift.date).toLocaleDateString('vi-VN')}</div>
                            <div>🕐 Ca: {warning.shift.shiftName} ({warning.shift.startTime} - {warning.shift.endTime})</div>
                            {warning.assigned !== undefined && warning.required !== undefined && (
                              <div>👥 Đã xếp: {warning.assigned}/{warning.required} người</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info Warnings */}
            {infoWarnings.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-700 uppercase">Thông tin</div>
                {infoWarnings.map(({ warning, index }) => (
                  <div
                    key={index}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold text-lg">ℹ</span>
                      <div className="flex-1">
                        <div className="text-blue-800">{warning.message}</div>
                        {warning.staffId && (
                          <div className="text-xs text-blue-700 mt-1">
                            👤 Nhân viên ID: {warning.staffId.substring(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Help Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <div className="font-semibold mb-1">💡 Gợi ý:</div>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Bạn có thể chỉnh sửa trực tiếp lịch bằng cách click vào các ô</li>
                <li>Hoặc vào "Xếp lịch AI" để tạo lại với yêu cầu khác</li>
                <li>Lịch đã được tự động áp dụng và sẵn sàng sử dụng</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
