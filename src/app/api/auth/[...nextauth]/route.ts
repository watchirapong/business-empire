import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

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

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        try {
          // First, save basic user data to MongoDB
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

          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(basicUserData),
          });

          if (!response.ok) {
            console.error('Failed to save basic user data to MongoDB');
          } else {
            console.log('Successfully saved basic user data to MongoDB');
          }

          // Note: Currency account will be created when user first accesses their balance
          // Skip server data fetching during login to avoid timeouts
          console.log('Login successful, skipping server data fetch to prevent timeout');
          
          // Commented out server data fetching to fix login timeout issues
          /*
          // Then, fetch Discord server member data for the specific server
          // We'll do this asynchronously to avoid blocking the sign-in process
          setTimeout(async () => {
            try {
              console.log('Attempting to fetch Discord server member data...');
              
              // Use the bot token directly for server member lookup
              if (process.env.DISCORD_BOT_TOKEN) {
                const discordResponse = await fetch(
                  `https://discord.com/api/v10/guilds/699984143542517801/members/${(profile as any).id}`,
                  {
                    headers: {
                      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );

                if (discordResponse.ok) {
                  const memberData = await discordResponse.json();
                  
                  // Also fetch guild information
                  const guildResponse = await fetch(
                    `https://discord.com/api/v10/guilds/699984143542517801`,
                    {
                      headers: {
                        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  let guildData = null;
                  if (guildResponse.ok) {
                    guildData = await guildResponse.json();
                  }

                  // Prepare the combined data
                  const serverMemberData = {
                    member: memberData,
                    guild: guildData,
                    serverInfo: {
                      guildId: '699984143542517801',
                      userId: (profile as any).id,
                      joinedAt: memberData.joined_at,
                      roles: memberData.roles || [],
                      nick: memberData.nick || null,
                      avatar: memberData.avatar || null,
                      guildName: guildData?.name || null,
                      guildIcon: guildData?.icon || null,
                    }
                  };

                  // Save server member data to MongoDB
                  const serverDataResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/users/save-server-data`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      userId: (profile as any).id,
                      serverId: '699984143542517801',
                      serverData: serverMemberData
                    }),
                  });

                  if (!serverDataResponse.ok) {
                    console.error('Failed to save server member data to MongoDB');
                  } else {
                    console.log('Successfully saved server member data to MongoDB');
                  }
                } else {
                  console.log('User not found in Discord server or server lookup failed');
                }
              } else {
                console.error('Discord bot token not configured');
              }
            } catch (serverError) {
              console.error('Error fetching server member data:', serverError);
            }
          }, 1000); // Delay by 1 second to ensure session is established
          */

        } catch (error) {
          console.error('Error saving user to MongoDB:', error);
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      console.log('JWT callback - profile:', { id: (profile as any)?.id, username: (profile as any)?.username });
      console.log('JWT callback - token before:', { id: token.id, username: token.username });
      
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.id = (profile as any).id;
        token.username = (profile as any).username;
        token.discriminator = (profile as any).discriminator;
        token.avatar = (profile as any).avatar;
      }
      
      console.log('JWT callback - token after:', { id: token.id, username: token.username });
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      console.log('Session callback - token:', { id: token.id, username: token.username });
      console.log('Session callback - session before:', { user: session.user });
      
      (session as any).accessToken = token.accessToken;
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).discriminator = token.discriminator;
        (session.user as any).avatar = token.avatar;
      }
      
      console.log('Session callback - session after:', { user: session.user });
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export { handler as GET, handler as POST };
