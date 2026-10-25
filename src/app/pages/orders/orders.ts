import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { OrdersApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { Order } from '../../core/models';
import { Notify } from '../../core/notify';
import { confirm } from '../../shared/confirm-dialog';

@Component({
  selector: 'app-orders',
  imports: [
    DatePipe,
    CurrencyPipe,
    RouterLink,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ auth.isAdmin() ? 'Все заказы' : 'Мои заказы' }}</h1>
      <a matButton="tonal" routerLink="/tickets">
        <mat-icon>add_shopping_cart</mat-icon>
        Купить билеты
      </a>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (orders().length) {
      <mat-accordion multi>
        @for (o of orders(); track o.id) {
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>Заказ #{{ o.id }}</mat-panel-title>
              <mat-panel-description>
                <span>{{ o.orderDate | date: 'd MMM y, HH:mm' }}</span>
                @if (auth.isAdmin()) {
                  <span class="hide-sm">пользователь {{ o.userId }}</span>
                }
                <span class="sum">{{ o.totalPrice | currency: 'RUB' }}</span>
                <span
                  class="status-chip"
                  [class.ok]="o.status === 'CREATED'"
                  [class.off]="o.status === 'CANCELLED'"
                >
                  {{ o.status === 'CREATED' ? 'Оформлен' : 'Отменён' }}
                </span>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <table class="items">
              <thead>
                <tr>
                  <th>Позиция</th>
                  <th>Тип билета</th>
                  <th>Кол-во</th>
                  <th>Цена</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                @for (i of o.items; track i.id) {
                  <tr>
                    <td class="muted">#{{ i.id }}</td>
                    <td>{{ i.ticketType }}</td>
                    <td>{{ i.quantity }}</td>
                    <td>{{ i.unitPrice | currency: 'RUB' }}</td>
                    <td>{{ i.unitPrice * i.quantity | currency: 'RUB' }}</td>
                  </tr>
                }
              </tbody>
            </table>

            @if (o.status === 'CREATED') {
              <mat-action-row>
                <button matButton class="danger" (click)="cancel(o)">
                  <mat-icon>cancel</mat-icon>
                  Отменить заказ
                </button>
              </mat-action-row>
            }
          </mat-expansion-panel>
        }
      </mat-accordion>

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
        <mat-icon>shopping_bag</mat-icon>
        <p>Заказов пока нет</p>
      </div>
    }
  `,
  styles: `
    mat-accordion {
      --mat-expansion-container-background-color: var(--mat-sys-surface-container-high);
      --mat-expansion-header-hover-state-layer-color: var(--mat-sys-surface-container-highest);
    }
    mat-panel-description {
      display: flex;
      align-items: center;
      gap: 16px;
      justify-content: flex-end;
    }
    .sum {
      color: var(--mat-sys-on-surface);
      font-weight: 500;
    }
    .items {
      width: 100%;
      border-collapse: collapse;
      font: var(--mat-sys-body-medium);
    }
    .items th {
      text-align: left;
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
      padding: 8px 8px 8px 0;
    }
    .items td {
      padding: 8px 8px 8px 0;
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    .danger {
      color: var(--mat-sys-error);
    }
    mat-paginator {
      background: transparent;
    }
    @media (max-width: 600px) {
      .hide-sm {
        display: none;
      }
    }
  `,
})
export class Orders implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(OrdersApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);

  protected readonly orders = signal<Order[]>([]);
  protected readonly loading = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);

  ngOnInit(): void {
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  cancel(o: Order): void {
    confirm(this.dialog, {
      title: `Отменить заказ #${o.id}?`,
      message: 'Билеты вернутся в продажу, регистрации по этому заказу будут отменены.',
      confirm: 'Отменить заказ',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.cancel(o.id)),
      )
      .subscribe({
        next: (updated) => {
          this.orders.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
          this.notify.success('Заказ отменён');
        },
        error: (err) => this.notify.error(err),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.page(this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.orders.set(page.content);
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
