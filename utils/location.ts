/**
 * Tính khoảng cách giữa hai điểm GPS theo công thức Haversine
 * @param lat1 Vĩ độ điểm 1
 * @param lon1 Kinh độ điểm 1
 * @param lat2 Vĩ độ điểm 2
 * @param lon2 Kinh độ điểm 2
 * @returns Khoảng cách tính bằng mét
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Bán kính Trái Đất tính bằng mét
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Khoảng cách tính bằng mét
}

/**
 * Kiểm tra xem vị trí hiện tại có nằm trong bán kính cho phép không
 * @param currentLat Vĩ độ hiện tại
 * @param currentLon Kinh độ hiện tại
 * @param storeLat Vĩ độ cửa hàng
 * @param storeLon Kinh độ cửa hàng
 * @param radiusMeters Bán kính cho phép (mét)
 * @returns true nếu trong bán kính, false nếu ngoài bán kính
 */
export function isWithinRadius(
  currentLat: number,
  currentLon: number,
  storeLat: number,
  storeLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, storeLat, storeLon);
  return distance <= radiusMeters;
}

/**
 * Lấy vị trí hiện tại của người dùng
 * @returns Promise với {latitude, longitude} hoặc null nếu lỗi
 */
export function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
