type Args = {
  serverUrl: string;
  adminToken: string;
  plan: "trial" | "monthly" | "yearly" | "lifetime";
  count: number;
  days?: number;
  dailyCreditLimit: number;
  maxDevices: number;
};

function readArgs(): Args {
  const args = process.argv.slice(2);
  const get = (name: string, fallback?: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : fallback;
  };

  return {
    serverUrl: get("server", process.env.SERVER_URL ?? "http://localhost:9182")!,
    adminToken: get("admin-token", process.env.ADMIN_TOKEN ?? "change-me-admin-token")!,
    plan: (get("plan", "monthly") as Args["plan"]),
    count: Number(get("count", "10")),
    days: get("days") ? Number(get("days")) : undefined,
    dailyCreditLimit: Number(get("daily-credit-limit", "100")),
    maxDevices: Number(get("max-devices", "1")),
  };
}

async function main() {
  const args = readArgs();
  const response = await fetch(`${args.serverUrl}/api/admin/licenses/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${args.adminToken}`,
    },
    body: JSON.stringify({
      plan: args.plan,
      count: args.count,
      days: args.days,
      dailyCreditLimit: args.dailyCreditLimit,
      maxDevices: args.maxDevices,
    }),
  });

  const body = await response.json();
  if (!response.ok || !body.ok) {
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log("Generated license keys:");
  for (const key of body.keys) {
    console.log(key);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
