import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { EventsApi, RegistrationsApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { isPast } from '../../core/dates';
import { EventItem, Registration } from '../../core/models';
import { Notify } from '../../core/notify';
import { confirm } from '../../shared/confirm-dialog';
import { RegisterDialog } from './register-dialog';

@Component({
  selector: 'app-event-detail',
  imports: [
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
  ],
  template: `
    <a matButton routerLink="/events" class="back">
      <mat-icon>arrow_back</mat-icon>
      Все мероприятия
    </a>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (event(); as e) {
      <div class="page-header">
        <h1>{{ e.title }}</h1>
        @if (canManage()) {
          <a matButton="outlined" [routerLink]="['/events', e.id, 'edit']">
            <mat-icon>edit</mat-icon>
            Изменить
          </a>
          <button matButton="outlined" class="danger" (click)="remove(e)">
            <mat-icon>delete</mat-icon>
            Удалить
          </button>
        }
      </div>

      <div class="layout">
        <mat-card appearance="outlined" class="info">
          <mat-card-content>
            <span class="status-chip">{{ e.category.name }}</span>
            @if (past()) {
              <span class="status-chip off">Завершено</span>
            }
            <p class="description">{{ e.description || 'Описание не указано' }}</p>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined" class="side">
          <mat-card-content>
            <div class="fact">
              <mat-icon>calendar_today</mat-icon>
              <div>
                <div class="label">Даты</div>
                {{ e.startDate | date: 'd MMMM y' }}
                @if (e.endDate !== e.startDate) {
                  — {{ e.endDate | date: 'd MMMM y' }}
                }
              </div>
            </div>
            <div class="fact">
              <mat-icon>place</mat-icon>
              <div>
                <div class="label">Место</div>
                {{ e.location.name }}<br />
                <span class="muted">{{ e.location.address }}, {{ e.location.city }}</span>
              </div>
            </div>
            <div class="fact">
              <mat-icon>groups</mat-icon>
              <div>
                <div class="label">Вместимость</div>
                {{ e.maxParticipants }} участников
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            @if (auth.isLoggedIn()) {
              <button
                matButton="filled"
                class="full-width"
                [disabled]="past()"
                (click)="openRegister(e)"
              >
                <mat-icon>how_to_reg</mat-icon>
                Зарегистрироваться
              </button>
            } @else {
              <a
                matButton="filled"
                class="full-width"
                routerLink="/login"
                [queryParams]="{ returnUrl: '/events/' + e.id }"
              >
                Войдите, чтобы зарегистрироваться
              </a>
            }
          </mat-card-actions>
        </mat-card>
      </div>

      @if (canManage()) {
        <h2 class="section-title">
          Участники
          <span class="muted">({{ confirmedCount() }} из {{ e.maxParticipants }})</span>
        </h2>
        @if (participants().length) {
          <div class="table-wrap">
            <table mat-table [dataSource]="participants()">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let r">{{ r.id }}</td>
              </ng-container>
              <ng-container matColumnDef="userId">
                <th mat-header-cell *matHeaderCellDef>Пользователь</th>
                <td mat-cell *matCellDef="let r">ID {{ r.userId }}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Дата регистрации</th>
                <td mat-cell *matCellDef="let r">
                  {{ r.registrationDate | date: 'd MMM y, HH:mm' }}
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Статус</th>
                <td mat-cell *matCellDef="let r">
                  <span
                    class="status-chip"
                    [class.ok]="r.status === 'CONFIRMED'"
                    [class.off]="r.status === 'CANCELLED'"
                  >
                    {{ r.status === 'CONFIRMED' ? 'Подтверждена' : 'Отменена' }}
                  </span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
        } @else {
          <p class="muted">Пока никто не зарегистрировался.</p>
        }
      }
    }
  `,
  styles: `
    .back {
      margin-bottom: 8px;
    }
    .layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 800px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .info .status-chip {
      margin-right: 8px;
    }
    .description {
      margin-top: 16px;
      white-space: pre-line;
      font: var(--mat-sys-body-large);
    }
    .fact {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .fact mat-icon {
      color: var(--mat-sys-primary);
    }
    .label {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    mat-card-actions {
      padding: 12px 16px 16px;
    }
    .danger {
      color: var(--mat-sys-error);
    }
    .section-title {
      margin: 32px 0 16px;
      font: var(--mat-sys-title-large);
    }
  `,
})
export class EventDetail {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(EventsApi);
  private readonly registrations = inject(RegistrationsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly event = signal<EventItem | null>(null);
  protected readonly participants = signal<Registration[]>([]);
  protected readonly loading = signal(true);
  protected readonly columns = ['id', 'userId', 'date', 'status'];

  protected readonly past = computed(() => {
    const e = this.event();
    return !!e && isPast(e.endDate);
  });

  // Менять мероприятие и смотреть участников может организатор или ADMIN
  protected readonly canManage = computed(() => {
    const user = this.auth.user();
    const e = this.event();
    return (
      !!user &&
      !!e &&
      (user.role === 'ADMIN' || (user.role === 'MANAGER' && user.id === e.organizerId))
    );
  });

  protected readonly confirmedCount = computed(
    () => this.participants().filter((r) => r.status === 'CONFIRMED').length,
  );

  constructor() {
    effect(() => this.load(Number(this.id())));
  }

  private load(id: number): void {
    this.loading.set(true);
    this.api.get(id).subscribe({
      next: (e) => {
        this.event.set(e);
        this.loading.set(false);
        if (this.canManage()) this.loadParticipants(e.id);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err);
        this.router.navigate(['/events']);
      },
    });
  }

  private loadParticipants(eventId: number): void {
    this.registrations.byEvent(eventId).subscribe({
      next: (list) => this.participants.set(list),
      error: (err) => this.notify.error(err),
    });
  }

  openRegister(e: EventItem): void {
    this.dialog
      .open(RegisterDialog, { data: e, width: '520px' })
      .afterClosed()
      .subscribe((reg?: Registration) => {
        if (!reg) return;
        this.notify.success('Вы зарегистрированы!');
        if (this.canManage()) this.loadParticipants(e.id);
      });
  }

  remove(e: EventItem): void {
    confirm(this.dialog, {
      title: 'Удалить мероприятие?',
      message: `«${e.title}» будет удалено без возможности восстановления.`,
      confirm: 'Удалить',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(e.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Мероприятие удалено');
          this.router.navigate(['/events']);
        },
        error: (err) => this.notify.error(err),
      });
  }
}
