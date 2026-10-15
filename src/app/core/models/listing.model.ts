/** Must match the backend enum RoomType. */
export type RoomType = 'BEDSITTER' | 'STUDIO' | 'ONE_BEDROOM' | 'TWO_BEDROOM';

/** Must match the backend enum ListingStatus. */
export type ListingStatus = 'AVAILABLE' | 'OCCUPIED';

/** The friendly name of each room type, for screens. */
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  BEDSITTER: 'Bedsitter',
  STUDIO: 'Studio',
  ONE_BEDROOM: 'One bedroom',
  TWO_BEDROOM: 'Two bedroom',
};

/** The room types as a list (value + label), for dropdowns. */
export const ROOM_TYPE_OPTIONS = (Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((value) => ({
  value,
  label: ROOM_TYPE_LABELS[value],
}));

/**
 * A rental listing, exactly as the backend sends it (ListingResponseDto).
 * The landlord's phone, email and ID number are never included, only the first name.
 */
export interface Listing {
  id: number;
  title: string;
  description: string;
  location: string;
  /** Rent per month in KES. */
  price: number;
  roomType: RoomType;
  contactInfo: string;
  status: ListingStatus;
  landlordFirstName: string | null;
  /** A path such as /uploads/listings/abc.jpg, or null when the listing has no photo yet. */
  primaryImageUrl: string | null;
  secondaryImageUrls: string[];
  /** ISO date-time, or null for old listings created before the backend stored it. */
  createdAt: string | null;
}
