export interface Store {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  qr_code: string;
  radius_meters: number; // Bán kính cho phép check-in (mét)
  gps_required: boolean; // Yêu cầu xác thực GPS
  selfie_required: boolean; // Yêu cầu chụp selfie
  access_mode: 'staff_only' | 'anyone'; // Chế độ truy cập
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  store_id: string;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  store_id: string;
  name: string;
  start_time: string; // HH:mm format
  end_time: string;   // HH:mm format
  days_of_week: number[]; // 0-6, 0 = Chủ nhật
}

export interface CheckIn {
  id: string;
  staff_id: string;
  store_id: string;
  check_in_time: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  selfie_url: string;
  status: 'success' | 'late' | 'wrong_location';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
}
