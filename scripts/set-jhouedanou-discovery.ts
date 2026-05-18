import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(url, key);
const EMAIL = "jhouedanou@gmail.com";

async function main() {
  const { data, error } = await supabase
    .from("users")
    .update({
      plan: "Discovery",
      subscription_status: "active",
    })
    .eq("email", EMAIL)
    .select("id, email, plan, subscription_status");

  if (error) {
    console.error("Update failed:", error);
    process.exit(1);
  }
  console.log("Updated:", data);
}

main();
