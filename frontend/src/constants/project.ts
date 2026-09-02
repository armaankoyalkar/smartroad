/** Project identity shown in layouts, the landing page and the footer. */
export const PROJECT = {
  name: "SmartRoad",
  fullTitle: "An Intelligent Web-Based Road Safety, Traffic Incident Management and Risk Prediction System",
  tagline: "Making roads smarter. Making travel safer.",
  year: 2026,
  team: [
    { name: "Balaji Lakshmipathi", role: "Team lead, backend" },
    { name: "Vivek Reddy", role: "Frontend" },
    { name: "Arman Koyalkar", role: "Machine learning" },
  ],
  guide: "Rajesh Adluri",
  academicNote:
    "Academic prototype built as a final-year engineering project. It is not an official channel for reporting road incidents.",
  mapAttribution: "Base map data from OpenStreetMap contributors. Tiles are a base map, not a traffic feed.",
} as const;
