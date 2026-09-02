import mongoose, { type HydratedDocument, type Model, Schema, type Types } from "mongoose";
import { type CategoryKey, isCategoryKey } from "../config/categories.js";
import {
  HISTORY_FIELDS,
  PRIORITIES,
  RISK_LEVELS,
  SEVERITIES,
  SOURCES,
  STATUSES,
  UPLOAD_MIME_TYPES,
  type HistoryField,
  type Priority,
  type RiskLevel,
  type Severity,
  type Source,
  type Status,
  type UploadMimeType,
} from "../config/enums.js";
import { fromPoint, type GeoPoint, isValidLatitude, isValidLongitude } from "../lib/geo.js";

/** One append-only entry per status or priority change (docs/api.md section 6.1). */
export interface StatusHistoryEntry {
  field: HistoryField;
  from: string | null;
  to: string;
  note: string | null;
  changedBy: Types.ObjectId | null;
  at: Date;
}

export interface IncidentImage {
  filename: string;
  url: string;
  mimeType: UploadMimeType;
  size: number;
  uploadedAt: Date;
}

/** Stored output of the risk model for one incident (docs/api.md section 9). */
export interface RiskEstimate {
  level: RiskLevel;
  probabilities: Record<RiskLevel, number>;
  modelVersion: string;
  estimatedAt: Date;
}

export interface IncidentAttrs {
  title: string;
  description: string;
  category: CategoryKey;
  severity: Severity;
  priority: Priority | null;
  status: Status;
  location: GeoPoint;
  address: string;
  image: IncidentImage | null;
  reportedBy: Types.ObjectId;
  verifiedBy: Types.ObjectId | null;
  adminNote: string | null;
  statusHistory: StatusHistoryEntry[];
  riskEstimate: RiskEstimate | null;
  source: Source;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentVirtuals {
  latitude: number | null;
  longitude: number | null;
}

export type IncidentDocument = HydratedDocument<IncidentAttrs, IncidentVirtuals>;
export type IncidentModel = Model<IncidentAttrs, object, object, IncidentVirtuals>;

const statusHistoryEntrySchema = new Schema<StatusHistoryEntry>(
  {
    field: { type: String, enum: [...HISTORY_FIELDS], required: true },
    from: { type: String, default: null },
    to: { type: String, required: true },
    note: { type: String, maxlength: 1000, default: null },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const imageSchema = new Schema<IncidentImage>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, enum: [...UPLOAD_MIME_TYPES], required: true },
    size: { type: Number, required: true, min: 1, max: 25 * 1024 * 1024 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const probability = { type: Number, required: true, min: 0, max: 1 };

const riskEstimateSchema = new Schema<RiskEstimate>(
  {
    level: { type: String, enum: [...RISK_LEVELS], required: true },
    probabilities: {
      type: new Schema({ LOW: probability, MEDIUM: probability, HIGH: probability }, { _id: false }),
      required: true,
    },
    modelVersion: { type: String, required: true },
    estimatedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const incidentSchema = new Schema<IncidentAttrs, IncidentModel, object, object, IncidentVirtuals>(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      validate: {
        validator: (value: unknown) => isCategoryKey(value),
        message: (props: { value: unknown }) => `${String(props.value)} is not a known category`,
      },
    },
    severity: { type: String, enum: [...SEVERITIES], required: true },
    priority: { type: String, enum: [...PRIORITIES, null], default: null },
    status: { type: String, enum: [...STATUSES], default: "SUBMITTED" },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (c: unknown) =>
            Array.isArray(c) && c.length === 2 && isValidLongitude(c[0]) && isValidLatitude(c[1]),
          message: "coordinates must be [longitude, latitude] within valid ranges",
        },
      },
    },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    image: { type: imageSchema, default: null },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    adminNote: { type: String, maxlength: 1000, default: null },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
    riskEstimate: { type: riskEstimateSchema, default: null },
    source: { type: String, enum: [...SOURCES], default: "user" },
    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        const out = ret as Record<string, unknown>;
        out.id = String(ret._id);
        delete out._id;
        delete out.location;
        return out;
      },
    },
  },
);

incidentSchema.virtual("latitude").get(function latitude(this: IncidentDocument) {
  return fromPoint(this.location).latitude;
});
incidentSchema.virtual("longitude").get(function longitude(this: IncidentDocument) {
  return fromPoint(this.location).longitude;
});

// Every incident starts its history with the SUBMITTED entry (docs/api.md section 6.1).
incidentSchema.pre("validate", function ensureInitialHistory() {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      field: "status",
      from: null,
      to: this.status ?? "SUBMITTED",
      note: null,
      changedBy: null,
      at: new Date(),
    });
  }
});

incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ category: 1, createdAt: -1 });
incidentSchema.index({ reportedBy: 1, createdAt: -1 });
incidentSchema.index({ priority: 1, status: 1 });
incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ "riskEstimate.level": 1 });

// mongoose.models is typed loosely (Model<any>); the registered model was built from this schema.
export const Incident: IncidentModel =
  (mongoose.models.Incident as unknown as IncidentModel | undefined) ??
  mongoose.model<IncidentAttrs, IncidentModel>("Incident", incidentSchema);
