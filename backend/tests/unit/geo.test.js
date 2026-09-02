import { describe, expect, it } from "vitest";
import { bboxToPolygon, fromPoint, haversineMeters, parseBbox, toPoint } from "../../src/lib/geo.js";

describe("geo helpers", () => {
  it("stores GeoJSON as [longitude, latitude] and reads it back", () => {
    const point = toPoint(17.385, 78.4867);
    expect(point).toEqual({ type: "Point", coordinates: [78.4867, 17.385] });
    expect(fromPoint(point)).toEqual({ latitude: 17.385, longitude: 78.4867 });
    expect(fromPoint(null)).toEqual({ latitude: null, longitude: null });
  });

  it("rejects coordinates outside the valid ranges", () => {
    expect(() => toPoint(91, 0)).toThrow(RangeError);
    expect(() => toPoint(0, 181)).toThrow(RangeError);
    expect(() => toPoint("17", 78)).toThrow(RangeError);
  });

  it("parses a bbox string and rejects malformed ones", () => {
    expect(parseBbox("78.3,17.3,78.6,17.52")).toEqual({ minLng: 78.3, minLat: 17.3, maxLng: 78.6, maxLat: 17.52 });
    expect(parseBbox("78.6,17.3,78.3,17.52")).toBeNull();
    expect(parseBbox("a,b,c,d")).toBeNull();
    expect(parseBbox("1,2,3")).toBeNull();
    expect(parseBbox(undefined)).toBeNull();
  });

  it("builds a closed polygon for $geoWithin", () => {
    const poly = bboxToPolygon({ minLng: 78.3, minLat: 17.3, maxLng: 78.6, maxLat: 17.52 });
    expect(poly.type).toBe("Polygon");
    const ring = poly.coordinates[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    expect(ring).toEqual([
      [78.3, 17.3],
      [78.6, 17.3],
      [78.6, 17.52],
      [78.3, 17.52],
      [78.3, 17.3],
    ]);
  });

  it("computes haversine distance", () => {
    const charminar = { latitude: 17.3616, longitude: 78.4747 };
    const hitec = { latitude: 17.4483, longitude: 78.3814 };
    const d = haversineMeters(charminar, hitec);
    expect(d).toBeGreaterThan(13000);
    expect(d).toBeLessThan(15000);
    expect(haversineMeters(charminar, charminar)).toBe(0);
  });
});
