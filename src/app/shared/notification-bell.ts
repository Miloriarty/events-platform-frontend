import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { AppNotification } from '../core/models';
import { NotificationCenter } from '../core/notifications';
import { Notify } from '../core/notify';

@Component({
  selector: 'app-notification-bell',
  imports: [
    DatePipe,
    RouterLink,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <button matIconButton [matMenuTriggerFor]="menu" aria-label="Уведомления">
      <mat-icon
        [matBadge]="center.unreadCount()"
        [matBadgeHidden]="!center.unreadCount()"
        aria-hidden="false"
      >
        notifications
      </mat-icon>
    </button>

    <mat-menu #menu="matMenu" xPosition="before">
      @for (n of center.recent().slice(0, 5); track n.id) {
        <button mat-menu-item class="item" [class.unread]="!n.read" (click)="open(n)">
          <span class="title">{{ n.title }}</span>
          <span class="message">{{ n.message }}</span>
          <span class="date">{{ n.createdAt | date: 'd MMM, HH:mm' }}</span>
        </button>
      } @empty {
        <div class="empty">Уведомлений пока нет</div>
      }
      <mat-divider />
      <a mat-menu-item routerLink="/notifications">
        <mat-icon>inbox</mat-icon>
        <span>Все уведомления</span>
      </a>
      @if (center.unreadCount()) {
        <button mat-menu-item (click)="markAllRead()">
          <mat-icon>done_all</mat-icon>
          <span>Прочитать все</span>
        </button>
      }
      @if (center.permission() === 'default') {
        <button mat-menu-item (click)="center.enableBrowserNotifications()">
          <mat-icon>notifications_active</mat-icon>
          <span>Показывать в браузере</span>
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .item {
      height: auto;
      padding-block: 8px;
    }
    .item.unread {
      background: var(--mat-sys-secondary-container);
    }
    .title,
    .message,
    .date {
      display: block;
    }
    .title {
      font: var(--mat-sys-title-small);
    }
    .message {
      font: var(--mat-sys-body-small);
    }
    .date {
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .empty {
      padding: 12px 16px;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class NotificationBell {
  protected readonly center = inject(NotificationCenter);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);

  protected open(notification: AppNotification): void {
    this.router.navigateByUrl(notification.link);
    if (notification.read) return;
    this.center.markRead(notification).subscribe({ error: (err) => this.notify.error(err) });
  }

  protected markAllRead(): void {
    this.center.markAllRead().subscribe({ error: (err) => this.notify.error(err) });
  }
}
