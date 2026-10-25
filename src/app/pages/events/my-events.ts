import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { EventsApi } from '../../core/api';
import { EventItem } from '../../core/models';
import { Notify } from '../../core/notify';
import { EventCard } from './event-card';

@Component({
  selector: 'app-my-events',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, EventCard],
  template: `
    <div class="page-header">
      <h1>Мои мероприятия</h1>
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
  private readonly api = inject(EventsApi);
  private readonly notify = inject(Notify);

  protected readonly events = signal<EventItem[]>([]);
  protected readonly loading = signal(true);

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
}
