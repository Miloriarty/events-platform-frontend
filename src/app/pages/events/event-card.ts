import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { isPast } from '../../core/dates';
import { EventItem } from '../../core/models';

@Component({
  selector: 'app-event-card',
  imports: [RouterLink, DatePipe, MatCardModule, MatIconModule],
  template: `
    <a [routerLink]="['/events', event().id]" class="card-link">
      <mat-card appearance="outlined" [class.past]="past()">
        <mat-card-header>
          <mat-card-subtitle class="category">{{ event().category.name }}</mat-card-subtitle>
          <mat-card-title>{{ event().title }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p class="description">{{ event().description || 'Без описания' }}</p>
          <div class="meta">
            <mat-icon>calendar_today</mat-icon>
            <span>
              {{ event().startDate | date: 'd MMM y' }}
              @if (event().endDate !== event().startDate) {
                — {{ event().endDate | date: 'd MMM y' }}
              }
            </span>
          </div>
          <div class="meta">
            <mat-icon>place</mat-icon>
            <span>{{ event().location.name }}, {{ event().location.city }}</span>
          </div>
          <div class="meta">
            <mat-icon>groups</mat-icon>
            <span>до {{ event().maxParticipants }} участников</span>
          </div>
          @if (past()) {
            <span class="status-chip off">Завершено</span>
          }
        </mat-card-content>
      </mat-card>
    </a>
  `,
  styles: `
    .card-link {
      display: block;
      height: 100%;
      color: inherit;
      text-decoration: none;
    }
    mat-card {
      height: 100%;
      transition:
        box-shadow 150ms,
        border-color 150ms;
    }
    mat-card:hover {
      border-color: var(--mat-sys-primary);
      box-shadow: var(--mat-sys-level2);
    }
    mat-card.past {
      opacity: 0.7;
    }
    .category {
      color: var(--mat-sys-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font: var(--mat-sys-label-small);
    }
    .description {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      color: var(--mat-sys-on-surface-variant);
      min-height: 2.8em;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
      font: var(--mat-sys-body-medium);
    }
    .meta mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
      color: var(--mat-sys-on-surface-variant);
    }
    .status-chip {
      margin-top: 8px;
    }
  `,
})
export class EventCard {
  readonly event = input.required<EventItem>();
  protected readonly past = computed(() => isPast(this.event().endDate));
}
