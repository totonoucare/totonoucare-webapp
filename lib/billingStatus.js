import { getPremiumStatus } from "@/lib/premium";
import { getRecordsAccess } from "@/lib/records/access";
import { stripeModeFromSecret } from "@/lib/stripeMode";

export async function getBillingStatus(userId) {
  const [premium, access] = await Promise.all([
    getPremiumStatus(userId),
    getRecordsAccess(userId),
  ]);

  return {
    ...premium,
    access,
    stripe_mode: stripeModeFromSecret(),
  };
}
