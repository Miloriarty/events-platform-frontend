import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { RouterLink } from '@angular/router';
import { OrdersApi, RegistrationsApi } from '../../core/api';
import { EventItem, Order, OrderItem, Registration } from '../../core/models';
import { errorMessage } from '../../core/notify';

interface Choice {
  order: Order;
  item: OrderItem;
}

// Регистрация привязывает позицию своего заказа к мероприятию (см. RegistrationsServiceImpl)
@Component({
  selector: 'app-register-dialog',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    CurrencyPipe,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Регистрация на «{{ event.title }}»</h2>
    <mat-dialog-content>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      } @else if (choices().length) {
        <p class="muted">Выберите билет из своих заказов. Одна регистрация занимает одно место.</p>
        <mat-radio-group [(ngModel)]="selected" class="choices">
          @for (c of choices(); track c.item.id) {
            <mat-radio-button [value]="c.item.id">
              <div class="choice">
                <strong>{{ c.item.ticketType }}</strong> × {{ c.item.quantity }}
                <span class="muted">
                  · заказ #{{ c.order.id }} от {{ c.order.orderDate | date: 'd MMM y' }} ·
                  {{ c.item.unitPrice | currency: 'RUB' }}
                </span>
              </div>
            </mat-radio-button>
          }
        </mat-radio-group>
      } @else {
        <div class="empty-state">
          <mat-icon>confirmation_number</mat-icon>
          <p>У вас нет купленных билетов. Сначала купите билет.</p>
          <a matButton="tonal" routerLink="/tickets" mat-dialog-close>К билетам</a>
        </div>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton mat-dialog-close>Отмена</button>
      <button matButton="filled" [disabled]="!selected || submitting()" (click)="submit()">
        Зарегистрироваться
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .choices {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .choice {
      line-height: 1.4;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class RegisterDialog implements OnInit {
  protected readonly event = inject<EventItem>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RegisterDialog, Registration>);
  private readonly orders = inject(OrdersApi);
  private readonly registrations = inject(RegistrationsApi);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly choices = signal<Choice[]>([]);
  protected selected: number | null = null;

  ngOnInit(): void {
    this.orders.page(0, 100).subscribe({
      next: (page) => {
        const choices = page.content
          .filter((o) => o.status === 'CREATED')
          .flatMap((order) => order.items.map((item) => ({ order, item })));
        this.choices.set(choices);
        if (choices.length === 1) this.selected = choices[0].item.id;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    if (!this.selected) return;
    this.submitting.set(true);
    this.error.set('');
    this.registrations.create(this.event.id, this.selected).subscribe({
      next: (reg) => this.ref.close(reg),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.submitting.set(false);
      },
    });
  }
}
