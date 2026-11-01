import { Component, effect, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Ограничения совпадают с бэкендом (event-service, EventServiceImpl)
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

// Поле картинки с drag & drop.
// value: File — выбран новый файл, string — URL уже загруженной картинки, null — картинки нет
@Component({
  selector: 'app-image-drop',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <input
      #fileInput
      type="file"
      hidden
      [accept]="accept"
      (change)="onPick(fileInput.files); fileInput.value = ''"
    />

    @if (preview(); as url) {
      <div class="preview">
        <img [src]="url" alt="Картинка мероприятия" />
        <div class="preview-actions">
          <button matButton="tonal" type="button" (click)="fileInput.click()">
            <mat-icon>swap_horiz</mat-icon>
            Заменить
          </button>
          <button matButton="tonal" type="button" class="danger" (click)="value.set(null)">
            <mat-icon>delete</mat-icon>
            Убрать
          </button>
        </div>
      </div>
    } @else {
      <div
        class="zone"
        role="button"
        tabindex="0"
        [class.dragging]="dragging()"
        (click)="fileInput.click()"
        (keydown.enter)="fileInput.click()"
        (keydown.space)="$event.preventDefault(); fileInput.click()"
        (dragenter)="onDragOver($event)"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <mat-icon>add_photo_alternate</mat-icon>
        <div class="title">Перетащите картинку сюда или нажмите, чтобы выбрать</div>
        <div class="hint">JPEG, PNG, WebP или GIF, до 5 МБ</div>
      </div>
    }

    @if (error(); as message) {
      <p class="error">{{ message }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 16px;
    }
    .zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 180px;
      padding: 24px;
      border: 2px dashed var(--mat-sys-outline-variant);
      border-radius: var(--mat-sys-corner-medium);
      color: var(--mat-sys-on-surface-variant);
      text-align: center;
      cursor: pointer;
      transition:
        border-color 150ms,
        background-color 150ms;
    }
    .zone:hover,
    .zone:focus-visible {
      border-color: var(--mat-sys-primary);
      outline: none;
    }
    .zone.dragging {
      border-color: var(--mat-sys-primary);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .zone mat-icon {
      width: 40px;
      height: 40px;
      font-size: 40px;
    }
    .title {
      font: var(--mat-sys-body-large);
    }
    .hint {
      font: var(--mat-sys-body-small);
    }
    .preview {
      position: relative;
      border-radius: var(--mat-sys-corner-medium);
      overflow: hidden;
      background: var(--mat-sys-surface-container);
    }
    .preview img {
      display: block;
      width: 100%;
      max-height: 320px;
      object-fit: cover;
    }
    .preview-actions {
      position: absolute;
      right: 8px;
      bottom: 8px;
      display: flex;
      gap: 8px;
    }
    .danger {
      color: var(--mat-sys-error);
    }
    .error {
      margin: 8px 0 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class ImageDrop {
  readonly value = model<File | string | null>(null);

  protected readonly accept = IMAGE_TYPES.join(',');
  protected readonly dragging = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<string | null>(null);

  constructor() {
    // для нового файла — временный blob:-URL, освобождается при смене значения
    effect((onCleanup) => {
      const v = this.value();
      if (v instanceof File) {
        const url = URL.createObjectURL(v);
        this.preview.set(url);
        onCleanup(() => URL.revokeObjectURL(url));
      } else {
        this.preview.set(v);
      }
    });
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault(); // без этого браузер не даст бросить файл и откроет его сам
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    // dragleave приходит и при переходе на дочерний элемент зоны
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.onPick(event.dataTransfer?.files ?? null);
  }

  protected onPick(files: FileList | null): void {
    const file = files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      this.error.set('Поддерживаются только JPEG, PNG, WebP и GIF');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('Файл больше 5 МБ');
      return;
    }
    this.error.set(null);
    this.value.set(file);
  }
}
