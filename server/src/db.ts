import fs from "node:fs";
import path from "node:path";

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
  usageDate: string;
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

type SerializedDb = {
  licenses: LicenseRecord[];
  usage: UsageRecord[];
};

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const dbPath = process.env.DB_PATH ?? path.join(dataDir, "db.json");
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function seedLicenses(): LicenseRecord[] {
  return [
    {
      key: "DEV-TEST-ACTIVE-KEY",
      userId: "dev-user-001",
      plan: "monthly",
      status: "active",
      expiresAt: tomorrow,
      dailyCreditLimit: 100,
      usedToday: 29.64,
      usageDate: today(),
      maxDevices: 3,
      devices: [],
      createdAt: new Date().toISOString(),
    },
    {
      key: "DEV-TEST-EXPIRED-KEY",
      userId: "dev-user-expired",
      plan: "trial",
      status: "expired",
      expiresAt: yesterday,
      dailyCreditLimit: 10,
      usedToday: 10,
      usageDate: today(),
      maxDevices: 1,
      devices: [],
      createdAt: new Date().toISOString(),
    },
  ];
}

function loadSerializedDb(): SerializedDb {
  if (!fs.existsSync(dbPath)) {
    return { licenses: seedLicenses(), usage: [] };
  }

  const raw = fs.readFileSync(dbPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<SerializedDb>;
  return {
    licenses: parsed.licenses ?? seedLicenses(),
    usage: parsed.usage ?? [],
  };
}

const serialized = loadSerializedDb();

export const db = {
  licenses: new Map<string, LicenseRecord>(serialized.licenses.map((license) => [license.key, license])),
  usage: serialized.usage,
};

export function saveDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const serializedDb: SerializedDb = {
    licenses: [...db.licenses.values()],
    usage: db.usage,
  };
  fs.writeFileSync(dbPath, JSON.stringify(serializedDb, null, 2));
}

export function resetDailyUsageIfNeeded(record: LicenseRecord) {
  const currentDay = today();
  if (record.usageDate !== currentDay) {
    record.usageDate = currentDay;
    record.usedToday = 0;
    saveDb();
  }
  return record;
}

saveDb();
