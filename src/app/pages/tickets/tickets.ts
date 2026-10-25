import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { TicketsApi, OrdersApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { Ticket } from '../../core/models';
import { Notify } from '../../core/notify';
import { confirm } from '../../shared/confirm-dialog';
import { EntityField, openEntityDialog } from '../../shared/entity-dialog';

const TICKET_FIELDS: EntityField[] = [
  { key: 'type', label: 'Тип билета', required: true, hint: 'Например, VIP или Стандарт' },
  { key: 'price', label: 'Цена, ₽', type: 'number', required: true, min: 0.01 },
  { key: 'quantity', label: 'Количество в продаже', type: 'number', required: true, min: 0 },
];

@Component({
  selector: 'app-tickets',
  imports: [
    CurrencyPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Билеты</h1>
      @if (auth.isManager()) {
        <button matButton="filled" (click)="edit()">
          <mat-icon>add</mat-icon>
          Новый тип билета
        </button>
      }
    </div>

    <p class="muted intro">
      Купленный билет можно использовать для регистрации на мероприятие — со страницы мероприятия.
    </p>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (tickets().length) {
      <div class="table-wrap">
        <table mat-table [dataSource]="tickets()">
          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Тип</th>
            <td mat-cell *matCellDef="let t">{{ t.type }}</td>
          </ng-container>
          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Цена</th>
            <td mat-cell *matCellDef="let t">{{ t.price | currency: 'RUB' }}</td>
          </ng-container>
          <ng-container matColumnDef="quantity">
            <th mat-header-cell *matHeaderCellDef>В наличии</th>
            <td mat-cell *matCellDef="let t">
              @if (t.quantity > 0) {
                {{ t.quantity }}
              } @else {
                <span class="status-chip off">Нет в наличии</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="cart">
            <th mat-header-cell *matHeaderCellDef>В заказ</th>
            <td mat-cell *matCellDef="let t">
              <div class="stepper">
                <button
                  matIconButton
                  aria-label="Меньше"
                  [disabled]="!cart()[t.id]"
                  (click)="change(t, -1)"
                >
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="count">{{ cart()[t.id] ?? 0 }}</span>
                <button
                  matIconButton
                  aria-label="Больше"
                  [disabled]="(cart()[t.id] ?? 0) >= t.quantity"
                  (click)="change(t, 1)"
                >
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let t" class="row-actions">
              <button matIconButton matTooltip="Изменить" (click)="edit(t)">
                <mat-icon>edit</mat-icon>
              </button>
              <button matIconButton matTooltip="Удалить" (click)="remove(t)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns()"></tr>
          <tr mat-row *matRowDef="let row; columns: columns()"></tr>
        </table>
      </div>
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
        <mat-icon>confirmation_number</mat-icon>
        <p>Билетов в продаже пока нет</p>
      </div>
    }

    @if (cartCount()) {
      <mat-card appearance="outlined" class="checkout">
        <mat-card-content>
          <div>
            <div class="muted">Билетов: {{ cartCount() }}</div>
            <div class="sum">{{ cartTotal() | currency: 'RUB' }}</div>
          </div>
          <div class="checkout-actions">
            <button matButton (click)="cart.set({})">Очистить</button>
            <button matButton="filled" [disabled]="ordering()" (click)="order()">
              <mat-icon>shopping_cart_checkout</mat-icon>
              Оформить заказ
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .intro {
      margin-top: -12px;
      margin-bottom: 16px;
    }
    .stepper {
      display: flex;
      align-items: center;
    }
    .count {
      min-width: 24px;
      text-align: center;
      font: var(--mat-sys-title-medium);
    }
    mat-paginator {
      background: transparent;
    }
    .checkout {
      position: sticky;
      bottom: 16px;
      margin-top: 16px;
      background: var(--mat-sys-surface-container-high);
    }
    .checkout mat-card-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      padding-top: 16px;
    }
    .sum {
      font: var(--mat-sys-headline-small);
    }
    .checkout-actions {
      display: flex;
      gap: 8px;
    }
  `,
})
export class Tickets implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(TicketsApi);
  private readonly orders = inject(OrdersApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly loading = signal(false);
  protected readonly ordering = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly cart = signal<Record<number, number>>({});

  // Корзина хранит и цены, чтобы итог не зависел от текущей страницы
  private readonly prices = signal<Record<number, number>>({});

  protected readonly columns = computed(() =>
    this.auth.isManager()
      ? ['type', 'price', 'quantity', 'cart', 'actions']
      : ['type', 'price', 'quantity', 'cart'],
  );
  protected readonly cartCount = computed(() =>
    Object.values(this.cart()).reduce((a, b) => a + b, 0),
  );
  protected readonly cartTotal = computed(() =>
    Object.entries(this.cart()).reduce(
      (sum, [id, qty]) => sum + (this.prices()[+id] ?? 0) * qty,
      0,
    ),
  );

  ngOnInit(): void {
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  change(t: Ticket, delta: number): void {
    this.prices.update((p) => ({ ...p, [t.id]: t.price }));
    this.cart.update((c) => {
      const next = { ...c };
      const qty = (next[t.id] ?? 0) + delta;
      if (qty > 0) next[t.id] = qty;
      else delete next[t.id];
      return next;
    });
  }

  order(): void {
    const items = Object.entries(this.cart()).map(([ticketId, quantity]) => ({
      ticketId: +ticketId,
      quantity,
    }));
    this.ordering.set(true);
    this.orders.create({ items }).subscribe({
      next: (o) => {
        this.ordering.set(false);
        this.cart.set({});
        this.notify.success(`Заказ #${o.id} оформлен`);
        this.router.navigate(['/orders']);
      },
      error: (err) => {
        this.ordering.set(false);
        this.notify.error(err);
        this.load();
      },
    });
  }

  edit(ticket?: Ticket): void {
    openEntityDialog<Partial<Ticket>>(this.dialog, {
      title: ticket ? 'Изменить билет' : 'Новый тип билета',
      fields: TICKET_FIELDS,
      value: ticket as unknown as Record<string, unknown>,
    })
      .pipe(
        filter(Boolean),
        switchMap((v) => (ticket ? this.api.update(ticket.id, v) : this.api.create(v))),
      )
      .subscribe({
        next: () => {
          this.notify.success('Сохранено');
          this.load();
        },
        error: (err) => this.notify.error(err),
      });
  }

  remove(ticket: Ticket): void {
    confirm(this.dialog, {
      title: 'Удалить билет?',
      message: `Тип «${ticket.type}» будет удалён. Нельзя удалить билет, на который есть заказы.`,
      confirm: 'Удалить',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(ticket.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Билет удалён');
          this.load();
        },
        error: (err) => this.notify.error(err),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.page(this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.tickets.set(page.content);
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
