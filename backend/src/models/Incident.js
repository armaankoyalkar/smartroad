import mongoose from "mongoose";
import { isCategoryKey } from "../config/categories.js";
import { HISTORY_FIELDS, PRIORITIES, SEVERITIES, SOURCES, STATUSES, UPLOAD_MIME_TYPES } from "../config/enums.js";
import { fromPoint, isValidLatitude, isValidLongitude } from "../lib/geo.js";

const { Schema } = mongoose;

/** One append-only entry per status or priority change (docs/03 section 3.1). */
const statusHistoryEntrySchema = new Schema(
  {
    field: { type: String, enum: HISTORY_FIELDS, required: true },
    from: { type: String, default: null },
    to: { type: String, required: true },
    note: { type: String, maxlength: 1000, default: null },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, enum: UPLOAD_MIME_TYPES, required: true },
    size: { type: Number, required: true, min: 1, max: 25 * 1024 * 1024 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const incidentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      validate: { validator: isCategoryKey, message: (props) => `${props.value} is not a known category` },
    },
    severity: { type: String, enum: SEVERITIES, required: true },
    priority: { type: String, enum: [...PRIORITIES, null], default: null },
    status: { type: String, enum: STATUSES, default: "REPORTED" },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (c) => Array.isArray(c) && c.length === 2 && isValidLongitude(c[0]) && isValidLatitude(c[1]),
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
    source: { type: String, enum: SOURCES, default: "user" },
    resolvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.location;
        return ret;
      },
    },
  },
);

incidentSchema.virtual("latitude").get(function latitude() {
  return fromPoint(this.location).latitude;
});
incidentSchema.virtual("longitude").get(function longitude() {
  return fromPoint(this.location).longitude;
});

// Every incident starts its history with the REPORTED entry (docs/03 section 3).
incidentSchema.pre("validate", async function ensureInitialHistory() {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ field: "status", from: null, to: this.status ?? "REPORTED", changedBy: null });
  }
});

incidentSchema.index({ location: "2dsphere" });
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ category: 1, createdAt: -1 });
incidentSchema.index({ reportedBy: 1, createdAt: -1 });
incidentSchema.index({ priority: 1, status: 1 });
incidentSchema.index({ createdAt: -1 });

export const Incident = mongoose.models.Incident ?? mongoose.model("Incident", incidentSchema);
