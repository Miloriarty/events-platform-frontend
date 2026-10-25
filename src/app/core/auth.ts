import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, Role, User } from './models';

const TOKEN_KEY = 'events.token';

export interface CurrentUser {
  id: number;
  username: string;
  role: Role;
  exp: number;
}

// Токен выпускает user-service: sub — id пользователя, claims username и role
function decode(token: string): CurrentUser | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json);
    if (!claims.sub || !claims.role) return null;
    return {
      id: Number(claims.sub),
      username: claims.username ?? claims.sub,
      role: claims.role,
      exp: claims.exp ?? 0,
    };
  } catch {
    return null;
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = computed(() => {
    const token = this.tokenSignal();
    return token ? decode(token) : null;
  });
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isManager = computed(() => ['MANAGER', 'ADMIN'].includes(this.user()?.role ?? ''));
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  constructor() {
    const token = readToken();
    const user = token ? decode(token) : null;
    if (token && user && user.exp * 1000 > Date.now()) {
      this.tokenSignal.set(token);
    } else if (token) {
      this.store(null);
    }
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', request)
      .pipe(tap((res) => this.store(res.token)));
  }

  register(request: RegisterRequest): Observable<User> {
    return this.http.post<User>('/api/auth/register', request);
  }

  logout(redirect = true): void {
    this.store(null);
    if (redirect) this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.user()?.role;
    return !!role && roles.includes(role);
  }

  private store(token: string | null): void {
    this.tokenSignal.set(token);
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // хранилище недоступно — токен живёт только в памяти
    }
  }
}
