import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { RegistrationsApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { Registration } from '../../core/models';
import { Notify } from '../../core/notify';
import { confirm } from '../../shared/confirm-dialog';

@Component({
  selector: 'app-registrations',
  imports: [
    DatePipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ auth.isAdmin() ? 'Все регистрации' : 'Мои регистрации' }}</h1>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (registrations().length) {
      <div class="table-wrap">
        <table mat-table [dataSource]="registrations()">
          <ng-container matColumnDef="event">
            <th mat-header-cell *matHeaderCellDef>Мероприятие</th>
            <td mat-cell *matCellDef="let r">
              <a [routerLink]="['/events', r.eventId]">{{ r.eventTitle }}</a>
            </td>
          </ng-container>
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>Пользователь</th>
            <td mat-cell *matCellDef="let r">ID {{ r.userId }}</td>
          </ng-container>
          <ng-container matColumnDef="item">
            <th mat-header-cell *matHeaderCellDef>Позиция заказа</th>
            <td mat-cell *matCellDef="let r">#{{ r.orderItemId }}</td>
          </ng-container>
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Дата</th>
            <td mat-cell *matCellDef="let r">{{ r.registrationDate | date: 'd MMM y, HH:mm' }}</td>
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
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r" class="row-actions">
              @if (r.status === 'CONFIRMED') {
                <button matIconButton matTooltip="Отменить регистрацию" (click)="cancel(r)">
                  <mat-icon>event_busy</mat-icon>
                </button>
              }
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
        <mat-icon>how_to_reg</mat-icon>
        <p>Регистраций пока нет. Выберите мероприятие и зарегистрируйтесь по купленному билету.</p>
        <a matButton="tonal" routerLink="/events">К мероприятиям</a>
      </div>
    }
  `,
  styles: `
    a {
      color: var(--mat-sys-primary);
    }
    mat-paginator {
      background: transparent;
    }
  `,
})
export class Registrations implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(RegistrationsApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);

  protected readonly registrations = signal<Registration[]>([]);
  protected readonly loading = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);

  protected readonly columns = computed(() =>
    this.auth.isAdmin()
      ? ['event', 'user', 'item', 'date', 'status', 'actions']
      : ['event', 'item', 'date', 'status', 'actions'],
  );

  ngOnInit(): void {
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  cancel(r: Registration): void {
    confirm(this.dialog, {
      title: 'Отменить регистрацию?',
      message: `Место на «${r.eventTitle}» освободится.`,
      confirm: 'Отменить регистрацию',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.cancel(r.id)),
      )
      .subscribe({
        next: (updated) => {
          this.registrations.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
          this.notify.success('Регистрация отменена');
        },
        error: (err) => this.notify.error(err),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.page(this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.registrations.set(page.content);
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
