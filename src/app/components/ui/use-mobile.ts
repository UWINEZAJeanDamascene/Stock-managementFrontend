import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Hook to detect if the current viewport is mobile-sized
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Hook to detect if the current viewport is tablet-sized
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsTablet(window.innerWidth >= MOBILE_BREAKPOINT && window.innerWidth < TABLET_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isTablet;
}

/**
 * Hook to detect if the device supports touch events
 */
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

/**
 * Hook to detect the device type
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const maxTouchPoints = navigator.maxTouchPoints || 0;
      
      if (width < MOBILE_BREAKPOINT || maxTouchPoints > 0) {
        setDeviceType('mobile');
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDevice();
    
    const mql = window.matchMedia(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", checkDevice);
    return () => mql.removeEventListener("change", checkDevice);
  }, []);

  return deviceType;
}

/**
 * Hook to detect if the app is running in standalone mode (PWA)
 */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkStandalone = () => {
      // Check for various standalone indicators
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    // Listen for display mode changes
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener("change", checkStandalone);
    
    return () => mql.removeEventListener("change", checkStandalone);
  }, []);

  return isStandalone;
}

/**
 * Hook to handle online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to get connection info (for PWA)
 */
export function useConnectionInfo() {
  const [connection, setConnection] = React.useState<{
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null>(null);

  React.useEffect(() => {
    const nav = navigator as any;
    if (nav.connection) {
      const updateConnection = () => {
        const conn = nav.connection;
        setConnection({
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 0,
          rtt: conn.rtt || 0,
          saveData: conn.saveData || false
        });
      };

      updateConnection();
      nav.connection.addEventListener('change', updateConnection);
      
      return () => nav.connection.removeEventListener('change', updateConnection);
    }
  }, []);

  return connection;
}
