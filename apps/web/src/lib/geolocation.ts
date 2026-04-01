export class GeolocationError extends Error {
  constructor(
    message: string,
    public code: number,
    public isPermissionDenied: boolean = false,
    public isPositionUnavailable: boolean = false
  ) {
    super(message);
    this.name = 'GeolocationError';
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeolocationError('Geolocation is not supported by this browser', 0));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      reject(new GeolocationError(
        error.message,
        error.code,
        error.code === 1, // PERMISSION_DENIED
        error.code === 2  // POSITION_UNAVAILABLE
      ));
    }, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function watchPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationError) => void
): number {
  if (!navigator.geolocation) {
    onError(new GeolocationError('Geolocation is not supported', 0));
    return -1;
  }

  return navigator.geolocation.watchPosition(onSuccess, (error) => {
    onError(new GeolocationError(
      error.message,
      error.code,
      error.code === 1,
      error.code === 2
    ));
  }, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
  });
}

export function clearWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export async function getGeolocationData(): Promise<GeolocationData> {
  const position = await getCurrentPosition();
  
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed,
    heading: position.coords.heading,
    timestamp: position.timestamp,
  };
}
