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
 * What a visitor can filter the browse page by. Only things the backend can really apply:
 * GET /api/listings takes keyword, roomType (ONE value), status, minPrice and maxPrice.
 */
export interface ListingFilters {
  /** Free text, the backend looks for it in the title and the location. '' means no filter. */
  location: string;
  /** '' means any room type. */
  roomType: RoomType | '';
  /** Highest rent per month in KES. null means no limit. */
  maxPrice: number | null;
  /** true means only homes with status AVAILABLE. */
  availableOnly: boolean;
}

/** No filter at all. */
export const NO_FILTERS: ListingFilters = {
  location: '',
  roomType: '',
  maxPrice: null,
  availableOnly: false,
};

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
  /** Average of the students' star ratings, rounded to one decimal. null when nobody has reviewed it yet. */
  averageRating: number | null;
  reviewCount: number;
}

/**
 * What a landlord sends to POST and PUT /api/listings (ListingRequestDto).
 * The id, status and landlord are never sent: the server sets them.
 */
export interface ListingRequest {
  title: string;
  description: string;
  location: string;
  /** Rent per month in KES. Must be more than 0. */
  price: number;
  roomType: RoomType;
  /** How students can reach the landlord about this home. */
  contactInfo: string;
}

/** What the backend answers after one photo is uploaded (ListingImageResponseDto). */
export interface ListingImage {
  id: number;
  /** A path such as /uploads/listings/abc.jpg */
  url: string;
  isPrimary: boolean;
}

/**
 * The photo rules of the backend (ListingImageService), repeated here so the form can check a file
 * before sending it. If the backend changes them, change them here too.
 */
export const LISTING_IMAGE_RULES = {
  /** The backend only accepts JPG and PNG. */
  allowedTypes: ['image/jpeg', 'image/png'],
  maxBytes: 2 * 1024 * 1024,
  /** A listing has ONE primary photo and at most this many secondary ones. */
  maxSecondary: 4,
};

/** One row of the home page numbers: how many homes of this type are free, and the cheapest rent. */
export interface RoomTypeSummary {
  roomType: RoomType;
  availableCount: number;
  /** Rent per month in KES, or null when no home of this type is available. */
  lowestPrice: number | null;
}

/** GET /api/listings/summary (ListingSummaryDto). Public. There is one row for every room type. */
export interface ListingSummary {
  totalAvailable: number;
  roomTypes: RoomTypeSummary[];
}
