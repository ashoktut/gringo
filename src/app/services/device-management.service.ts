import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, throwError, timer } from 'rxjs';
import { map, catchError, switchMap, tap, filter, take } from 'rxjs/operators';
import {
  DeviceAssignment,
  DeviceStatus,
  DeviceCapabilities,
  QRAuthResult,
  DeviceSession,
  DeviceLocation,
  DeviceSync,
  DeviceType
} from '../models/task.models';
import { UserManagementService } from './user-management.service';
import { AuthBridgeService } from './auth-bridge.service';
import { NotificationService } from './notification.service';

export interface QRCodeData {
  deviceId: string;
  companyId: string;
  timestamp: string;
  signature: string;
  capabilities?: DeviceCapabilities;
}

export interface DeviceRegistration {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'kiosk';
  platform: 'ios' | 'android' | 'web';
  capabilities: DeviceCapabilities;
  location?: DeviceLocation;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceManagementService {
  private userManagementService = inject(UserManagementService);
  private authBridgeService = inject(AuthBridgeService);
  private notificationService = inject(NotificationService);

  // State management
  private devicesSubject = new BehaviorSubject<DeviceAssignment[]>([]);
  private deviceSessionsSubject = new BehaviorSubject<DeviceSession[]>([]);
  private syncStatusSubject = new BehaviorSubject<DeviceSync[]>([]);
  private isConnectedSubject = new BehaviorSubject<boolean>(navigator.onLine);

  // Signals for reactive state
  private devicesSignal = signal<DeviceAssignment[]>([]);
  private deviceSessionsSignal = signal<DeviceSession[]>([]);
  private syncStatusSignal = signal<DeviceSync[]>([]);
  private isConnectedSignal = signal<boolean>(navigator.onLine);

  // Computed properties
  activeDevices = computed(() =>
    this.devicesSignal().filter(device => device.status === 'online')
  );

  assignedDevices = computed(() =>
    this.devicesSignal().filter(device => device.assignedUserId)
  );

  pendingSyncs = computed(() =>
    this.syncStatusSignal().filter(sync => sync.status === 'pending')
  );

  deviceCount = computed(() => this.devicesSignal().length);

  onlineDeviceCount = computed(() => this.activeDevices().length);

  // Storage keys
  private readonly DEVICES_KEY = 'device_assignments';
  private readonly DEVICE_SESSIONS_KEY = 'device_sessions';
  private readonly SYNC_STATUS_KEY = 'sync_status';
  private readonly CURRENT_DEVICE_KEY = 'current_device';

  constructor() {
    this.initializeFromStorage();
    this.setupSubscriptions();
    this.setupNetworkListeners();
    this.registerCurrentDevice();
  }

  private initializeFromStorage(): void {
    try {
      const devicesData = localStorage.getItem(this.DEVICES_KEY);
      if (devicesData) {
        const devices = JSON.parse(devicesData);
        this.devicesSubject.next(devices);
        this.devicesSignal.set(devices);
      }

      const sessionsData = localStorage.getItem(this.DEVICE_SESSIONS_KEY);
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        this.deviceSessionsSubject.next(sessions);
        this.deviceSessionsSignal.set(sessions);
      }

      const syncData = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (syncData) {
        const syncs = JSON.parse(syncData);
        this.syncStatusSubject.next(syncs);
        this.syncStatusSignal.set(syncs);
      }
    } catch (error) {
      console.error('Error loading device data from storage:', error);
    }
  }

  private setupSubscriptions(): void {
    // Sync subjects with signals
    this.devicesSubject.subscribe(devices => {
      this.devicesSignal.set(devices);
      localStorage.setItem(this.DEVICES_KEY, JSON.stringify(devices));
    });

    this.deviceSessionsSubject.subscribe(sessions => {
      this.deviceSessionsSignal.set(sessions);
      localStorage.setItem(this.DEVICE_SESSIONS_KEY, JSON.stringify(sessions));
    });

    this.syncStatusSubject.subscribe(syncs => {
      this.syncStatusSignal.set(syncs);
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(syncs));
    });

    this.isConnectedSubject.subscribe(connected => {
      this.isConnectedSignal.set(connected);
      if (connected) {
        this.processPendingSyncs();
      }
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isConnectedSubject.next(true);
      this.notificationService.showSuccess('Connection restored');
    });

    window.addEventListener('offline', () => {
      this.isConnectedSubject.next(false);
      this.notificationService.showWarning('Working offline');
    });
  }

  private registerCurrentDevice(): void {
    const currentDevice = this.getCurrentDeviceInfo();
    const session = this.authBridgeService.getCurrentSession();

    if (session && currentDevice) {
      this.registerDevice({
        deviceId: currentDevice.deviceId,
        deviceName: currentDevice.deviceName,
        deviceType: currentDevice.deviceType,
        platform: currentDevice.platform,
        capabilities: currentDevice.capabilities,
        location: currentDevice.location
      }).subscribe({
        next: () => console.log('Device registered successfully'),
        error: (error) => console.error('Device registration failed:', error)
      });
    }
  }

  /**
   * Generate QR code for device authentication
   */
  generateQRCode(): Observable<string> {
    try {
      const session = this.authBridgeService.getCurrentSession();
      if (!session) {
        return throwError(() => new Error('No active session'));
      }

      const deviceInfo = this.getCurrentDeviceInfo();
      const qrData: QRCodeData = {
        deviceId: deviceInfo.deviceId,
        companyId: session.user.companyId || '',
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(deviceInfo.deviceId, session.user.companyId || ''),
        capabilities: deviceInfo.capabilities
      };

      const qrString = btoa(JSON.stringify(qrData));

      return new Observable(observer => {
        observer.next(qrString);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Authenticate device using QR code
   */
  authenticateWithQR(qrCode: string): Observable<QRAuthResult> {
    try {
      const qrData: QRCodeData = JSON.parse(atob(qrCode));

      // Validate QR code
      if (!this.validateQRCode(qrData)) {
        return throwError(() => new Error('Invalid QR code'));
      }

      // Check if device exists
      return this.getDevice(qrData.deviceId).pipe(
        switchMap((device): Observable<QRAuthResult> => {
          if (!device) {
            const result: QRAuthResult = {
              success: false,
              error: 'Device not found'
            };
            return new Observable(observer => {
              observer.next(result);
              observer.complete();
            });
          }

          // Create device session
          const session: DeviceSession = {
            id: this.generateId(),
            deviceId: qrData.deviceId,
            userId: '', // Will be set after user selection
            companyId: qrData.companyId,
            startTime: new Date().toISOString(),
            isActive: true,
            location: device.location,
            capabilities: qrData.capabilities || device.capabilities
          };

          const currentSessions = this.deviceSessionsSubject.value;
          this.deviceSessionsSubject.next([...currentSessions, session]);

          const result: QRAuthResult = {
            success: true,
            deviceId: qrData.deviceId,
            sessionId: session.id,
            capabilities: session.capabilities,
            companyId: qrData.companyId
          };

          this.notificationService.showSuccess('Device authenticated successfully');
          return new Observable(observer => {
            observer.next(result);
            observer.complete();
          });
        }),
        catchError((error): Observable<QRAuthResult> => {
          const result: QRAuthResult = {
            success: false,
            error: error.message
          };
          return new Observable(observer => {
            observer.next(result);
            observer.complete();
          });
        })
      );
    } catch (error) {
      const result: QRAuthResult = {
        success: false,
        error: 'Invalid QR code format'
      };
      return new Observable(observer => {
        observer.next(result);
        observer.complete();
      });
    }
  }

  /**
   * Register a new device
   */
  registerDevice(registration: DeviceRegistration): Observable<DeviceAssignment> {
    try {
      const session = this.authBridgeService.getCurrentSession();
      if (!session) {
        return throwError(() => new Error('No active session'));
      }

      const device: DeviceAssignment = {
        id: this.generateId(),
        deviceId: registration.deviceId,
        deviceName: registration.deviceName,
        deviceType: DeviceType.MOBILE, // Convert string to enum
        platform: registration.platform,
        companyId: session.user.companyId,
        assignedUserId: session.user.id,
        assignedBy: session.user.id,
        status: 'online',
        isActive: true,
        isOnline: true,
        capabilities: registration.capabilities,
        location: registration.location,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const currentDevices = this.devicesSubject.value;
      const existingIndex = currentDevices.findIndex(d => d.deviceId === registration.deviceId);

      if (existingIndex >= 0) {
        // Update existing device
        const updatedDevices = [...currentDevices];
        updatedDevices[existingIndex] = { ...updatedDevices[existingIndex], ...device, id: updatedDevices[existingIndex].id };
        this.devicesSubject.next(updatedDevices);
      } else {
        // Add new device
        this.devicesSubject.next([...currentDevices, device]);
      }

      // Store current device info
      localStorage.setItem(this.CURRENT_DEVICE_KEY, JSON.stringify(device));

      this.notificationService.showSuccess('Device registered successfully');
      return new Observable(observer => {
        observer.next(device);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Assign device to user
   */
  assignDevice(deviceId: string, userId: string): Observable<DeviceAssignment> {
    try {
      const currentDevices = this.devicesSubject.value;
      const deviceIndex = currentDevices.findIndex(device => device.deviceId === deviceId);

      if (deviceIndex === -1) {
        return throwError(() => new Error('Device not found'));
      }

      const session = this.authBridgeService.getCurrentSession();
      if (!session) {
        return throwError(() => new Error('No active session'));
      }

      const updatedDevice: DeviceAssignment = {
        ...currentDevices[deviceIndex],
        assignedUserId: userId,
        assignedBy: session.user.id,
        updatedAt: new Date()
      };

      const updatedDevices = [...currentDevices];
      updatedDevices[deviceIndex] = updatedDevice;
      this.devicesSubject.next(updatedDevices);

      this.notificationService.showSuccess('Device assigned successfully');
      return new Observable(observer => {
        observer.next(updatedDevice);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Update device status
   */
  updateDeviceStatus(deviceId: string, status: DeviceStatus): Observable<DeviceAssignment> {
    try {
      const currentDevices = this.devicesSubject.value;
      const deviceIndex = currentDevices.findIndex(device => device.deviceId === deviceId);

      if (deviceIndex === -1) {
        return throwError(() => new Error('Device not found'));
      }

      const updatedDevice: DeviceAssignment = {
        ...currentDevices[deviceIndex],
        status,
        lastSeen: new Date(),
        updatedAt: new Date()
      };

      const updatedDevices = [...currentDevices];
      updatedDevices[deviceIndex] = updatedDevice;
      this.devicesSubject.next(updatedDevices);

      return new Observable(observer => {
        observer.next(updatedDevice);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId: string): Observable<DeviceAssignment | null> {
    return this.devicesSubject.pipe(
      map(devices => devices.find(device => device.deviceId === deviceId) || null)
    );
  }

  /**
   * Get all devices
   */
  getDevices(): Observable<DeviceAssignment[]> {
    const session = this.authBridgeService.getCurrentSession();
    if (!session) {
      return throwError(() => new Error('No active session'));
    }

    return this.devicesSubject.pipe(
      map(devices => devices.filter(device =>
        session.user.role === 'super-admin' || device.companyId === session.user.companyId
      ))
    );
  }

  /**
   * Get devices by user
   */
  getDevicesByUser(userId: string): Observable<DeviceAssignment[]> {
    return this.devicesSubject.pipe(
      map(devices => devices.filter(device => device.assignedUserId === userId))
    );
  }

  /**
   * Start device session
   */
  startDeviceSession(deviceId: string, userId: string): Observable<DeviceSession> {
    try {
      const session = this.authBridgeService.getCurrentSession();
      if (!session) {
        return throwError(() => new Error('No active session'));
      }

      const deviceSession: DeviceSession = {
        id: this.generateId(),
        deviceId,
        userId,
        companyId: session.user.companyId || '',
        startTime: new Date().toISOString(),
        isActive: true
      };

      const currentSessions = this.deviceSessionsSubject.value;
      this.deviceSessionsSubject.next([...currentSessions, deviceSession]);

      // Update device status
      this.updateDeviceStatus(deviceId, 'online').subscribe();

      return new Observable(observer => {
        observer.next(deviceSession);
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * End device session
   */
  endDeviceSession(sessionId: string): Observable<void> {
    try {
      const currentSessions = this.deviceSessionsSubject.value;
      const sessionIndex = currentSessions.findIndex(session => session.id === sessionId);

      if (sessionIndex === -1) {
        return throwError(() => new Error('Session not found'));
      }

      const updatedSession = {
        ...currentSessions[sessionIndex],
        endTime: new Date().toISOString(),
        isActive: false
      };

      const updatedSessions = [...currentSessions];
      updatedSessions[sessionIndex] = updatedSession;
      this.deviceSessionsSubject.next(updatedSessions);

      // Update device status to offline
      this.updateDeviceStatus(updatedSession.deviceId, 'offline').subscribe();

      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Sync device data
   */
  syncDevice(deviceId: string): Observable<DeviceSync> {
    try {
      const sync: DeviceSync = {
        id: this.generateId(),
        deviceId,
        status: 'pending',
        startTime: new Date().toISOString(),
        progress: 0
      };

      const currentSyncs = this.syncStatusSubject.value;
      this.syncStatusSubject.next([...currentSyncs, sync]);

      // Simulate sync process
      return timer(1000).pipe(
        tap(() => {
          sync.progress = 50;
          sync.status = 'syncing';
          this.updateSyncStatus(sync);
        }),
        switchMap(() => timer(2000)),
        map(() => {
          sync.progress = 100;
          sync.status = 'completed';
          sync.endTime = new Date().toISOString();
          this.updateSyncStatus(sync);
          return sync;
        }),
        catchError(error => {
          sync.status = 'failed';
          sync.error = error.message;
          sync.endTime = new Date().toISOString();
          this.updateSyncStatus(sync);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Get current device information
   */
  getCurrentDeviceInfo(): DeviceRegistration {
    const userAgent = navigator.userAgent;
    const deviceId = this.getOrCreateDeviceId();

    let deviceType: DeviceRegistration['deviceType'] = 'desktop';
    let platform: DeviceRegistration['platform'] = 'web';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPad/.test(userAgent)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'mobile';
      }
    }

    // Detect platform
    if (/iPhone|iPad/.test(userAgent)) {
      platform = 'ios';
    } else if (/Android/.test(userAgent)) {
      platform = 'android';
    }

    const capabilities: DeviceCapabilities = {
      hasCamera: this.hasCamera(),
      hasGPS: this.hasGPS(),
      hasInternet: navigator.onLine,
      canSync: true,
      supportsPWA: this.supportsPWA(),
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['pdf', 'jpg', 'png', 'doc', 'docx']
    };

    return {
      deviceId,
      deviceName: this.getDeviceName(),
      deviceType,
      platform,
      capabilities,
      location: this.getCurrentLocation()
    };
  }

  /**
   * Process pending syncs when online
   */
  private processPendingSyncs(): void {
    const pendingSyncs = this.pendingSyncs();
    pendingSyncs.forEach(sync => {
      this.syncDevice(sync.deviceId).subscribe({
        next: () => console.log(`Sync completed for device ${sync.deviceId}`),
        error: (error) => console.error(`Sync failed for device ${sync.deviceId}:`, error)
      });
    });
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(updatedSync: DeviceSync): void {
    const currentSyncs = this.syncStatusSubject.value;
    const syncIndex = currentSyncs.findIndex(sync => sync.id === updatedSync.id);

    if (syncIndex >= 0) {
      const updatedSyncs = [...currentSyncs];
      updatedSyncs[syncIndex] = updatedSync;
      this.syncStatusSubject.next(updatedSyncs);
    }
  }

  /**
   * Validate QR code
   */
  private validateQRCode(qrData: QRCodeData): boolean {
    // Check if QR code is not expired (24 hours)
    const timestamp = new Date(qrData.timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return false;
    }

    // Validate signature
    const expectedSignature = this.generateSignature(qrData.deviceId, qrData.companyId);
    return qrData.signature === expectedSignature;
  }

  /**
   * Generate signature for QR code
   */
  private generateSignature(deviceId: string, companyId: string): string {
    // Simple signature generation - in production, use proper crypto
    return btoa(`${deviceId}:${companyId}:${Date.now()}`);
  }

  /**
   * Generate or retrieve device ID
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = this.generateId();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;

    if (/iPhone/.test(userAgent)) return 'iPhone';
    if (/iPad/.test(userAgent)) return 'iPad';
    if (/Android/.test(userAgent)) return 'Android Device';
    if (/Mac/.test(platform)) return 'Mac';
    if (/Win/.test(platform)) return 'Windows PC';
    if (/Linux/.test(platform)) return 'Linux PC';

    return 'Unknown Device';
  }

  /**
   * Check if device has camera
   */
  private hasCamera(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Check if device has GPS
   */
  private hasGPS(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Check if device supports PWA
   */
  private supportsPWA(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Get current location (simplified)
   */
  private getCurrentLocation(): DeviceLocation | undefined {
    // This would normally request geolocation
    return undefined;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Getter methods for observables
  get devices$(): Observable<DeviceAssignment[]> {
    return this.devicesSubject.asObservable();
  }

  get deviceSessions$(): Observable<DeviceSession[]> {
    return this.deviceSessionsSubject.asObservable();
  }

  get syncStatus$(): Observable<DeviceSync[]> {
    return this.syncStatusSubject.asObservable();
  }

  get isConnected$(): Observable<boolean> {
    return this.isConnectedSubject.asObservable();
  }
}
