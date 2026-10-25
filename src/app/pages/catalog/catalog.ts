import { Component, inject } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { CategoriesApi, LocationsApi } from '../../core/api';
import { EntityField } from '../../shared/entity-dialog';
import { CrudTable } from './crud-table';

const CATEGORY_FIELDS: EntityField[] = [{ key: 'name', label: 'Название', required: true }];

const LOCATION_FIELDS: EntityField[] = [
  { key: 'name', label: 'Название', required: true },
  { key: 'city', label: 'Город', required: true },
  { key: 'address', label: 'Адрес', required: true },
  { key: 'capacity', label: 'Вместимость', type: 'number', required: true, min: 1 },
];

@Component({
  selector: 'app-catalog',
  imports: [MatTabsModule, CrudTable],
  template: `
    <div class="page-header">
      <h1>Справочники</h1>
    </div>
    <mat-tab-group mat-stretch-tabs="false" animationDuration="150ms">
      <mat-tab label="Категории">
        <app-crud-table [api]="categories" [fields]="categoryFields" entityName="категория" />
      </mat-tab>
      <mat-tab label="Локации">
        <app-crud-table [api]="locations" [fields]="locationFields" entityName="локация" />
      </mat-tab>
    </mat-tab-group>
  `,
})
export class Catalog {
  protected readonly categories = inject(CategoriesApi);
  protected readonly locations = inject(LocationsApi);
  protected readonly categoryFields = CATEGORY_FIELDS;
  protected readonly locationFields = LOCATION_FIELDS;
}
