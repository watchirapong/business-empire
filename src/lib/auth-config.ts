import Discord from "next-auth/providers/discord";

export const authConfig = {
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
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
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
    async jwt({ token, account, profile }: any) {
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
    async session({ session, token }: any) {
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
};
