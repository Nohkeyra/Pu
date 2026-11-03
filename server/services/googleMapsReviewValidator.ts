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

function getReviewSecret(): string | null {
  const key = process.env.GOOGLE_MAPS_REVIEW_SECRET?.trim();
  // A publicly known fallback secret makes all purported review signatures forgeable.
  return key && key.length >= 32 ? key : null;
}

/**
 * Generates an HMAC-SHA256 verification signature for authentic Google Places API responses.
 */
export function signGooglePlacesReview(review: { placeId: string; authorName: string; rating: number; time: number; text?: string }): string {
  const secret = getReviewSecret();
  if (!secret) throw new Error('GOOGLE_MAPS_REVIEW_SECRET must be configured with at least 32 characters');
  // Bind the displayed review text as well as its identity/rating to the signature.
  const payload = JSON.stringify([review.placeId, review.authorName, review.rating, review.time, review.text ?? '']);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
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
  if (review.source !== 'google_places_api') {
    return {
      isValid: false,
      isLiveGooglePlaces: false,
      error: `Rejected: Review is explicitly labeled as local mock/prototype data (source: ${review.source})`,
      verifiedAt: now
    };
  }

  // Verify mandatory Google Places properties
  // Place IDs vary; require a non-trivial string rather than relying on a prefix.
  if (typeof review.placeId !== 'string' || review.placeId.trim().length < 10) {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Rejected: Missing or invalid Google Place ID', verifiedAt: now };
  }

  if (!Number.isFinite(review.rating) || review.rating < 1 || review.rating > 5) {
    return {
      isValid: false,
      isLiveGooglePlaces: false,
      error: 'Rejected: Invalid rating value (must be between 1 and 5)',
      verifiedAt: now
    };
  }

  if (typeof review.authorName !== 'string' || review.authorName.trim().length === 0) {
    return {
      isValid: false,
      isLiveGooglePlaces: false,
      error: 'Rejected: Missing author attribution name',
      verifiedAt: now
    };
  }

  if (!Number.isSafeInteger(review.time) || review.time <= 0 || typeof review.text !== 'string') {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Rejected: Invalid review timestamp or text', verifiedAt: now };
  }

  // Fail closed: a source label or an environment flag cannot prove provenance.
  if (!getReviewSecret()) {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Review verification secret not configured', verifiedAt: now };
  }
  if (!review.signature) {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Rejected: Google Places API review lacks mandatory cryptographic signature', verifiedAt: now };
  }
  if (!/^[a-f0-9]{64}$/i.test(review.signature)) {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Rejected: Invalid signature format', verifiedAt: now };
  }

  const expectedSignature = signGooglePlacesReview({
    placeId: review.placeId,
    authorName: review.authorName,
    rating: review.rating,
    time: review.time,
    text: review.text
  });
  const provided = Buffer.from(review.signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (!crypto.timingSafeEqual(provided, expected)) {
    return { isValid: false, isLiveGooglePlaces: false, error: 'Rejected: Cryptographic signature mismatch', verifiedAt: now };
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
