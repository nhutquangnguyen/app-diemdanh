import { Staff, CheckIn, StaffFilter } from '@/types';

interface StaffAttendanceTableProps {
  staff: Staff[];
  todayCheckIns: CheckIn[];
  staffFilter: StaffFilter;
  staffSearch: string;
  expandedStaff: Set<string>;
  toggleStaffExpand: (staffId: string) => void;
}

export default function StaffAttendanceTable({
  staff,
  todayCheckIns,
  staffFilter,
  staffSearch,
  expandedStaff,
  toggleStaffExpand,
}: StaffAttendanceTableProps) {
  return (
    <div className="space-y-3">
      {staff
        .filter((s: Staff) => {
          // Filter by search first
          if (!staffSearch) return true;
          return s.full_name.toLowerCase().includes(staffSearch.toLowerCase());
        })
        .map((s: Staff) => {
          // Get ALL check-ins for this staff today and sort by check_in_time ascending (earliest first)
          const staffCheckIns = todayCheckIns
            .filter((c: CheckIn) => c.staff_id === s.id)
            .sort((a, b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime());

          // Apply status filter
          const filteredCheckIns = staffCheckIns.filter((checkIn: CheckIn) => {
            if (staffFilter === 'working') {
              return checkIn.status === 'success' && !checkIn.check_out_time;
            } else if (staffFilter === 'late') {
              return checkIn.status === 'late' && !checkIn.check_out_time;
            } else if (staffFilter === 'not_checked') {
              return false; // Will handle "not checked" separately
            }
            return true; // 'all'
          });

          const initials = s.full_name
            ?.split(' ')
            .slice(-2)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase() || '??';

          // If no check-ins and filter is 'not_checked' or 'all', show the staff
          if (staffCheckIns.length === 0 && (staffFilter === 'not_checked' || staffFilter === 'all')) {
            return (
              <div key={`${s.id}-no-checkin`} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-gray-400 to-gray-500 flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800">{s.full_name}</div>
                    <div className="text-xs text-gray-500 break-all">{s.email}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    Chưa điểm danh
                  </span>
                </div>
              </div>
            );
          }

          if (filteredCheckIns.length === 0) return null;

          const isExpanded = expandedStaff.has(s.id);
          const hasMultipleShifts = filteredCheckIns.length > 1;

          // Get latest check-in to show in main card
          const latestCheckIn = filteredCheckIns[filteredCheckIns.length - 1];
          const hasCheckedOut = latestCheckIn.check_out_time;
          const endTime = hasCheckedOut && latestCheckIn.check_out_time
            ? new Date(latestCheckIn.check_out_time).getTime()
            : Date.now();
          const minutes = Math.floor((endTime - new Date(latestCheckIn.check_in_time).getTime()) / 1000 / 60);
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;

          const isWorking = latestCheckIn.status === 'success' && !latestCheckIn.check_out_time;
          const isLate = latestCheckIn.status === 'late';

          const checkInTime = new Date(latestCheckIn.check_in_time).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          });
          const checkOutTime = hasCheckedOut && latestCheckIn.check_out_time ?
            new Date(latestCheckIn.check_out_time).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            }) : null;

          return (
            <div key={s.id}>
              {/* Main Card */}
              <div
                className={`bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm ${hasMultipleShifts ? 'cursor-pointer' : ''}`}
                onClick={hasMultipleShifts ? () => toggleStaffExpand(s.id) : undefined}
              >
                {/* Header with staff info and status */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      isWorking ? 'bg-gradient-to-br from-green-500 to-green-600' :
                      isLate ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                      'bg-gradient-to-br from-gray-400 to-gray-500'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-800">{s.full_name}</span>
                        {hasMultipleShifts && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                            Ca {filteredCheckIns.length}
                            <svg
                              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 break-all mb-2">{s.email}</div>
                      <div>
                        {hasCheckedOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            ✓ Đã về
                          </span>
                        ) : isWorking ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Đang làm
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                            ⚠ Muộn
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check-in/out details */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Check-in time */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Giờ vào</div>
                      <div className="text-lg font-bold text-gray-900">{checkInTime}</div>
                    </div>

                    {/* Check-out time */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Giờ ra</div>
                      <div className="text-lg font-bold text-gray-900">
                        {checkOutTime || <span className="text-gray-400">--:--</span>}
                      </div>
                    </div>
                  </div>

                  {/* Work duration */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Thời gian làm:</span>
                      <span className="text-lg font-semibold text-green-600">{hours}h {mins}m</span>
                    </div>
                  </div>

                  {/* Selfie if available */}
                  {(latestCheckIn.selfie_url || latestCheckIn.checkout_selfie_url) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-4">
                        {latestCheckIn.selfie_url && (
                          <div>
                            <div className="text-xs text-gray-500 mb-2">Ảnh vào</div>
                            <img
                              src={latestCheckIn.selfie_url}
                              alt="Check-in selfie"
                              className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                            />
                          </div>
                        )}
                        {latestCheckIn.checkout_selfie_url && (
                          <div>
                            <div className="text-xs text-gray-500 mb-2">Ảnh ra</div>
                            <img
                              src={latestCheckIn.checkout_selfie_url}
                              alt="Check-out selfie"
                              className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded shifts (if multiple) */}
              {isExpanded && hasMultipleShifts && (
                <div className="ml-4 mt-2 space-y-2">
                  {filteredCheckIns.map((checkIn, index) => {
                    const shiftHasCheckedOut = !!checkIn.check_out_time;
                    const shiftEndTime = shiftHasCheckedOut && checkIn.check_out_time
                      ? new Date(checkIn.check_out_time).getTime()
                      : Date.now();
                    const shiftMinutes = Math.floor((shiftEndTime - new Date(checkIn.check_in_time).getTime()) / 1000 / 60);
                    const shiftHours = Math.floor(shiftMinutes / 60);
                    const shiftMins = shiftMinutes % 60;

                    const shiftCheckInTime = new Date(checkIn.check_in_time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const shiftCheckOutTime = shiftHasCheckedOut && checkIn.check_out_time ?
                      new Date(checkIn.check_out_time).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : null;

                    return (
                      <div key={checkIn.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                        <div className="text-xs font-semibold text-gray-600 mb-3">Ca {index + 1}</div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Giờ vào</div>
                            <div className="text-base font-semibold text-gray-900">{shiftCheckInTime}</div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 mb-1">Giờ ra</div>
                            <div className="text-base font-semibold text-gray-900">
                              {shiftCheckOutTime || <span className="text-gray-400">--:--</span>}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Thời gian làm:</span>
                            <span className="text-sm font-semibold text-green-600">{shiftHours}h {shiftMins}m</span>
                          </div>
                        </div>

                        {(checkIn.selfie_url || checkIn.checkout_selfie_url) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex gap-3">
                              {checkIn.selfie_url && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-2">Ảnh vào</div>
                                  <img
                                    src={checkIn.selfie_url}
                                    alt="Check-in selfie"
                                    className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                  />
                                </div>
                              )}
                              {checkIn.checkout_selfie_url && (
                                <div>
                                  <div className="text-xs text-gray-500 mb-2">Ảnh ra</div>
                                  <img
                                    src={checkIn.checkout_selfie_url}
                                    alt="Check-out selfie"
                                    className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
