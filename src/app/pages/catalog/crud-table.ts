import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, Observable, switchMap } from 'rxjs';
import { Page } from '../../core/models';
import { Notify } from '../../core/notify';
import { confirm } from '../../shared/confirm-dialog';
import { EntityField, openEntityDialog } from '../../shared/entity-dialog';

export interface CrudApi<T> {
  page(page: number, size: number): Observable<Page<T>>;
  create(body: Partial<T>): Observable<T>;
  update(id: number, body: Partial<T>): Observable<T>;
  delete(id: number): Observable<void>;
}

type Row = { id: number } & Record<string, unknown>;

// Таблица справочника с созданием, изменением и удалением через диалог
@Component({
  selector: 'app-crud-table',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="bar">
      <button matButton="filled" (click)="edit()">
        <mat-icon>add</mat-icon>
        Добавить
      </button>
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (rows().length) {
      <div class="table-wrap">
        <table mat-table [dataSource]="rows()">
          @for (f of fields(); track f.key) {
            <ng-container [matColumnDef]="f.key">
              <th mat-header-cell *matHeaderCellDef>{{ f.label }}</th>
              <td mat-cell *matCellDef="let row">{{ row[f.key] }}</td>
            </ng-container>
          }
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row" class="row-actions">
              <button matIconButton matTooltip="Изменить" (click)="edit(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button matIconButton matTooltip="Удалить" (click)="remove(row)">
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
        <mat-icon>inbox</mat-icon>
        <p>Записей пока нет</p>
      </div>
    }
  `,
  styles: `
    .bar {
      display: flex;
      justify-content: flex-end;
      margin: 16px 0;
    }
    mat-paginator {
      background: transparent;
    }
  `,
})
export class CrudTable<T extends { id: number }> implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);

  readonly api = input.required<CrudApi<T>>();
  readonly fields = input.required<EntityField[]>();
  readonly entityName = input.required<string>();

  protected readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(false);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly columns = computed(() => [...this.fields().map((f) => f.key), 'actions']);

  ngOnInit(): void {
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.load();
  }

  edit(row?: Row): void {
    openEntityDialog<Partial<T>>(this.dialog, {
      title: row ? `Изменить: ${this.entityName()}` : `Новая запись: ${this.entityName()}`,
      fields: this.fields(),
      value: row,
    })
      .pipe(
        filter(Boolean),
        switchMap((v) => (row ? this.api().update(row.id, v) : this.api().create(v))),
      )
      .subscribe({
        next: () => {
          this.notify.success('Сохранено');
          this.load();
        },
        error: (err) => this.notify.error(err),
      });
  }

  remove(row: Row): void {
    confirm(this.dialog, {
      title: 'Удалить запись?',
      message: `«${row['name'] ?? row.id}» будет удалена. Если она используется мероприятиями, сервер откажет.`,
      confirm: 'Удалить',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api().delete(row.id)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Удалено');
          this.load();
        },
        error: (err) => this.notify.error(err),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.api()
      .page(this.pageIndex(), this.pageSize())
      .subscribe({
        next: (page) => {
          this.rows.set(page.content as unknown as Row[]);
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
