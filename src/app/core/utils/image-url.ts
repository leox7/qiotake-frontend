import { environment } from '../../../environments/environment';

/**
 * The backend sends photo addresses without a website name, for example "/uploads/listings/abc.jpg".
 * A browser needs the full address, so this puts the backend's address in front.
 * Returns null when the listing has no photo.
 */
export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }
  return environment.imageBaseUrl + path;
}
