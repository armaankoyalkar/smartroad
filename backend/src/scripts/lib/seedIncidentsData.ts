import { type CategoryKey } from "../../config/categories.js";
import { type Priority, type Severity, type Status } from "../../config/enums.js";

/**
 * The curated demo set (docs/design/03-database-schema.md section 7): 80
 * incidents across real Hyderabad localities. Coordinates are plausible
 * street positions inside the Hyderabad bounding box, not surveyed
 * locations; every record is inserted with source "seed" and a description
 * ending in "(Demo data)". Titles and descriptions are written to read like
 * citizen reports so the demo UI looks realistic, and nothing here is
 * presented as a real event.
 *
 * Five groups of 5 to 7 incidents lie within about 100 m of a centre so
 * DBSCAN (eps 200 m, minSamples 4) finds them; the other 50 are at least
 * 300 m from any other point and should be reported as noise.
 */

export interface CuratedIncident {
  cluster: string | null;
  locality: string;
  latitude: number;
  longitude: number;
  category: CategoryKey;
  severity: Severity;
  status: Status;
  priority: Priority | null;
  /** Reported this many days before the seed run (1 to 179). */
  daysAgo: number;
  /** Local hour of the report (Asia/Kolkata), so hour and light features vary. */
  hour: number;
  title: string;
  address: string;
  description: string;
}

/** Cluster centres, for tests and for the hotspot documentation. */
export const SEED_CLUSTERS: Readonly<Record<string, { latitude: number; longitude: number; name: string }>> =
  Object.freeze({
    "hitec-city": { latitude: 17.4504, longitude: 78.3808, name: "Cyber Towers junction, Hitec City" },
    ameerpet: { latitude: 17.4375, longitude: 78.4483, name: "Ameerpet metro station junction" },
    "lb-nagar": { latitude: 17.3457, longitude: 78.5522, name: "LB Nagar junction" },
    kukatpally: { latitude: 17.4857, longitude: 78.4136, name: "Kukatpally Y junction" },
    charminar: { latitude: 17.3616, longitude: 78.4747, name: "Charminar and Laad Bazaar" },
  });

type Row = readonly [
  cluster: string | null,
  locality: string,
  latitude: number,
  longitude: number,
  category: CategoryKey,
  severity: Severity,
  status: Status,
  priority: Priority | null,
  daysAgo: number,
  hour: number,
  title: string,
  address: string,
  description: string,
];

// prettier-ignore
const ROWS: readonly Row[] = [
  // --- cluster: Cyber Towers junction, Hitec City (7) ---
  ["hitec-city", "Hitec City", 17.4507, 78.3811, "POTHOLE", "HIGH", "RESOLVED", "HIGH", 150, 9, "Deep pothole at Cyber Towers junction", "Cyber Towers junction, Hitec City, Hyderabad", "About 40 cm wide pothole on the left lane just after the flyover exit; two-wheelers swerve into the next lane to avoid it."],
  ["hitec-city", "Hitec City", 17.4501, 78.3804, "POTHOLE", "MEDIUM", "VERIFIED", "MEDIUM", 121, 18, "Row of potholes on the service lane", "Service lane beside Cyber Towers, Hitec City, Hyderabad", "Three potholes in a row on the service lane used by office cabs; water collects in them after rain."],
  ["hitec-city", "Hitec City", 17.4509, 78.3805, "TRAFFIC_CONGESTION", "MEDIUM", "IN_PROGRESS", "HIGH", 96, 19, "Evening jam blocking the flyover approach", "Hitec City flyover approach, Madhapur, Hyderabad", "Between 6 and 8 pm the queue from the junction reaches the flyover and blocks the exit ramp."],
  ["hitec-city", "Hitec City", 17.4499, 78.3812, "TRAFFIC_SIGNAL", "HIGH", "RESOLVED", "CRITICAL", 77, 8, "Signal stuck on amber at Cyber Towers", "Cyber Towers signal, Hitec City, Hyderabad", "The signal facing the Madhapur side stays on flashing amber all morning and drivers ignore it."],
  ["hitec-city", "Hitec City", 17.4503, 78.3802, "ROAD_DAMAGE", "MEDIUM", "UNDER_REVIEW", null, 44, 14, "Broken median slab near the metro pillar", "Metro pillar near Cyber Towers, Hitec City, Hyderabad", "A concrete slab of the median has broken off and its pieces are lying on the carriageway."],
  ["hitec-city", "Hitec City", 17.4508, 78.3813, "ACCIDENT", "HIGH", "VERIFIED", "HIGH", 30, 22, "Two-wheeler skid at the junction", "Cyber Towers junction, Hitec City, Hyderabad", "A scooter skidded on loose gravel while turning towards Madhapur; the rider was taken to hospital."],
  ["hitec-city", "Hitec City", 17.4500, 78.3809, "POTHOLE", "LOW", "SUBMITTED", null, 6, 11, "Small pothole forming near the bus bay", "Bus bay near Cyber Towers, Hitec City, Hyderabad", "A small pothole has started forming where the buses stop; it will grow with the next rain."],

  // --- cluster: Ameerpet metro station junction (6) ---
  ["ameerpet", "Ameerpet", 17.4378, 78.4486, "TRAFFIC_CONGESTION", "HIGH", "IN_PROGRESS", "CRITICAL", 160, 18, "Gridlock under the Ameerpet metro station", "Ameerpet metro station, Hyderabad", "Traffic from four directions locks up under the station every evening; buses take twenty minutes to cross."],
  ["ameerpet", "Ameerpet", 17.4371, 78.4480, "OBSTRUCTION", "MEDIUM", "RESOLVED", "MEDIUM", 132, 10, "Hawker carts occupying the left lane", "Ameerpet main road near the metro station, Hyderabad", "Push carts and parked autos take up the whole left lane in front of the station exit."],
  ["ameerpet", "Ameerpet", 17.4379, 78.4479, "POTHOLE", "MEDIUM", "VERIFIED", "MEDIUM", 101, 7, "Pothole at the pedestrian crossing", "Pedestrian crossing at Ameerpet junction, Hyderabad", "Pothole right on the zebra crossing; pedestrians step around it into moving traffic."],
  ["ameerpet", "Ameerpet", 17.4372, 78.4488, "ACCIDENT", "MEDIUM", "RESOLVED", "HIGH", 71, 20, "Auto-rickshaw and car collision at the crossing", "Ameerpet junction, Hyderabad", "An auto turning right was hit by a car coming from the Panjagutta side; both vehicles blocked the junction for an hour."],
  ["ameerpet", "Ameerpet", 17.4374, 78.4482, "TRAFFIC_SIGNAL", "MEDIUM", "UNDER_REVIEW", "LOW", 25, 17, "Pedestrian signal never turns green", "Ameerpet junction, Hyderabad", "The pedestrian signal towards the metro entrance has not turned green for weeks."],
  ["ameerpet", "Ameerpet", 17.4380, 78.4485, "STREET_LIGHT", "LOW", "SUBMITTED", null, 4, 21, "Street lights off on the station side", "Ameerpet metro station, Hyderabad", "The lights on the station side of the road have been off for three nights."],

  // --- cluster: LB Nagar junction (6) ---
  ["lb-nagar", "LB Nagar", 17.3460, 78.5525, "ACCIDENT", "HIGH", "RESOLVED", "CRITICAL", 170, 23, "Night collision at LB Nagar junction", "LB Nagar junction, Hyderabad", "A car ran the signal at night and collided with a lorry; the junction was closed until morning."],
  ["lb-nagar", "LB Nagar", 17.3454, 78.5519, "ACCIDENT", "HIGH", "VERIFIED", "HIGH", 118, 6, "Truck brushed a divider at the underpass exit", "LB Nagar underpass exit, Hyderabad", "A truck scraped the divider at the underpass exit early in the morning and scattered debris."],
  ["lb-nagar", "LB Nagar", 17.3462, 78.5518, "TRAFFIC_SIGNAL", "HIGH", "IN_PROGRESS", "HIGH", 88, 9, "Signal timing out of sync with the flyover ramp", "LB Nagar junction, Hyderabad", "Vehicles from the flyover ramp get a green at the same time as the Vanasthalipuram side."],
  ["lb-nagar", "LB Nagar", 17.3452, 78.5527, "TRAFFIC_CONGESTION", "MEDIUM", "VERIFIED", "MEDIUM", 52, 18, "Bus bay spill-over jams the junction", "LB Nagar bus bay, Hyderabad", "Buses waiting beyond the bay block two lanes during the evening peak."],
  ["lb-nagar", "LB Nagar", 17.3459, 78.5528, "UNSAFE_ROAD", "MEDIUM", "UNDER_REVIEW", "MEDIUM", 19, 12, "Loose gravel on the flyover ramp", "LB Nagar flyover ramp, Hyderabad", "Gravel from a resurfacing job is spread over the ramp and bikes are slipping."],
  ["lb-nagar", "LB Nagar", 17.3455, 78.5522, "ROAD_DAMAGE", "LOW", "REJECTED", null, 12, 15, "Cracks on the footpath edge", "LB Nagar junction footpath, Hyderabad", "Hairline cracks along the footpath kerb near the junction."],

  // --- cluster: Kukatpally Y junction (6) ---
  ["kukatpally", "Kukatpally", 17.4860, 78.4139, "WATERLOGGING", "HIGH", "RESOLVED", "HIGH", 140, 7, "Knee-deep water at Kukatpally Y junction", "Kukatpally Y junction, Hyderabad", "After last night's rain the junction was under knee-deep water and two-wheelers stalled in it."],
  ["kukatpally", "Kukatpally", 17.4853, 78.4133, "WATERLOGGING", "MEDIUM", "IN_PROGRESS", "MEDIUM", 63, 8, "Water pooling under the flyover after rain", "Under the Kukatpally flyover, Hyderabad", "Water stays for hours under the flyover because the drain inlet is blocked with plastic."],
  ["kukatpally", "Kukatpally", 17.4861, 78.4132, "POTHOLE", "HIGH", "VERIFIED", "HIGH", 47, 10, "Cratered stretch at the Y junction", "Kukatpally Y junction, Hyderabad", "The stretch between the junction and the bus stop has a dozen deep potholes."],
  ["kukatpally", "Kukatpally", 17.4852, 78.4140, "ROAD_DAMAGE", "MEDIUM", "RESOLVED", "MEDIUM", 110, 16, "Sunken manhole cover in the middle lane", "Kukatpally Y junction, Hyderabad", "A manhole cover has sunk about 15 cm below the road surface in the middle lane."],
  ["kukatpally", "Kukatpally", 17.4858, 78.4141, "TRAFFIC_CONGESTION", "MEDIUM", "VERIFIED", "LOW", 35, 9, "Morning tailback towards JNTU", "Kukatpally Y junction, Hyderabad", "Morning traffic towards JNTU backs up from the junction for nearly a kilometre."],
  ["kukatpally", "Kukatpally", 17.4855, 78.4131, "OTHER", "LOW", "SUBMITTED", null, 3, 13, "Faded lane markings at the junction", "Kukatpally Y junction, Hyderabad", "The lane markings and stop lines at the junction have faded completely."],

  // --- cluster: Charminar and Laad Bazaar (5) ---
  ["charminar", "Charminar", 17.3619, 78.4750, "OBSTRUCTION", "MEDIUM", "VERIFIED", "MEDIUM", 155, 11, "Vendor stalls narrowing the road at Laad Bazaar", "Laad Bazaar road, Charminar, Hyderabad", "Bangle stalls have spread onto the road and only one vehicle can pass at a time."],
  ["charminar", "Charminar", 17.3612, 78.4744, "WATERLOGGING", "MEDIUM", "RESOLVED", "MEDIUM", 128, 8, "Drain overflow near Charminar", "Charminar, Hyderabad", "The drain beside the monument overflowed onto the road after the rain."],
  ["charminar", "Charminar", 17.3621, 78.4745, "STREET_LIGHT", "MEDIUM", "IN_PROGRESS", "LOW", 66, 20, "Heritage-zone lamps not working", "Charminar pedestrian zone, Hyderabad", "Four of the ornamental lamps around the pedestrian zone are dark after 7 pm."],
  ["charminar", "Charminar", 17.3611, 78.4751, "UNSAFE_ROAD", "HIGH", "VERIFIED", "HIGH", 41, 19, "Exposed cable across the pedestrian street", "Charminar pedestrian street, Hyderabad", "A power cable for the shop lighting runs across the street at ankle height."],
  ["charminar", "Charminar", 17.3617, 78.4743, "OTHER", "LOW", "REJECTED", null, 9, 12, "Request for a new zebra crossing", "Charminar, Hyderabad", "Please paint a zebra crossing between the bus stop and the monument entrance."],

  // --- isolated points (50) ---
  [null, "Gachibowli", 17.4401, 78.3489, "POTHOLE", "HIGH", "RESOLVED", "HIGH", 175, 8, "Pothole on the ORR service road at Gachibowli", "ORR service road near DLF, Gachibowli, Hyderabad", "Deep pothole in the fast lane of the service road; cars brake suddenly to avoid it."],
  [null, "Gachibowli", 17.4449, 78.3563, "TRAFFIC_CONGESTION", "HIGH", "VERIFIED", "CRITICAL", 95, 18, "Gachibowli flyover backs up every evening", "Gachibowli flyover, Hyderabad", "The flyover queue reaches the Kondapur turn every evening between 6 and 8 pm."],
  [null, "Gachibowli", 17.4319, 78.3428, "STREET_LIGHT", "MEDIUM", "UNDER_REVIEW", "MEDIUM", 22, 21, "Dark stretch near Wipro circle", "Wipro circle, Gachibowli, Hyderabad", "Six consecutive street lights are off on the stretch after Wipro circle."],
  [null, "Gachibowli", 17.4522, 78.3615, "ACCIDENT", "MEDIUM", "RESOLVED", "MEDIUM", 58, 23, "Car hit a barrier near Kondapur turn", "Kondapur turn, Gachibowli road, Hyderabad", "A car hit the plastic barriers at the diversion late at night; nobody was hurt."],
  [null, "Madhapur", 17.4478, 78.3916, "ROAD_DAMAGE", "HIGH", "IN_PROGRESS", "HIGH", 83, 10, "Collapsed road edge near Image Hospital", "Image Hospital road, Madhapur, Hyderabad", "The road edge has collapsed into the drain for about ten metres."],
  [null, "Madhapur", 17.4530, 78.3910, "OBSTRUCTION", "LOW", "RESOLVED", "LOW", 137, 15, "Construction debris on Kavuri Hills road", "Kavuri Hills main road, Madhapur, Hyderabad", "A builder has dumped sand and bricks on half the road outside a site."],
  [null, "Madhapur", 17.4410, 78.3960, "UNSAFE_ROAD", "MEDIUM", "SUBMITTED", null, 2, 7, "Missing guard rail along Durgam Cheruvu road", "Durgam Cheruvu road, Madhapur, Hyderabad", "The guard rail on the lake side is missing for about twenty metres after the bend."],
  [null, "Jubilee Hills", 17.4325, 78.4073, "TRAFFIC_SIGNAL", "MEDIUM", "RESOLVED", "MEDIUM", 125, 9, "Signal blackout at Jubilee Hills check post", "Jubilee Hills check post, Hyderabad", "All signals at the check post went dark during the morning peak and a policeman had to manage traffic."],
  [null, "Jubilee Hills", 17.4239, 78.4108, "POTHOLE", "MEDIUM", "VERIFIED", "LOW", 49, 17, "Pothole on Road No. 36", "Road No. 36, Jubilee Hills, Hyderabad", "A pothole has opened near the bus stop on Road No. 36 and is growing each week."],
  [null, "Jubilee Hills", 17.4195, 78.4245, "TRAFFIC_CONGESTION", "LOW", "REJECTED", null, 14, 20, "Slow traffic on Road No. 45", "Road No. 45, Jubilee Hills, Hyderabad", "Traffic on Road No. 45 crawls in the evening because of the restaurants."],
  [null, "Jubilee Hills", 17.4160, 78.4070, "STREET_LIGHT", "LOW", "SUBMITTED", null, 5, 22, "Flickering lamp on Road No. 10", "Road No. 10, Jubilee Hills, Hyderabad", "The lamp outside the park entrance flickers all night."],
  [null, "Banjara Hills", 17.4126, 78.4482, "ACCIDENT", "HIGH", "RESOLVED", "CRITICAL", 165, 1, "Late-night crash on Road No. 1", "Road No. 1, Banjara Hills, Hyderabad", "A speeding car hit the central divider around 1 am; the divider blocks are still on the road."],
  [null, "Banjara Hills", 17.4203, 78.4398, "ROAD_DAMAGE", "MEDIUM", "VERIFIED", "MEDIUM", 92, 13, "Uneven patchwork on Road No. 12", "Road No. 12, Banjara Hills, Hyderabad", "Repeated patching has left the road with a series of bumps that rattle every car."],
  [null, "Banjara Hills", 17.4098, 78.4390, "OBSTRUCTION", "MEDIUM", "IN_PROGRESS", "MEDIUM", 38, 6, "Fallen tree branch near KBR Park gate", "KBR Park gate, Banjara Hills, Hyderabad", "A large branch came down in the wind and is blocking the left lane."],
  [null, "Banjara Hills", 17.4165, 78.4550, "OTHER", "LOW", "UNDER_REVIEW", null, 17, 16, "Illegal speed breaker on Road No. 2", "Road No. 2, Banjara Hills, Hyderabad", "Residents have built an unmarked speed breaker outside their gate."],
  [null, "Begumpet", 17.4443, 78.4675, "TRAFFIC_CONGESTION", "MEDIUM", "RESOLVED", "MEDIUM", 143, 19, "Begumpet flyover merge causes jams", "Begumpet flyover, Hyderabad", "Vehicles merging from the flyover and the side road fight for one lane."],
  [null, "Begumpet", 17.4400, 78.4720, "WATERLOGGING", "MEDIUM", "VERIFIED", "MEDIUM", 61, 8, "Waterlogging under the railway bridge", "Railway under-bridge, Prakash Nagar, Begumpet, Hyderabad", "The under-bridge fills with water after every shower and cars stall in it."],
  [null, "Begumpet", 17.4490, 78.4620, "POTHOLE", "LOW", "SUBMITTED", null, 7, 12, "Pothole near the airport approach road", "Old airport approach road, Begumpet, Hyderabad", "A shallow pothole near the turn into the old airport road."],
  [null, "Secunderabad", 17.4344, 78.5013, "TRAFFIC_CONGESTION", "HIGH", "IN_PROGRESS", "HIGH", 105, 9, "Station road choked in the morning peak", "Secunderabad railway station road, Hyderabad", "Autos and taxis waiting for trains block the station road every morning."],
  [null, "Secunderabad", 17.4399, 78.4983, "TRAFFIC_SIGNAL", "HIGH", "RESOLVED", "HIGH", 148, 18, "Paradise circle signals out of order", "Paradise circle, Secunderabad, Hyderabad", "The signals at Paradise circle are dark and traffic from five roads is unmanaged."],
  [null, "Secunderabad", 17.4470, 78.4998, "ROAD_DAMAGE", "MEDIUM", "VERIFIED", "MEDIUM", 69, 11, "Damaged road surface near Bowenpally turn", "Bowenpally turn, Secunderabad, Hyderabad", "The surface has peeled away in patches after the pipeline work."],
  [null, "Secunderabad", 17.4380, 78.5100, "WATERLOGGING", "LOW", "REJECTED", null, 27, 9, "Puddle near Chilkalguda crossing", "Chilkalguda crossing, Secunderabad, Hyderabad", "A puddle forms at the crossing after rain and splashes pedestrians."],
  [null, "Secunderabad", 17.4300, 78.5050, "UNSAFE_ROAD", "MEDIUM", "UNDER_REVIEW", "HIGH", 11, 14, "Open drain cover near Ranigunj", "Ranigunj, Secunderabad, Hyderabad", "A drain cover is missing on the footpath side and the opening is not fenced."],
  [null, "Mehdipatnam", 17.3949, 78.4353, "TRAFFIC_CONGESTION", "HIGH", "VERIFIED", "HIGH", 79, 17, "Bus stand traffic blocks the main road", "Mehdipatnam bus stand, Hyderabad", "Buses leaving the stand take up all lanes of the main road in the evening."],
  [null, "Mehdipatnam", 17.3980, 78.4420, "POTHOLE", "MEDIUM", "RESOLVED", "MEDIUM", 112, 10, "Pothole near Masab Tank flyover", "Masab Tank flyover, Mehdipatnam, Hyderabad", "A pothole at the foot of the flyover catches vehicles coming down at speed."],
  [null, "Mehdipatnam", 17.3900, 78.4290, "STREET_LIGHT", "MEDIUM", "IN_PROGRESS", "LOW", 33, 20, "Street lights dark near Gudimalkapur market", "Gudimalkapur market road, Mehdipatnam, Hyderabad", "The market road has been without street lighting since the poles were moved."],
  [null, "Mehdipatnam", 17.3865, 78.4370, "OTHER", "MEDIUM", "SUBMITTED", null, 8, 9, "Stray cattle on the road at Asif Nagar", "Asif Nagar main road, Mehdipatnam, Hyderabad", "Cattle sit in the middle of the road every morning and vehicles swerve around them."],
  [null, "Dilsukhnagar", 17.3688, 78.5247, "ACCIDENT", "MEDIUM", "RESOLVED", "MEDIUM", 157, 21, "Bus and bike collision near the bus stand", "Dilsukhnagar bus stand, Hyderabad", "A bus pulling out of the stand clipped a motorcycle; the rider had minor injuries."],
  [null, "Dilsukhnagar", 17.3740, 78.5320, "POTHOLE", "HIGH", "VERIFIED", "HIGH", 54, 8, "Large pothole at Chaitanyapuri crossing", "Chaitanyapuri crossing, Dilsukhnagar, Hyderabad", "A pothole nearly a metre wide sits in the middle of the crossing."],
  [null, "Dilsukhnagar", 17.3660, 78.5170, "OBSTRUCTION", "MEDIUM", "UNDER_REVIEW", "MEDIUM", 20, 11, "Abandoned lorry near Moosarambagh bridge", "Moosarambagh bridge, Hyderabad", "A lorry has been parked on the bridge approach for two weeks and narrows the road."],
  [null, "Dilsukhnagar", 17.3610, 78.5280, "WATERLOGGING", "HIGH", "RESOLVED", "HIGH", 99, 7, "Kothapet road flooded after overnight rain", "Kothapet main road, Dilsukhnagar, Hyderabad", "The road in front of the fruit market was flooded up to the footpath this morning."],
  [null, "Uppal", 17.4056, 78.5591, "ROAD_DAMAGE", "HIGH", "IN_PROGRESS", "HIGH", 74, 12, "Broken surface at the Uppal ring road junction", "Uppal ring road junction, Hyderabad", "The surface at the junction has broken into loose slabs after the metro work."],
  [null, "Uppal", 17.3990, 78.5545, "TRAFFIC_CONGESTION", "MEDIUM", "VERIFIED", "MEDIUM", 45, 18, "Stadium match-day jams on the main road", "Uppal stadium road, Hyderabad", "On match days the road outside the stadium is blocked for two hours after the game."],
  [null, "Uppal", 17.4110, 78.5680, "STREET_LIGHT", "LOW", "RESOLVED", "LOW", 123, 21, "Lamps out on the Boduppal stretch", "Uppal to Boduppal road, Hyderabad", "The lamps between Uppal and Boduppal are off on alternate poles."],
  [null, "Uppal", 17.4010, 78.5390, "UNSAFE_ROAD", "MEDIUM", "SUBMITTED", null, 1, 8, "Oil spill near Ramanthapur", "Ramanthapur main road, Hyderabad", "A tanker leaked oil near the bus stop and two bikes have already slipped on it."],
  [null, "Miyapur", 17.4969, 78.3715, "POTHOLE", "MEDIUM", "RESOLVED", "MEDIUM", 168, 9, "Potholes at Miyapur crossroads", "Miyapur crossroads, Hyderabad", "Several potholes at the crossroads slow every vehicle turning towards the metro."],
  [null, "Miyapur", 17.5050, 78.3660, "TRAFFIC_SIGNAL", "MEDIUM", "VERIFIED", "MEDIUM", 57, 8, "Metro station signal keeps flickering", "Miyapur metro station, Hyderabad", "The signal outside the metro station flickers between red and green."],
  [null, "Miyapur", 17.4920, 78.3800, "ACCIDENT", "LOW", "REJECTED", null, 36, 17, "Minor scrape between two cars near Chandanagar", "Chandanagar, Miyapur road, Hyderabad", "Two cars scraped mirrors while changing lanes; no damage to the road."],
  [null, "Miyapur", 17.5105, 78.3760, "OTHER", "LOW", "SUBMITTED", null, 3, 15, "Unmarked speed breaker near Hafeezpet", "Hafeezpet road, Miyapur, Hyderabad", "A new speed breaker has no paint or sign and cars hit it hard at night."],
  [null, "Kukatpally", 17.4933, 78.3915, "STREET_LIGHT", "MEDIUM", "VERIFIED", "LOW", 86, 20, "Dark stretch outside JNTU gate", "JNTU main gate, Kukatpally, Hyderabad", "The road outside the JNTU gate has no working lights and students cross in the dark."],
  [null, "Kukatpally", 17.4778, 78.4212, "UNSAFE_ROAD", "HIGH", "RESOLVED", "HIGH", 134, 14, "Missing barricade at Balanagar flyover work", "Balanagar flyover, Hyderabad", "The work zone at the flyover has no barricade on the traffic side."],
  [null, "Hitec City", 17.4435, 78.3772, "OBSTRUCTION", "MEDIUM", "IN_PROGRESS", "MEDIUM", 29, 10, "Cable-laying trench left open at Cyber Gateway", "Cyber Gateway, Hitec City, Hyderabad", "A trench dug for cables has been left open across half the road for a week."],
  [null, "Hitec City", 17.4560, 78.3720, "TRAFFIC_CONGESTION", "HIGH", "VERIFIED", "CRITICAL", 116, 19, "Kothaguda junction jams in the evening", "Kothaguda junction, Hitec City, Hyderabad", "The junction locks up every evening as office traffic meets the Kondapur flow."],
  [null, "Hitec City", 17.4490, 78.3880, "WATERLOGGING", "MEDIUM", "UNDER_REVIEW", "MEDIUM", 16, 7, "Water stagnating near Madhapur police station", "Madhapur police station road, Hyderabad", "Water has been standing in front of the police station for two days."],
  [null, "Ameerpet", 17.4340, 78.4560, "ACCIDENT", "MEDIUM", "RESOLVED", "MEDIUM", 146, 22, "Bike slipped at Panjagutta crossing", "Panjagutta crossing, Hyderabad", "A motorcycle slipped on the wet crossing at night; the rider walked away."],
  [null, "Ameerpet", 17.4440, 78.4440, "POTHOLE", "MEDIUM", "SUBMITTED", null, 10, 9, "Pothole on the SR Nagar main road", "SR Nagar main road, Ameerpet, Hyderabad", "A pothole near the SR Nagar bus stop is catching two-wheelers every morning."],
  [null, "LB Nagar", 17.3390, 78.5600, "ROAD_DAMAGE", "MEDIUM", "REJECTED", null, 23, 13, "Rough patch near Vanasthalipuram bus stop", "Vanasthalipuram bus stop, LB Nagar, Hyderabad", "The road near the bus stop is rough and uneven."],
  [null, "LB Nagar", 17.3560, 78.5580, "TRAFFIC_SIGNAL", "LOW", "SUBMITTED", null, 2, 18, "Signal countdown display not working at Nagole", "Nagole junction, Hyderabad", "The countdown timer on the Nagole signal is blank, so nobody knows when it changes."],
  [null, "Charminar", 17.3560, 78.4780, "OBSTRUCTION", "HIGH", "RESOLVED", "HIGH", 153, 12, "Collapsed compound wall debris on Falaknuma road", "Falaknuma road, Charminar, Hyderabad", "A compound wall collapsed onto the road after the rain and blocked one direction."],
  [null, "Charminar", 17.3670, 78.4680, "STREET_LIGHT", "MEDIUM", "UNDER_REVIEW", "MEDIUM", 13, 21, "Street lights out near Madina building", "Madina building, Charminar road, Hyderabad", "The stretch in front of the Madina building is dark and pickpocketing has increased."],
];

export const CURATED_INCIDENTS: readonly CuratedIncident[] = Object.freeze(
  ROWS.map(
    ([
      cluster,
      locality,
      latitude,
      longitude,
      category,
      severity,
      status,
      priority,
      daysAgo,
      hour,
      title,
      address,
      description,
    ]) =>
      Object.freeze({
        cluster,
        locality,
        latitude,
        longitude,
        category,
        severity,
        status,
        priority,
        daysAgo,
        hour,
        title,
        address,
        description,
      }),
  ),
);
