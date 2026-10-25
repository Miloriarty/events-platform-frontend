import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './core/auth';
import { Role } from './core/models';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: Role[];
  auth?: boolean;
}

const NAV: NavItem[] = [
  { path: '/events', label: 'Мероприятия', icon: 'event' },
  { path: '/tickets', label: 'Билеты', icon: 'confirmation_number', auth: true },
  { path: '/orders', label: 'Мои заказы', icon: 'shopping_bag', auth: true },
  { path: '/registrations', label: 'Мои регистрации', icon: 'how_to_reg', auth: true },
  { path: '/my-events', label: 'Мои мероприятия', icon: 'event_note', roles: ['MANAGER', 'ADMIN'] },
  { path: '/catalog', label: 'Справочники', icon: 'category', roles: ['MANAGER', 'ADMIN'] },
  { path: '/users', label: 'Пользователи', icon: 'group', roles: ['ADMIN'] },
];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  USER: 'Пользователь',
};

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);

  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly nav = computed(() => {
    const user = this.auth.user();
    return NAV.filter((item) => {
      if (item.roles) return !!user && item.roles.includes(user.role);
      if (item.auth) return !!user;
      return true;
    });
  });

  protected readonly roleLabel = computed(() => {
    const role = this.auth.user()?.role;
    return role ? ROLE_LABELS[role] : '';
  });
}
