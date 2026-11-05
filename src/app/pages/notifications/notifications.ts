import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { NotificationsApi } from '../../core/api';
import { AppNotification, NotificationType } from '../../core/models';
import { NotificationCenter } from '../../core/notifications';
import { Notify } from '../../core/notify';

const ICONS: Record<NotificationType, string> = {
  ORDER_CREATED: 'shopping_bag',
  ORDER_CANCELLED: 'cancel',
  REGISTRATION_CREATED: 'how_to_reg',
  REGISTRATION_CANCELLED: 'event_busy',
};

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatPaginatorModule, MatProgressBarModule],
  template: `
    <div class="page-header">
      <h1>Уведомления</h1>
      @if (center.unreadCount()) {
        <button matButton="tonal" (click)="markAllRead()">
          <mat-icon>done_all</mat-icon>
          Прочитать все
        </button>
      }
      @if (center.permission() === 'default') {
        <button matButton (click)="center.enableBrowserNotifications()">
          <mat-icon>notifications_active</mat-icon>
          Показывать в браузере
        </button>
      }
    </div>

    @if (center.permission() === 'denied') {
      <p class="muted">
        Уведомления браузера запрещены в настройках сайта. Новые уведомления видны только в открытой
        вкладке.
      </p>
    }

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (items().length) {
      <ul class="list">
        @for (n of items(); track n.id) {
          <li>
            <button class="row" [class.unread]="!n.read" (click)="open(n)">
              <mat-icon>{{ icons[n.type] }}</mat-icon>
              <span class="text">
                <span class="title">{{ n.title }}</span>
                <span class="message">{{ n.message }}</span>
              </span>
              <span class="date">{{ n.createdAt | date: 'd MMM y, HH:mm' }}</span>
            </button>
          </li>
        }
      </ul>

      @if (total() > pageSize()) {
        <mat-paginator
          [length]="total()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="onPage($event)"
        />
      }
    } @else if (!loading()) {
      <div class="empty-state">
        <mat-icon>notifications_none</mat-icon>
        <p>Уведомлений пока нет</p>
      </div>
    }
  `,
  styles: `
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium);
      overflow: hidden;
    }
    li + li {
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      padding: 12px 16px;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row:hover {
      background: var(--mat-sys-surface-container-high);
    }
    .row.unread {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
    .text {
      flex: 1;
      min-width: 0;
    }
    .title,
    .message {
      display: block;
    }
    .title {
      font: var(--mat-sys-title-small);
    }
    .message {
      font: var(--mat-sys-body-medium);
      overflow-wrap: anywhere;
    }
    .date {
      font: var(--mat-sys-label-medium);
      white-space: nowrap;
    }
    mat-paginator {
      background: transparent;
    }
    @media (max-width: 600px) {
      .row {
        flex-wrap: wrap;
      }
    }
  `,
})
export class Notifications {
  protected readonly center = inject(NotificationCenter);
  private readonly api = inject(NotificationsApi);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);

  protected readonly icons = ICONS;
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly loading = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);

  constructor() {
    effect(() => {
      this.center.revision(); // новое уведомление или отметка о прочтении в другом месте
      this.load();
    });
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  protected open(notification: AppNotification): void {
    this.router.navigateByUrl(notification.link);
    if (notification.read) return;
    this.center.markRead(notification).subscribe({ error: (err) => this.notify.error(err) });
  }

  protected markAllRead(): void {
    this.center.markAllRead().subscribe({ error: (err) => this.notify.error(err) });
  }

  private load(): void {
    this.loading.set(true);
    this.api.page(this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.total.set(page.page.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }
}
