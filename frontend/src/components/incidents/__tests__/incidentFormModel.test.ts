import { describe, expect, it } from "vitest";
import { incidentToFormFields, toIncidentPayload } from "../incidentFormModel";
import type { Incident } from "@/types/api";

const values = {
  title: "Deep pothole",
  category: "POTHOLE" as const,
  description: "About 40 cm wide, left lane.",
  severity: "HIGH" as const,
  latitude: 17.4483,
  longitude: 78.3814,
  address: "Hitec City",
  image: null,
};

describe("toIncidentPayload", () => {
  it("sends the scalar fields and no image flags by default", () => {
    expect(toIncidentPayload(values)).toEqual({
      title: "Deep pothole",
      category: "POTHOLE",
      description: "About 40 cm wide, left lane.",
      severity: "HIGH",
      latitude: 17.4483,
      longitude: 78.3814,
      address: "Hitec City",
    });
  });

  it("attaches a new file and never asks to remove the stored image at the same time", () => {
    const image = new File(["x"], "a.png", { type: "image/png" });
    const payload = toIncidentPayload(
      { ...values, image },
      { existingImage: true, existingImageRemoved: true },
    );
    expect(payload.image).toBe(image);
    expect(payload.removeImage).toBeUndefined();
  });

  it("sets removeImage only when a stored image was removed without a replacement", () => {
    expect(toIncidentPayload(values, { existingImage: true, existingImageRemoved: true }).removeImage).toBe(
      true,
    );
    expect(
      toIncidentPayload(values, { existingImage: false, existingImageRemoved: true }).removeImage,
    ).toBeUndefined();
    expect(
      toIncidentPayload(values, { existingImage: true, existingImageRemoved: false }).removeImage,
    ).toBeUndefined();
  });

  it("defaults a missing address to an empty string", () => {
    expect(toIncidentPayload({ ...values, address: undefined }).address).toBe("");
  });
});

describe("incidentToFormFields", () => {
  it("prefills every editable field and leaves the file empty", () => {
    const incident = {
      title: "T",
      category: "ACCIDENT",
      description: "D",
      severity: "LOW",
      latitude: 1,
      longitude: 2,
      address: "",
      image: { url: "/uploads/a.jpg", mimeType: "image/jpeg", size: 10 },
    } as Incident;
    expect(incidentToFormFields(incident)).toEqual({
      title: "T",
      category: "ACCIDENT",
      description: "D",
      severity: "LOW",
      latitude: 1,
      longitude: 2,
      address: "",
      image: null,
    });
  });
});
