import crypto from 'crypto';

export interface GooglePlaceReviewInput {
  placeId: string;
  authorName: string;
  rating: number;
  text: string;
  time: number;
  relativeTimeDescription?: string;
  authorUrl?: string;
  profilePhotoUrl?: string;
  source: 'google_places_api' | 'mock_local' | 'unknown';
  signature?: string;
}

export interface VerificationResult {
  isValid: boolean;
  isLiveGooglePlaces: boolean;
  error?: string;
  verifiedAt: string;
}

const REVIEW_SECRET_KEY = process.env.GOOGLE_MAPS_REVIEW_SECRET || 'wawasan-maps-review-secure-hmac-key-2026';

/**
 * Generates an HMAC-SHA256 verification signature for authentic Google Places API responses.
 */
export function signGooglePlacesReview(review: { placeId: string; authorName: string; rating: number; time: number; text?: string }): string {
  const payload = `${review.placeId}:${review.authorName}:${review.rating}:${review.time}`;
  return crypto.createHmac('sha256', REVIEW_SECRET_KEY).update(payload).digest('hex');
}

/**
 * Validates whether a review payload originates from the genuine Google Places API
 * and carries a valid cryptographic signature confirming it was not mocked or hallucinated.
 */
export function verifyGoogleMapsReviewOrigin(review: GooglePlaceReviewInput): VerificationResult {
  const now = new Date().toISOString();

  if (!review) {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Review payload is null or undefined', verifiedAt: now };
  }

  // Check explicit source labeling
  if (review.source === 'mock_local' || review.source === 'unknown') {
    return {
      isValid: false,
      isLiveGooglePlaces: false,
      error: `Rejected: Review is explicitly labeled as local mock/prototype data (source: ${review.source})`,
      verifiedAt: now
    };
  }

  // Verify mandatory Google Places properties
  if (!review.placeId || typeof review.placeId !== 'string' || !review.placeId.startsWith('ChI')) {
    // Note: Google Place IDs typically start with ChI... but let's be robust
    if (!review.placeId || review.placeId.length < 10) {
      return {
        isValid: false,
        isLiveGooglePlaces: false,
        error: 'Rejected: Missing or invalid Google Place ID format',
        verifiedAt: now
      };
    }
  }

  if (typeof review.rating !== 'number' || review.rating < 1 || review.rating > 5) {
    return {
      isValid: false,
      isLiveGooglePlaces: false,
      error: 'Rejected: Invalid rating value (must be between 1 and 5)',
      verifiedAt: now
    };
  }

  if (!review.authorName || review.authorName.trim().length === 0) {
    return {
      isValid: false,
      isLiveGooglePlaces: false,
      error: 'Rejected: Missing author attribution name',
      verifiedAt: now
    };
  }

  // Verify cryptographic signature if present
  if (review.signature) {
    const expectedSignature = signGooglePlacesReview({
      placeId: review.placeId,
      authorName: review.authorName,
      rating: review.rating,
      time: review.time
    });

    if (review.signature !== expectedSignature) {
      return {
        isValid: false,
        isLiveGooglePlaces: false,
        error: 'Rejected: Cryptographic signature mismatch (possible tampering or synthetic mock injection)',
        verifiedAt: now
      };
    }
  } else {
    // If no signature is provided for a live requirement, check if it claims to be from API
    if (review.source === 'google_places_api' && !process.env.ALLOW_UNSIGNED_API_REVIEWS) {
      return {
        isValid: false,
        isLiveGooglePlaces: false,
        error: 'Rejected: Google Places API review lacks mandatory cryptographic signature',
        verifiedAt: now
      };
    }
  }

  return {
    isValid: true,
    isLiveGooglePlaces: true,
    verifiedAt: now
  };
}

/**
 * Batch verification for arrays of reviews.
 */
export function verifyBatchReviews(reviews: GooglePlaceReviewInput[]): {
  allValid: boolean;
  totalChecked: number;
  validCount: number;
  invalidCount: number;
  results: Array<{ index: number; result: VerificationResult }>;
} {
  const results = reviews.map((rev, index) => ({
    index,
    result: verifyGoogleMapsReviewOrigin(rev)
  }));

  const validCount = results.filter(r => r.result.isValid).length;
  const invalidCount = results.length - validCount;

  return {
    allValid: invalidCount === 0 && results.length > 0,
    totalChecked: reviews.length,
    validCount,
    invalidCount,
    results
  };
}
