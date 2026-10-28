import { Component, computed, input, signal } from '@angular/core';
import { Listing } from '../../../core/models/listing.model';
import { getImageUrl } from '../../../core/utils/image-url';
import { PhotoLightboxComponent } from '../photo-lightbox/photo-lightbox.component';

/**
 * The photos at the top of a listing page.
 *   <app-listing-gallery [listing]="listing" />
 * Computer: one big photo on the left and up to two small ones on the right.
 * Phone: one big photo at a time, swipe sideways for the next one (plain CSS scrolling).
 * Clicking a photo or "View all N photos" opens the full screen viewer (lightbox).
 */
@Component({
  selector: 'app-listing-gallery',
  imports: [PhotoLightboxComponent],
  templateUrl: './listing-gallery.component.html',
  styleUrl: './listing-gallery.component.css',
})
export class ListingGalleryComponent {
  readonly listing = input.required<Listing>();

  // Photos whose file could not be loaded. We hide them instead of showing a broken picture.
  private readonly brokenPhotos = signal<string[]>([]);

  /** All photos as full addresses: the primary one first, then the others. */
  readonly photos = computed(() => {
    const listing = this.listing();
    const paths = [listing.primaryImageUrl, ...listing.secondaryImageUrls];

    const urls: string[] = [];
    for (const path of paths) {
      const url = getImageUrl(path);
      if (url && !this.brokenPhotos().includes(url)) {
        urls.push(url);
      }
    }
    return urls;
  });

  /** Which photo the lightbox opens on, or null when the lightbox is closed. */
  readonly openAt = signal<number | null>(null);

  // The button (or photo) that opened the lightbox, so the focus can go back to it on close.
  private opener: HTMLElement | null = null;

  open(index: number, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.openAt.set(index);
  }

  close(): void {
    this.openAt.set(null);
    // Keyboard users continue from where they were, not from the top of the page.
    this.opener?.focus();
  }

  onPhotoError(url: string): void {
    this.brokenPhotos.update((list) => [...list, url]);
  }
}
