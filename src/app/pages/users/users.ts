import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { UsersApi } from '../../core/api';
import { AuthService } from '../../core/auth';
import { User } from '../../core/models';
import { Notify } from '../../core/notify';
import { confirm } from '../../shared/confirm-dialog';

@Component({
  selector: 'app-users',
  imports: [
    DatePipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Пользователи</h1>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="table-wrap">
      <table mat-table [dataSource]="users()">
        <ng-container matColumnDef="id">
          <th mat-header-cell *matHeaderCellDef>ID</th>
          <td mat-cell *matCellDef="let u">{{ u.id }}</td>
        </ng-container>
        <ng-container matColumnDef="username">
          <th mat-header-cell *matHeaderCellDef>Логин</th>
          <td mat-cell *matCellDef="let u">{{ u.username }}</td>
        </ng-container>
        <ng-container matColumnDef="fullName">
          <th mat-header-cell *matHeaderCellDef>Имя</th>
          <td mat-cell *matCellDef="let u">{{ u.fullName }}</td>
        </ng-container>
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let u">{{ u.email }}</td>
        </ng-container>
        <ng-container matColumnDef="phone">
          <th mat-header-cell *matHeaderCellDef>Телефон</th>
          <td mat-cell *matCellDef="let u">{{ u.phone }}</td>
        </ng-container>
        <ng-container matColumnDef="roleId">
          <th mat-header-cell *matHeaderCellDef>ID роли</th>
          <td mat-cell *matCellDef="let u">{{ u.roleId }}</td>
        </ng-container>
        <ng-container matColumnDef="createdAt">
          <th mat-header-cell *matHeaderCellDef>Создан</th>
          <td mat-cell *matCellDef="let u">{{ u.createdAt | date: 'd MMM y' }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u" class="row-actions">
            @if (u.id !== auth.user()?.id) {
              <button matIconButton matTooltip="Удалить" (click)="remove(u)">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>

    <mat-paginator
      [length]="total()"
      [pageIndex]="pageIndex()"
      [pageSize]="pageSize()"
      [pageSizeOptions]="[10, 25, 50]"
      (page)="onPage($event)"
    />
  `,
  styles: `
    mat-paginator {
      background: transparent;
    }
  `,
})
export class Users implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(UsersApi);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);

  protected readonly users = signal<User[]>([]);
  protected readonly loading = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly columns = [
    'id',
    'username',
    'fullName',
    'email',
    'phone',
    'roleId',
    'createdAt',
    'actions',
  ];

  ngOnInit(): void {
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  remove(u: User): void {
    confirm(this.dialog, {
      title: 'Удалить пользователя?',
      message: `Пользователь «${u.username}» будет удалён. Его заказы останутся в системе.`,
      confirm: 'Удалить',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(u.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Пользователь удалён');
          this.load();
        },
        error: (err) => this.notify.error(err),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api.page(this.pageIndex(), this.pageSize()).subscribe({
      next: (page) => {
        this.users.set(page.content);
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
