import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private sessionSubject = new BehaviorSubject<Session | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public session$ = this.sessionSubject.asObservable();
  public isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);

  constructor() {
    this.initializeSupabase();
    this.setupOnlineListener();
    this.setupAuthListener();
  }

  private initializeSupabase(): void {
    if (!environment.supabase.enabled) {
      console.log('🔌 Supabase disabled - running in offline-only mode');
      return;
    }

    if (!environment.supabase.url || !environment.supabase.anonKey) {
      console.warn('⚠️ Supabase credentials not configured. Add them to environment.ts');
      return;
    }

    try {
      this.supabase = createClient(
        environment.supabase.url,
        environment.supabase.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: window.localStorage,
            storageKey: 'gringo-auth-token'
          }
        }
      );
      console.log('✅ Supabase client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
    }
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - online');
      this.isOnline$.next(true);
    });

    window.addEventListener('offline', () => {
      console.log('📡 Connection lost - offline');
      this.isOnline$.next(false);
    });
  }

  private setupAuthListener(): void {
    if (!this.supabase) return;

    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event);
      this.sessionSubject.next(session);
      this.currentUserSubject.next(session?.user ?? null);
    });

    // Check for existing session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.sessionSubject.next(session);
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  // Client getter
  get client(): SupabaseClient | null {
    return this.supabase;
  }

  get isEnabled(): boolean {
    return this.supabase !== null;
  }

  get isOnline(): boolean {
    return this.isOnline$.value;
  }

  get currentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get session(): Session | null {
    return this.sessionSubject.value;
  }

  // Authentication Methods
  async signUp(email: string, password: string, metadata?: any) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    // Configure redirect URL to our reset password page
    const redirectTo = `${window.location.origin}/auth/reset-password`;

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    });

    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  }

  async getSession() {
    if (!this.supabase) {
      return null;
    }

    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  // Database Methods
  async query(table: string) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }
    return this.supabase.from(table);
  }

  async insert(table: string, data: any) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }
    return this.supabase.from(table).insert(data).select();
  }

  async update(table: string, id: string, data: any) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }
    return this.supabase.from(table).update(data).eq('id', id).select();
  }

  async delete(table: string, id: string) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }
    return this.supabase.from(table).delete().eq('id', id);
  }

  // Storage Methods
  async uploadFile(bucket: string, path: string, file: File) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async downloadFile(bucket: string, path: string) {
    if (!this.supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  }

  // Real-time Subscriptions
  subscribeToTable(table: string, callback: (payload: any) => void) {
    if (!this.supabase) {
      console.warn('Supabase not initialized - real-time disabled');
      return null;
    }

    return this.supabase
      .channel(`${table}-changes`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: table },
        callback
      )
      .subscribe();
  }

  unsubscribe(channel: any) {
    if (channel && this.supabase) {
      this.supabase.removeChannel(channel);
    }
  }
}
