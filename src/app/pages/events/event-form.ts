import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CategoriesApi, EventsApi, LocationsApi } from '../../core/api';
import { fromIsoDate, toIsoDate } from '../../core/dates';
import { Category, EventRequest, Location } from '../../core/models';
import { Notify } from '../../core/notify';

function dateRange(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as Date | null;
  const end = group.get('endDate')?.value as Date | null;
  return start && end && end < start ? { range: true } : null;
}

@Component({
  selector: 'app-event-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ id() ? 'Редактирование мероприятия' : 'Новое мероприятие' }}</h1>
    </div>

    <mat-card appearance="outlined">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field class="full-width">
            <mat-label>Название</mat-label>
            <input matInput formControlName="title" />
            <mat-error>Введите название</mat-error>
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Описание</mat-label>
            <textarea matInput formControlName="description" rows="4"></textarea>
          </mat-form-field>

          <div class="form-grid">
            <mat-form-field>
              <mat-label>Период проведения</mat-label>
              <mat-date-range-input [rangePicker]="picker">
                <input matStartDate formControlName="startDate" placeholder="Начало" />
                <input matEndDate formControlName="endDate" placeholder="Окончание" />
              </mat-date-range-input>
              <mat-datepicker-toggle matIconSuffix [for]="picker" />
              <mat-date-range-picker #picker />
              <mat-hint>ДД.ММ.ГГГГ – ДД.ММ.ГГГГ</mat-hint>
              <mat-error>Укажите даты начала и окончания</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Категория</mat-label>
              <mat-select formControlName="categoryId">
                @for (c of categories(); track c.id) {
                  <mat-option [value]="c.id">{{ c.name }}</mat-option>
                }
              </mat-select>
              @if (!categories().length && !loading()) {
                <mat-hint
                  >Сначала создайте категорию в <a routerLink="/catalog">справочниках</a></mat-hint
                >
              }
              <mat-error>Выберите категорию</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Локация</mat-label>
              <mat-select formControlName="locationId">
                @for (l of locations(); track l.id) {
                  <mat-option [value]="l.id"
                    >{{ l.name }} · {{ l.city }} ({{ l.capacity }} мест)</mat-option
                  >
                }
              </mat-select>
              @if (!locations().length && !loading()) {
                <mat-hint
                  >Сначала создайте локацию в <a routerLink="/catalog">справочниках</a></mat-hint
                >
              }
              <mat-error>Выберите локацию</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Максимум участников</mat-label>
              <input matInput type="number" min="1" formControlName="maxParticipants" />
              <mat-hint>
                @if (selectedLocation(); as l) {
                  Не больше {{ l.capacity }}; пусто — вместимость локации
                } @else {
                  Пусто — вместимость локации
                }
              </mat-hint>
              <mat-error>Должно быть больше 0</mat-error>
            </mat-form-field>
          </div>

          @if (form.hasError('range')) {
            <p class="error">Дата окончания раньше даты начала</p>
          }

          <div class="actions">
            <a matButton [routerLink]="id() ? ['/events', id()] : '/events'">Отмена</a>
            <button matButton="filled" type="submit" [disabled]="saving()">
              {{ id() ? 'Сохранить' : 'Создать' }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    mat-card-content {
      padding-top: 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class EventForm implements OnInit {
  private readonly events = inject(EventsApi);
  private readonly categoriesApi = inject(CategoriesApi);
  private readonly locationsApi = inject(LocationsApi);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly locations = signal<Location[]>([]);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      title: ['', Validators.required],
      description: [''],
      startDate: [null as Date | null, Validators.required],
      endDate: [null as Date | null, Validators.required],
      categoryId: [null as number | null, Validators.required],
      locationId: [null as number | null, Validators.required],
      maxParticipants: [null as number | null, Validators.min(1)],
    },
    { validators: dateRange },
  );

  private readonly locationId = toSignal(this.form.controls.locationId.valueChanges);
  protected readonly selectedLocation = computed(() =>
    this.locations().find((l) => l.id === this.locationId()),
  );

  ngOnInit(): void {
    forkJoin([this.categoriesApi.page(0, 1000), this.locationsApi.page(0, 1000)]).subscribe({
      next: ([categories, locations]) => {
        this.categories.set(categories.content);
        this.locations.set(locations.content);
        const id = this.id();
        if (id) this.loadEvent(Number(id));
        else this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }

  private loadEvent(id: number): void {
    this.events.get(id).subscribe({
      next: (e) => {
        this.form.setValue({
          title: e.title,
          description: e.description ?? '',
          startDate: fromIsoDate(e.startDate),
          endDate: fromIsoDate(e.endDate),
          categoryId: e.category.id,
          locationId: e.location.id,
          maxParticipants: e.maxParticipants,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: EventRequest = {
      title: v.title.trim(),
      description: v.description.trim() || null,
      startDate: toIsoDate(v.startDate!),
      endDate: toIsoDate(v.endDate!),
      categoryId: v.categoryId!,
      locationId: v.locationId!,
      maxParticipants: v.maxParticipants || null,
    };
    const id = this.id();
    this.saving.set(true);
    (id ? this.events.update(Number(id), body) : this.events.create(body)).subscribe({
      next: (e) => {
        this.notify.success(id ? 'Изменения сохранены' : 'Мероприятие создано');
        this.router.navigate(['/events', e.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err);
      },
    });
  }
}
