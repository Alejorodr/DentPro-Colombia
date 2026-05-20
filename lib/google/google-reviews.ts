export type GoogleReviewItem = {
  id: string;
  authorName: string;
  authorUri?: string;
  authorPhotoUri?: string;
  rating: number;
  text: string;
  relativeTime?: string;
  publishTime?: string;
};

export type GoogleReviewsSummary = {
  placeId: string;
  placeName: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews: GoogleReviewItem[];
};

type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    authorAttribution?: {
      displayName?: string;
      uri?: string;
      photoUri?: string;
    };
    relativePublishTimeDescription?: string;
    publishTime?: string;
  }>;
};

export async function getGoogleReviews(): Promise<GoogleReviewsSummary | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return null;
  }

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`;

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text,reviews.authorAttribution,reviews.relativePublishTimeDescription,reviews.publishTime",
    },
    next: { revalidate: 21600 },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Google Places API error", { status: response.status, body });
    return null;
  }

  const data = (await response.json()) as GooglePlaceDetailsResponse;

  const reviews = (data.reviews ?? [])
    .map((review, index): GoogleReviewItem => {
      const authorName = review.authorAttribution?.displayName?.trim() || "Usuario de Google";
      const text = review.text?.text?.trim() || "";
      const rating = review.rating ?? 0;
      const publishTime = review.publishTime;

      return {
        id: `${authorName}-${publishTime ?? index}`,
        authorName,
        authorUri: review.authorAttribution?.uri,
        authorPhotoUri: review.authorAttribution?.photoUri,
        rating,
        text,
        relativeTime: review.relativePublishTimeDescription,
        publishTime,
      };
    })
    .filter((review) => review.rating >= 4 && review.text.length >= 30);

  return {
    placeId: data.id ?? placeId,
    placeName: data.displayName?.text ?? "DentPro Colombia",
    rating: data.rating,
    userRatingCount: data.userRatingCount,
    googleMapsUri: data.googleMapsUri,
    reviews,
  };
}
