import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { EventsApi, RemindersApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { EventItem } from '../../core/models';
import { Notify } from '../../core/notify';
import { EventCard } from './event-card';

@Component({
  selector: 'app-my-events',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, EventCard],
  template: `
    <div class="page-header">
      <h1>Мои мероприятия</h1>
      @if (auth.isAdmin()) {
        <button matButton="outlined" [disabled]="sending()" (click)="sendReminders()">
          <mat-icon>alarm</mat-icon>
          Разослать напоминания
        </button>
      }
      <a matButton="filled" routerLink="/events/new">
        <mat-icon>add</mat-icon>
        Создать
      </a>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    } @else if (events().length) {
      <div class="grid">
        @for (event of events(); track event.id) {
          <app-event-card [event]="event" />
        }
      </div>
    } @else {
      <div class="empty-state">
        <mat-icon>event_note</mat-icon>
        <p>Вы ещё не организовали ни одного мероприятия</p>
      </div>
    }
  `,
  styleUrl: './events.scss',
})
export class MyEvents implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(EventsApi);
  private readonly reminders = inject(RemindersApi);
  private readonly notify = inject(Notify);

  protected readonly events = signal<EventItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);

  ngOnInit(): void {
    this.api.my().subscribe({
      next: (list) => {
        this.events.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }

  // Обычно reminder-service работает по расписанию; повторный запуск не дает вторых уведомлений
  protected sendReminders(): void {
    this.sending.set(true);
    this.reminders.run().subscribe({
      next: (run) => {
        this.sending.set(false);
        const failed = run.failed ? `, не удалось: ${run.failed}` : '';
        this.notify.success(
          `Мероприятий на ${run.date}: ${run.events}, напоминаний: ${run.published}${failed}`,
        );
      },
      error: (err) => {
        this.sending.set(false);
        this.notify.error(err);
      },
    });
  }
}
