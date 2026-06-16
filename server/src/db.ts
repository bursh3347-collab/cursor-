export type LicensePlan = "trial" | "monthly" | "yearly" | "lifetime";
export type LicenseStatus = "active" | "expired" | "revoked";

export type LicenseRecord = {
  key: string;
  userId: string;
  plan: LicensePlan;
  status: LicenseStatus;
  expiresAt: string | null;
  dailyCreditLimit: number;
  usedToday: number;
  maxDevices: number;
  devices: string[];
  createdAt: string;
};

export type UsageRecord = {
  id: string;
  licenseKey: string;
  deviceId: string;
  creditsUsed: number;
  action: string;
  model?: string;
  createdAt: string;
};

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

export const db = {
  licenses: new Map<string, LicenseRecord>([
    [
      "DEV-TEST-ACTIVE-KEY",
      {
        key: "DEV-TEST-ACTIVE-KEY",
        userId: "dev-user-001",
        plan: "monthly",
        status: "active",
        expiresAt: tomorrow,
        dailyCreditLimit: 100,
        usedToday: 29.64,
        maxDevices: 3,
        devices: [],
        createdAt: new Date().toISOString(),
      },
    ],
    [
      "DEV-TEST-EXPIRED-KEY",
      {
        key: "DEV-TEST-EXPIRED-KEY",
        userId: "dev-user-expired",
        plan: "trial",
        status: "expired",
        expiresAt: yesterday,
        dailyCreditLimit: 10,
        usedToday: 10,
        maxDevices: 1,
        devices: [],
        createdAt: new Date().toISOString(),
      },
    ],
  ]),
  usage: [] as UsageRecord[],
};

export function resetDailyUsageIfNeeded(record: LicenseRecord) {
  // MVP: in-memory demo only. Replace with date-bucketed usage query in PostgreSQL.
  return record;
}
