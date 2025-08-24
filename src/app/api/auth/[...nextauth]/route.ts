import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

console.log('NextAuth Configuration Debug:');
console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
console.log('DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');

const handler = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
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
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback triggered:', { 
        provider: account?.provider, 
        userId: (profile as any)?.id,
        username: (profile as any)?.username 
      });
      
      if (account?.provider === "discord" && profile) {
        try {
          // Save basic user data to MongoDB
          const basicUserData = {
            id: (profile as any).id,
            username: (profile as any).username,
            email: user.email,
            avatar: (profile as any).avatar,
            discriminator: (profile as any).discriminator,
            globalName: (profile as any).global_name,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
          };

          console.log('Saving user data to MongoDB:', basicUserData);

          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(basicUserData),
          });

          if (!response.ok) {
            console.error('Failed to save basic user data to MongoDB:', response.status, response.statusText);
          } else {
            console.log('Successfully saved basic user data to MongoDB');
          }

        } catch (error) {
          console.error('Error saving user to MongoDB:', error);
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.id = (profile as any).id;
        token.username = (profile as any).username;
        token.discriminator = (profile as any).discriminator;
        token.avatar = (profile as any).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).discriminator = token.discriminator;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
