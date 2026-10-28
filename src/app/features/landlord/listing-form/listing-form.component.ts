import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import {
  LISTING_IMAGE_RULES,
  Listing,
  ListingImage,
  ListingRequest,
  ROOM_TYPE_OPTIONS,
  RoomType,
} from '../../../core/models/listing.model';
import { ListingService } from '../../../core/services/listing.service';
import { ToastService } from '../../../core/services/toast.service';
import { getApiErrorMessage, shouldToastHere } from '../../../core/utils/api-error';
import { getImageUrl } from '../../../core/utils/image-url';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '../../../shared/components/error-message/error-message.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { LandlordService } from '../landlord.service';

/** The longest text the backend can store in each text field (its database columns are 255 characters). */
const MAX_TEXT_LENGTH = 255;

/** The names of the form fields. They are also the names the backend uses in its 400 messages. */
type FieldName = 'title' | 'roomType' | 'location' | 'price' | 'contactInfo' | 'description';

/** One photo the landlord picked but that is not part of the listing yet (or was just uploaded). */
export interface PendingImage {
  /** Only used to tell the photos apart in the list. */
  key: number;
  file: File;
  /** A temporary address so the browser can show the photo before it is uploaded. */
  previewUrl: string;
  isPrimary: boolean;
  state: 'queued' | 'uploading' | 'done' | 'error';
  /** 0 to 100, only meaningful while uploading. */
  progress: number;
  /** Why this photo did not upload. */
  error: string;
}

/** The backend rejects text with only spaces (@NotBlank), and the plain "required" check lets those through. */
function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim() === '' ? { required: true } : null;
}

/**
 * /landlord/listings/new and /landlord/listings/:id/edit
 * One form for both. A new listing is created FIRST and its photos are uploaded one by one after that,
 * because the backend only accepts photos for a listing that already exists. If a photo fails the listing is
 * kept and the page offers "Retry upload".
 */
@Component({
  selector: 'app-listing-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ConfirmDialogComponent,
    EmptyStateComponent,
    ErrorMessageComponent,
    SkeletonComponent,
  ],
  templateUrl: './listing-form.component.html',
  styleUrl: './listing-form.component.css',
})
export class ListingFormComponent implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listingService = inject(ListingService);
  private readonly landlordService = inject(LandlordService);
  private readonly toast = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly roomTypes = ROOM_TYPE_OPTIONS;
  readonly maxTextLength = MAX_TEXT_LENGTH;
  readonly imageRules = LISTING_IMAGE_RULES;
  readonly acceptTypes = LISTING_IMAGE_RULES.allowedTypes.join(',');

  /** The id in the address (/:id/edit), or null for a new listing. */
  private readonly editId: number | null;
  readonly isEdit: boolean;

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, notBlank, Validators.maxLength(MAX_TEXT_LENGTH)]],
    roomType: ['' as RoomType | '', [Validators.required]],
    location: ['', [Validators.required, notBlank, Validators.maxLength(MAX_TEXT_LENGTH)]],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    contactInfo: ['', [Validators.required, notBlank, Validators.maxLength(MAX_TEXT_LENGTH)]],
    description: ['', [Validators.required, notBlank, Validators.maxLength(MAX_TEXT_LENGTH)]],
  });

  // ---------- Loading (edit mode) ----------
  readonly loading = signal(false);
  readonly loadError = signal('');
  /** The listing is not the landlord's, or it does not exist. */
  readonly notAllowed = signal(false);

  /** The listing as the backend has it. In edit mode it is loaded, after "create" it is the new listing. */
  readonly listing = signal<Listing | null>(null);
  /** The id once the listing exists in the backend. A second "Save" then edits it instead of creating another one. */
  readonly savedId = signal<number | null>(null);

  // ---------- Saving ----------
  readonly submitted = signal(false);
  readonly saving = signal(false);
  /** A message that belongs to no single field. */
  readonly formError = signal('');
  /** True when this save made the landlord's account active (the first listing). */
  readonly activated = signal(false);

  // ---------- Photos ----------
  readonly images = signal<PendingImage[]>([]);
  readonly rejected = signal<string[]>([]);
  readonly dragging = signal(false);
  private nextImageKey = 1;

  /** The listing already has a main photo, so every new photo is a secondary one. */
  readonly hasMainPhoto = computed(() => !!this.listing()?.primaryImageUrl);
  readonly existingPhotos = computed(() => {
    const listing = this.listing();
    if (!listing) {
      return [];
    }
    const primary = listing.primaryImageUrl ? [{ url: listing.primaryImageUrl, primary: true }] : [];
    return [...primary, ...listing.secondaryImageUrls.map((url) => ({ url, primary: false }))];
  });
  /** How many photos more the listing can take: 1 main (if it has none) + the free secondary places. */
  readonly freeSlots = computed(() => {
    const listing = this.listing();
    const secondary = listing?.secondaryImageUrls.length ?? 0;
    return (this.hasMainPhoto() ? 0 : 1) + (LISTING_IMAGE_RULES.maxSecondary - secondary);
  });
  /** Can the landlord still pick the main photo among the new ones? Not once the main photo is uploaded. */
  readonly canChoosePrimary = computed(
    () => !this.hasMainPhoto() && !this.images().some((image) => image.isPrimary && image.state === 'done'),
  );
  readonly failedImages = computed(() => this.images().filter((image) => image.state === 'error'));
  readonly uploading = computed(() => this.images().some((image) => image.state === 'uploading'));

  // ---------- Leaving the page ----------
  readonly leaveDialogOpen = signal(false);
  private leaveAnswer: ((leave: boolean) => void) | null = null;
  /** Set when the page leaves on purpose (after saving), so the "unsaved changes" question is skipped. */
  private leaveOnPurpose = false;

  /** Was the landlord already verified before this page? Only a new listing needs it (to spot the very first one). */
  private readonly verifiedBefore: Promise<boolean | null> | null;

  constructor() {
    const idText = this.route.snapshot.paramMap.get('id');
    this.isEdit = idText !== null;
    this.editId = idText === null ? null : Number(idText);

    inject(DestroyRef).onDestroy(() => this.images().forEach((image) => URL.revokeObjectURL(image.previewUrl)));

    if (this.isEdit) {
      this.verifiedBefore = null;
      this.loadListing();
    } else {
      // Asked now, before anything is created, so "first listing" can be told apart later
      this.verifiedBefore = firstValueFrom(this.landlordService.getProfile()).then(
        (profile) => profile.verified === true,
        () => null,
      );
    }
  }

  // ---------- Edit mode: load the listing ----------

  /** Reads the listing from the landlord's own list. Also used by the Retry button. */
  loadListing(): void {
    if (this.editId === null || Number.isNaN(this.editId)) {
      this.notAllowed.set(true);
      return;
    }
    this.loading.set(true);
    this.loadError.set('');

    this.listingService
      .findMyListing(this.editId)
      .then((listing) => {
        if (listing) {
          this.listing.set(listing);
          this.savedId.set(listing.id);
          this.fillForm(listing);
        } else {
          // Not in the landlord's own list: someone else's listing, or it was deleted
          this.notAllowed.set(true);
        }
        this.loading.set(false);
      })
      .catch((error) => {
        this.loadError.set(getApiErrorMessage(error));
        this.loading.set(false);
      });
  }

  private fillForm(listing: Listing): void {
    this.form.reset({
      title: listing.title,
      roomType: listing.roomType,
      location: listing.location,
      price: listing.price,
      contactInfo: listing.contactInfo,
      description: listing.description,
    });
  }

  // ---------- Errors next to the fields ----------

  /** The red text under a field, or '' when there is nothing to say. */
  errorText(name: FieldName): string {
    const control = this.form.controls[name];
    if (!control.errors || !(control.touched || this.submitted())) {
      return '';
    }
    const labels: Record<string, string> = {
      title: 'Title',
      roomType: 'Room type',
      location: 'Location',
      price: 'Price',
      contactInfo: 'Contact info',
      description: 'Description',
    };
    const label = labels[name];

    if (control.errors['server']) {
      return control.errors['server'];
    }
    if (control.errors['required']) {
      return name === 'roomType' ? 'Choose a room type.' : `${label} is required.`;
    }
    if (control.errors['min']) {
      return 'Price must be greater than zero.';
    }
    if (control.errors['maxlength']) {
      return `${label} can have at most ${MAX_TEXT_LENGTH} characters.`;
    }
    return 'Please check this field.';
  }

  // ---------- Save ----------

  async save(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.formError.set('');
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.formError.set('Please fix the fields marked in red.');
      // Move the keyboard to the first wrong field
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    this.saving.set(true);
    const request = this.buildRequest();
    const alreadySaved = this.savedId();
    let listingId: number;
    let firstSave = false;

    try {
      if (alreadySaved === null) {
        // Wait for the "was I verified" answer, so it is certain it was asked before the listing exists
        await this.verifiedBefore;
        const created = await firstValueFrom(this.listingService.createListing(request));
        listingId = created.id;
        firstSave = true;
        this.listing.set(created);
        this.savedId.set(created.id);
      } else {
        listingId = alreadySaved;
        this.listing.set(await firstValueFrom(this.listingService.updateListing(alreadySaved, request)));
      }
      // The text is safe in the backend now, so leaving no longer loses it
      this.form.markAsPristine();
    } catch (error) {
      this.showSaveError(error);
      this.saving.set(false);
      return;
    }

    // The very first listing makes the landlord verified: say so
    if (firstSave && (await this.becameVerified())) {
      this.activated.set(true);
    }

    const allUploaded = await this.uploadQueued(listingId);
    this.saving.set(false);

    if (allUploaded) {
      this.finish();
    } else {
      this.toast.error('Your listing was saved, but some photos did not upload.');
    }
  }

  /** Tries the photos that failed again. The listing is already saved, so only the photos are sent. */
  async retryUpload(): Promise<void> {
    const id = this.savedId();
    if (id === null || this.saving()) {
      return;
    }
    this.saving.set(true);
    const allUploaded = await this.uploadQueued(id);
    this.saving.set(false);

    if (allUploaded) {
      this.finish();
    }
  }

  /** "Skip the photos": go to the list, the listing stays as it is. */
  skipPhotos(): void {
    this.finish();
  }

  /** All done: go back to My listings. The "account is now active" message travels with the navigation. */
  private finish(): void {
    this.leaveOnPurpose = true;
    if (!this.activated()) {
      this.toast.success(this.isEdit ? 'Listing updated.' : 'Listing created.');
    }
    this.router.navigate(['/landlord/listings'], { state: { activated: this.activated() } });
  }

  private buildRequest(): ListingRequest {
    const value = this.form.getRawValue();
    return {
      title: value.title.trim(),
      description: value.description.trim(),
      location: value.location.trim(),
      price: Number(value.price),
      roomType: value.roomType as RoomType,
      contactInfo: value.contactInfo.trim(),
    };
  }

  /** True when the landlord was not verified before and is now. */
  private async becameVerified(): Promise<boolean> {
    if ((await this.verifiedBefore) !== false) {
      return false;
    }
    try {
      const profile = await firstValueFrom(this.landlordService.getProfile());
      return profile.verified === true;
    } catch {
      return false;
    }
  }

  private showSaveError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { messages?: Record<string, string> } | null;

      // 400: the backend says which field is wrong. Put each message next to its own field.
      if (error.status === 400 && body?.messages) {
        const leftOver: string[] = [];
        for (const [field, message] of Object.entries(body.messages)) {
          const control = this.form.get(field);
          if (control) {
            control.setErrors({ server: message });
            control.markAsTouched();
          } else {
            leftOver.push(message);
          }
        }
        this.formError.set(leftOver.length > 0 ? leftOver.join('. ') : 'Please fix the fields marked in red.');
        return;
      }

      // 409: another listing already has this title (the only conflict create and edit can have)
      if (error.status === 409) {
        const control = this.form.controls.title;
        control.setErrors({ server: getApiErrorMessage(error) });
        control.markAsTouched();
        this.formError.set('Please fix the fields marked in red.');
        setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#title')?.focus());
        return;
      }

      // 403 / 404 while editing: it is not this landlord's listing, or it is gone
      if (this.isEdit && (error.status === 403 || error.status === 404)) {
        this.notAllowed.set(true);
        return;
      }
    }

    // No connection, 403 and server errors already got a toast from error.interceptor.ts
    if (shouldToastHere(error)) {
      this.formError.set(getApiErrorMessage(error));
    }
  }

  // ---------- Photos: choosing ----------

  onFilesChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files ? Array.from(input.files) : []);
    // Empty the input, otherwise choosing the same file again would do nothing
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    this.addFiles(event.dataTransfer ? Array.from(event.dataTransfer.files) : []);
  }

  /** Checks each file with the backend's rules. The good ones are added, for the others a clear message is shown. */
  private addFiles(files: File[]): void {
    const problems: string[] = [];
    const accepted: PendingImage[] = [];
    let room = this.freeSlots() - this.images().length;

    for (const file of files) {
      if (!LISTING_IMAGE_RULES.allowedTypes.includes(file.type)) {
        problems.push(`"${file.name}" was not added: only JPG and PNG photos are allowed.`);
      } else if (file.size > LISTING_IMAGE_RULES.maxBytes) {
        problems.push(
          `"${file.name}" was not added: it is ${this.formatSize(file.size)} and the largest allowed photo is 2 MB.`,
        );
      } else if (room <= 0) {
        problems.push(`"${file.name}" was not added: this listing cannot have more photos.`);
      } else {
        room--;
        accepted.push({
          key: this.nextImageKey++,
          file,
          previewUrl: URL.createObjectURL(file),
          isPrimary: false,
          state: 'queued',
          progress: 0,
          error: '',
        });
      }
    }

    this.rejected.set(problems);
    if (accepted.length > 0) {
      this.images.update((list) => this.withOnePrimary([...list, ...accepted]));
    }
  }

  dismissRejected(): void {
    this.rejected.set([]);
  }

  /** The landlord picks which new photo is the main one. */
  makePrimary(image: PendingImage): void {
    if (!this.canChoosePrimary() || image.state === 'done') {
      return;
    }
    this.images.update((list) => list.map((item) => ({ ...item, isPrimary: item.key === image.key })));
  }

  removeImage(image: PendingImage): void {
    URL.revokeObjectURL(image.previewUrl);
    this.rejected.set([]);
    this.images.update((list) => this.withOnePrimary(list.filter((item) => item.key !== image.key)));
  }

  /**
   * Keeps the rule "exactly one main photo": when the listing has none yet, one of the new photos is the main
   * one (the first, unless the landlord chose another). When the listing already has one, no new photo is.
   */
  private withOnePrimary(list: PendingImage[]): PendingImage[] {
    if (this.hasMainPhoto()) {
      return list.map((item) => ({ ...item, isPrimary: false }));
    }
    if (list.length === 0 || list.some((item) => item.isPrimary)) {
      return list;
    }
    return list.map((item, index) => ({ ...item, isPrimary: index === 0 }));
  }

  // ---------- Photos: uploading ----------

  /**
   * Sends the photos that are waiting (or failed before), one at a time, the main photo first.
   * A photo that fails does not stop the others. Returns true when no photo is left over.
   */
  private async uploadQueued(listingId: number): Promise<boolean> {
    const waiting = this.images()
      .filter((image) => image.state === 'queued' || image.state === 'error')
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

    for (const image of waiting) {
      this.updateImage(image.key, { state: 'uploading', progress: 0, error: '' });
      try {
        const last = await lastValueFrom(
          this.listingService.uploadImage(listingId, image.file, image.isPrimary).pipe(
            tap((event) => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                this.updateImage(image.key, { progress: Math.round((100 * event.loaded) / event.total) });
              }
            }),
          ),
        );
        const uploaded = last instanceof HttpResponse ? (last.body as ListingImage | null) : null;
        this.updateImage(image.key, { state: 'done', progress: 100 });
        if (uploaded) {
          this.addUploadedToListing(uploaded);
        }
      } catch (error) {
        this.updateImage(image.key, { state: 'error', error: getApiErrorMessage(error) });
      }
    }

    return this.failedImages().length === 0;
  }

  private updateImage(key: number, changes: Partial<PendingImage>): void {
    this.images.update((list) => list.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }

  /** Keeps the "existing photos" and the free places right after an upload. */
  private addUploadedToListing(uploaded: ListingImage): void {
    this.listing.update((listing) => {
      if (!listing) {
        return listing;
      }
      return uploaded.isPrimary
        ? { ...listing, primaryImageUrl: uploaded.url }
        : { ...listing, secondaryImageUrls: [...listing.secondaryImageUrls, uploaded.url] };
    });
  }

  existingSrc(url: string): string | null {
    return getImageUrl(url);
  }

  formatSize(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  // ---------- Leaving the page with unsaved work ----------

  /** True when there is something typed or picked that is not saved yet. */
  hasUnsavedChanges(): boolean {
    if (this.leaveOnPurpose || this.notAllowed()) {
      return false;
    }
    return this.form.dirty || this.images().some((image) => image.state !== 'done');
  }

  /** Called by unsavedChangesGuard before the user leaves. Asks first when there is unsaved work. */
  canLeave(): boolean | Promise<boolean> {
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    this.leaveDialogOpen.set(true);
    return new Promise<boolean>((resolve) => (this.leaveAnswer = resolve));
  }

  answerLeave(leave: boolean): void {
    this.leaveDialogOpen.set(false);
    this.leaveAnswer?.(leave);
    this.leaveAnswer = null;
  }

  // Closing the tab or reloading: the browser shows its own "Leave site?" question
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }
}
