import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { GoogleReviewsSummary } from "@/lib/google/google-reviews";

import { HeroGoogleReviewRotator } from "../HeroGoogleReviewRotator";

const fallback = { quote: "Excelente atención", author: "Paciente", role: "Chía", avatar: "" };

const googleReviews: GoogleReviewsSummary = {
  placeId: "place",
  placeName: "DentPro",
  rating: 4.9,
  userRatingCount: 115,
  googleMapsUri: "https://maps.google.com/?cid=1",
  reviews: [
    {
      id: "r1",
      authorName: "Sonia",
      rating: 5,
      text: "Excelente atención",
      relativeTime: "Hace 3 meses",
    },
  ],
};

afterEach(cleanup);

// DOG-66: jsdom no mide el layout, así que se fija la causa: sin `grid-cols-1` + `min-w-0`, la
// columna implícita del grid crece con la barra de calificación (nowrap) y se sale a 320 px.
describe("HeroGoogleReviewRotator en pantallas angostas", () => {
  it("el contenedor usa una columna que puede encogerse", () => {
    const { container } = render(<HeroGoogleReviewRotator googleReviews={googleReviews} fallback={fallback} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toMatch(/\bgrid-cols-1\b/);
    expect(grid.className).toMatch(/\bmin-w-0\b/);
  });

  it("la barra de calificación puede partirse en dos líneas", () => {
    render(<HeroGoogleReviewRotator googleReviews={googleReviews} fallback={fallback} />);
    const bar = screen.getByRole("link", { name: "Google Maps" }).parentElement as HTMLElement;
    expect(bar.className).toMatch(/\bflex-wrap\b/);
  });
});
