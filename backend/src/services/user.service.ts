import { type QueryFilter, type Types } from "mongoose";
import { STATUSES, type Status } from "../config/enums.js";
import { AppError } from "../lib/errors.js";
import { escapeRegex } from "../lib/incidentFilters.js";
import { buildMeta, toMongoSort, type PageMeta } from "../lib/pagination.js";
import { Incident } from "../models/Incident.js";
import { User, type UserAttrs, type UserDocument, type UserProfile } from "../models/User.js";
import {
  type AdminUpdateUserInput,
  type ChangePasswordInput,
  type ListUsersQuery,
  type UpdateProfileInput,
} from "../validation/user.schema.js";

/**
 * Own profile and admin user management (docs/api.md section 5).
 */

/** A row of GET /api/users. */
export interface UserRow extends UserProfile {
  isActive: boolean;
  incidentCount: number;
}

/** GET /api/users/:id: a row plus the per-status breakdown with every status present. */
export interface UserDetail extends UserRow {
  incidentsByStatus: Record<Status, number>;
}

export interface UserPage {
  data: UserRow[];
  meta: PageMeta;
}

export async function updateProfile(user: UserDocument, input: UpdateProfileInput): Promise<UserProfile> {
  if (input.name !== undefined) user.name = input.name;
  if (input.phone !== undefined) user.phone = input.phone;
  await user.save();
  return user.toProfile();
}

export async function changePassword(
  user: UserDocument,
  { currentPassword, newPassword }: ChangePasswordInput,
): Promise<UserProfile> {
  // req.user is loaded without the hash; fetch it for this one comparison.
  const withHash = await User.findById(user._id).select("+passwordHash");
  if (!withHash) throw AppError.notFound("User");
  if (!(await withHash.comparePassword(currentPassword))) {
    throw new AppError("INVALID_CREDENTIALS", "The current password is incorrect.");
  }
  withHash.passwordHash = await User.hashPassword(newPassword);
  await withHash.save();
  return withHash.toProfile();
}

function toRow(user: UserDocument, incidentCount: number): UserRow {
  return { ...user.toProfile(), isActive: user.isActive, incidentCount };
}

/** Number of incidents per reporter for the users on one page (one aggregation, no $lookup). */
async function incidentCounts(ids: Types.ObjectId[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await Incident.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { reportedBy: { $in: ids } } },
    { $group: { _id: "$reportedBy", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

export async function listUsers({ q, role, isActive, page, limit, sort }: ListUsersQuery): Promise<UserPage> {
  const filter: Record<string, unknown> = {};
  if (q) {
    const pattern = escapeRegex(q.slice(0, 200));
    filter.$or = [{ name: { $regex: pattern, $options: "i" } }, { email: { $regex: pattern, $options: "i" } }];
  }
  if (role !== undefined) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  const skip = (page - 1) * limit;
  const query = User.find(filter as QueryFilter<UserAttrs>).sort(toMongoSort(sort)).skip(skip).limit(limit);
  if (sort.field !== "createdAt") query.collation({ locale: "en", strength: 2 }); // case-insensitive name/email order
  const [total, users] = await Promise.all([User.countDocuments(filter as QueryFilter<UserAttrs>), query]);

  const counts = await incidentCounts(users.map((user) => user._id));
  return {
    data: users.map((user) => toRow(user, counts.get(String(user._id)) ?? 0)),
    meta: buildMeta(page, limit, total),
  };
}

async function withCounts(user: UserDocument): Promise<UserDetail> {
  const rows = await Incident.aggregate<{ _id: string; count: number }>([
    { $match: { reportedBy: user._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const incidentsByStatus = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>;
  let incidentCount = 0;
  for (const row of rows) {
    if (row._id in incidentsByStatus) {
      incidentsByStatus[row._id as Status] = row.count;
      incidentCount += row.count;
    }
  }
  return { ...toRow(user, incidentCount), incidentsByStatus };
}

export async function getUser(id: string): Promise<UserDetail> {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound("User");
  return withCounts(user);
}

/**
 * Activate/deactivate or change the role. Self-protection: an admin cannot
 * take away their own role or lock themselves out (docs/api.md section 5).
 */
export async function adminUpdateUser(actor: UserDocument, id: string, input: AdminUpdateUserInput): Promise<UserDetail> {
  const user = await User.findById(id);
  if (!user) throw AppError.notFound("User");
  if (String(user._id) === String(actor._id)) {
    if (input.role !== undefined && input.role !== user.role) {
      throw AppError.validation([{ field: "id", message: "You cannot change your own role." }]);
    }
    if (input.isActive === false) {
      throw AppError.validation([{ field: "id", message: "You cannot deactivate your own account." }]);
    }
  }
  if (input.role !== undefined) user.role = input.role;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  await user.save();
  return withCounts(user);
}
