import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth-config";

console.log('NextAuth Configuration Debug:');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');

const handler = NextAuth({
  ...authConfig,
  debug: true,
  logger: {
    error(code, ...message) {
      console.error(`[NextAuth Error] ${code}:`, ...message);
    },
    warn(code, ...message) {
      console.warn(`[NextAuth Warning] ${code}:`, ...message);
    },
    debug(code, ...message) {
      console.log(`[NextAuth Debug] ${code}:`, ...message);
    },
  },
});

export { handler as GET, handler as POST };
