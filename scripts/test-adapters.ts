import { bukkuAdapter } from '../src/lib/adapters/bukku';
import { katsanaAdapter } from '../src/lib/adapters/katsana';

async function main() {
  console.log("=== Testing Katsana Adapter ===");
  const loc = await katsanaAdapter.fetchLocation('BUS-123');
  console.log("Katsana Location result:", loc);

  console.log("\n=== Testing Bukku Adapter ===");
  const invoice = await bukkuAdapter.createInvoice('John Doe Parent', 150.00, new Date());
  console.log("Bukku Invoice result:", invoice);
}

main().catch(console.error);
