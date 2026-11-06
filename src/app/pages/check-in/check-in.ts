import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { PassesApi } from '../../core/api';
import { CheckInResult } from '../../core/models';
import { errorMessage } from '../../core/notify';
import { extractPassToken } from '../../core/pass-token';

// QR-код билета ведет сюда с ?token=...: камера телефона открывает страницу, и билет проверяется сразу
@Component({
  selector: 'app-check-in',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>Проверка билетов</h1>
    </div>

    <form class="scan" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Токен или ссылка из QR-кода</mat-label>
        <input matInput name="code" autocomplete="off" [(ngModel)]="code" />
      </mat-form-field>
      <button matButton="filled" type="submit" [disabled]="checking() || !code().trim()">
        <mat-icon>qr_code_scanner</mat-icon>
        Проверить
      </button>
    </form>

    @if (checking()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (result(); as r) {
      <mat-card appearance="outlined" class="verdict ok">
        <mat-card-content>
          <mat-icon>check_circle</mat-icon>
          <div>
            <h2>Проход разрешён</h2>
            <p>
              <a [routerLink]="['/events', r.eventId]">{{ r.eventTitle }}</a>
            </p>
            <p class="muted">
              Билет №{{ r.registrationId }}, {{ r.ticketType }}, пользователь ID {{ r.userId }},
              отмечен {{ r.checkedInAt | date: 'd MMM y, HH:mm' }}
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    }

    @if (error(); as message) {
      <mat-card appearance="outlined" class="verdict denied">
        <mat-card-content>
          <mat-icon>block</mat-icon>
          <div>
            <h2>Проход запрещён</h2>
            <p>{{ message }}</p>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    .scan {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: baseline;
    }
    mat-form-field {
      flex: 1;
      min-width: 240px;
    }
    .verdict {
      margin-top: 16px;
    }
    mat-card-content {
      display: flex;
      gap: 16px;
    }
    h2 {
      margin: 0 0 8px;
      font: var(--mat-sys-title-large);
    }
    p {
      margin: 0 0 4px;
    }
    a {
      color: var(--mat-sys-primary);
    }
    .ok mat-icon {
      color: var(--mat-sys-primary);
    }
    .denied mat-icon {
      color: var(--mat-sys-error);
    }
  `,
})
export class CheckIn {
  private readonly api = inject(PassesApi);
  private readonly router = inject(Router);

  // ?token=... из QR-кода
  readonly token = input<string>();

  protected readonly code = signal('');
  protected readonly checking = signal(false);
  protected readonly result = signal<CheckInResult | null>(null);
  protected readonly error = signal('');

  constructor() {
    effect(() => {
      const token = this.token();
      if (!token) return;
      this.check(token);
      // иначе обновление страницы проверит тот же билет еще раз и покажет отказ
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    });
  }

  protected submit(): void {
    const token = extractPassToken(this.code());
    if (token) this.check(token);
  }

  private check(token: string): void {
    this.checking.set(true);
    this.result.set(null);
    this.error.set('');
    this.api.checkIn(token).subscribe({
      next: (result) => {
        this.checking.set(false);
        this.result.set(result);
        this.code.set('');
      },
      error: (err) => {
        this.checking.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
