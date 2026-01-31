'use client';

import { useState } from 'react';

interface Schedule {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  [key: string]: any;
}

interface ScheduleViewProps {
  schedules: Schedule[];
  config: any;
  onRefresh: () => void;
}

const DAYS_OF_WEEK = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

export default function ScheduleView({ schedules, config, onRefresh }: ScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Group schedules by day
  const schedulesByDay = schedules.reduce((acc, schedule) => {
    const day = schedule.day_of_week;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<number, Schedule[]>);

  const scheduleLabel = config.scheduleLabel || 'Lịch';
  const itemLabel = config.itemLabel || 'Buổi';

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          {scheduleLabel}
        </h2>
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
        >
          Làm mới
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {schedules.length}
          </div>
          <div className="text-sm text-gray-600">
            Tổng số {itemLabel.toLowerCase()}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {Object.keys(schedulesByDay).length}
          </div>
          <div className="text-sm text-gray-600">
            Ngày có lịch
          </div>
        </div>
      </div>

      {/* Day Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedDay(null)}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
            selectedDay === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tất cả
        </button>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const hasSchedules = schedulesByDay[day]?.length > 0;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              disabled={!hasSchedules}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedDay === day
                  ? 'bg-blue-600 text-white'
                  : hasSchedules
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              {DAYS_OF_WEEK[day]}
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">Chưa có lịch nào</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(selectedDay !== null ? [selectedDay] : [1, 2, 3, 4, 5, 6, 0]).map((day) => {
            const daySchedules = schedulesByDay[day];
            if (!daySchedules || daySchedules.length === 0) return null;

            return (
              <div key={day} className="space-y-2">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-blue-600">📅</span>
                  {DAYS_OF_WEEK[day]}
                  <span className="text-sm font-normal text-gray-500">
                    ({daySchedules.length} {itemLabel.toLowerCase()})
                  </span>
                </h3>
                <div className="space-y-2">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800">
                            {schedule.name}
                          </h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                              </span>
                            </div>
                            {schedule.location && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                <span>{schedule.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
