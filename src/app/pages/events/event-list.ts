import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { EventsApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { EventItem } from '../../core/models';
import { Notify } from '../../core/notify';
import { EventCard } from './event-card';

@Component({
  selector: 'app-event-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    MatProgressBarModule,
    EventCard,
  ],
  template: `
    <div class="page-header">
      <h1>Мероприятия</h1>
      @if (auth.isManager()) {
        <a matButton="filled" routerLink="/events/new">
          <mat-icon>add</mat-icon>
          Создать
        </a>
      }
    </div>

    <div class="toolbar">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Поиск по названию</mat-label>
        <input matInput [formControl]="query" />
        @if (query.value) {
          <button matIconButton matSuffix aria-label="Очистить" (click)="query.setValue('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (events().length) {
      <div class="grid">
        @for (event of events(); track event.id) {
          <app-event-card [event]="event" />
        }
      </div>
    } @else if (!loading()) {
      <div class="empty-state">
        <mat-icon>event_busy</mat-icon>
        <p>{{ query.value ? 'Ничего не найдено' : 'Мероприятий пока нет' }}</p>
      </div>
    }

    @if (!query.value && total() > pageSize()) {
      <mat-paginator
        [length]="total()"
        [pageIndex]="pageIndex()"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[6, 12, 24]"
        (page)="onPage($event)"
      />
    }
  `,
  styleUrl: './events.scss',
})
export class EventList implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(EventsApi);
  private readonly notify = inject(Notify);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly events = signal<EventItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(12);

  ngOnInit(): void {
    this.load();
    this.query.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  private load(): void {
    const q = this.query.value.trim();
    this.loading.set(true);
    if (q) {
      this.api.search(q).subscribe({
        next: (list) => {
          this.events.set(list);
          this.total.set(list.length);
          this.loading.set(false);
        },
        error: (err) => this.fail(err),
      });
    } else {
      this.api.page(this.pageIndex(), this.pageSize()).subscribe({
        next: (page) => {
          this.events.set(page.content);
          this.total.set(page.page.totalElements);
          this.loading.set(false);
        },
        error: (err) => this.fail(err),
      });
    }
  }

  private fail(err: unknown): void {
    this.loading.set(false);
    this.notify.error(err);
  }
}
