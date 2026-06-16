import crypto from "node:crypto";
import { db, LicensePlan, LicenseRecord, resetDailyUsageIfNeeded } from "./db.js";

export type VerifyResult =
  | {
      valid: true;
      userId: string;
      activationCode: string;
      membershipStatus: "Active";
      plan: LicensePlan;
      expiryTime: string | null;
      usedToday: number;
      dailyCreditLimit: number;
      remainingCredits: number;
    }
  | {
      valid: false;
      userId?: string;
      activationCode?: string;
      membershipStatus: "Invalid" | "Expired" | "Revoked" | "Device Limit" | "Daily Limit";
      reason: string;
      expiryTime?: string | null;
      usedToday?: number;
      dailyCreditLimit?: number;
      remainingCredits?: number;
    };

export function generateLicenseKey(prefix = "AIW") {
  const raw = crypto.randomBytes(12).toString("hex").toUpperCase();
  const grouped = raw.match(/.{1,4}/g)?.join("-") ?? raw;
  return `${prefix}-${grouped}`;
}

export function createLicense(args: {
  plan: LicensePlan;
  days?: number;
  dailyCreditLimit: number;
  maxDevices: number;
}) {
  const key = generateLicenseKey();
  const expiresAt = args.plan === "lifetime" ? null : new Date(Date.now() + (args.days ?? 30) * 24 * 60 * 60 * 1000).toISOString();
  const record: LicenseRecord = {
    key,
    userId: `user-${crypto.randomUUID().slice(0, 8)}`,
    plan: args.plan,
    status: "active",
    expiresAt,
    dailyCreditLimit: args.dailyCreditLimit,
    usedToday: 0,
    maxDevices: args.maxDevices,
    devices: [],
    createdAt: new Date().toISOString(),
  };
  db.licenses.set(key, record);
  return record;
}

export function verifyLicense(args: { licenseKey: string; deviceId: string }): VerifyResult {
  const record = db.licenses.get(args.licenseKey);

  if (!record) {
    return { valid: false, membershipStatus: "Invalid", reason: "License key does not exist" };
  }

  resetDailyUsageIfNeeded(record);

  if (record.status === "revoked") {
    return {
      valid: false,
      userId: record.userId,
      activationCode: record.key,
      membershipStatus: "Revoked",
      reason: "License key was revoked",
      expiryTime: record.expiresAt,
      usedToday: record.usedToday,
      dailyCreditLimit: record.dailyCreditLimit,
      remainingCredits: Math.max(0, record.dailyCreditLimit - record.usedToday),
    };
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    return {
      valid: false,
      userId: record.userId,
      activationCode: record.key,
      membershipStatus: "Expired",
      reason: "License key is expired",
      expiryTime: record.expiresAt,
      usedToday: record.usedToday,
      dailyCreditLimit: record.dailyCreditLimit,
      remainingCredits: Math.max(0, record.dailyCreditLimit - record.usedToday),
    };
  }

  if (!record.devices.includes(args.deviceId)) {
    if (record.devices.length >= record.maxDevices) {
      return {
        valid: false,
        userId: record.userId,
        activationCode: record.key,
        membershipStatus: "Device Limit",
        reason: "Device limit reached",
        expiryTime: record.expiresAt,
        usedToday: record.usedToday,
        dailyCreditLimit: record.dailyCreditLimit,
        remainingCredits: Math.max(0, record.dailyCreditLimit - record.usedToday),
      };
    }
    record.devices.push(args.deviceId);
  }

  if (record.usedToday >= record.dailyCreditLimit) {
    return {
      valid: false,
      userId: record.userId,
      activationCode: record.key,
      membershipStatus: "Daily Limit",
      reason: "Daily credit limit reached",
      expiryTime: record.expiresAt,
      usedToday: record.usedToday,
      dailyCreditLimit: record.dailyCreditLimit,
      remainingCredits: 0,
    };
  }

  return {
    valid: true,
    userId: record.userId,
    activationCode: record.key,
    membershipStatus: "Active",
    plan: record.plan,
    expiryTime: record.expiresAt,
    usedToday: record.usedToday,
    dailyCreditLimit: record.dailyCreditLimit,
    remainingCredits: Math.max(0, record.dailyCreditLimit - record.usedToday),
  };
}

export function reportUsage(args: { licenseKey: string; deviceId: string; creditsUsed: number; action: string; model?: string }) {
  const record = db.licenses.get(args.licenseKey);
  if (!record) return null;

  record.usedToday += args.creditsUsed;
  db.usage.push({
    id: crypto.randomUUID(),
    licenseKey: args.licenseKey,
    deviceId: args.deviceId,
    creditsUsed: args.creditsUsed,
    action: args.action,
    model: args.model,
    createdAt: new Date().toISOString(),
  });

  return record;
}
