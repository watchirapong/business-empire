# Discord OAuth Setup Guide

## 🎮 Discord Authentication Setup

To enable Discord login in your Game Hub, follow these steps:

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give your application a name (e.g., "Game Hub")
4. Click "Create"

### 2. Configure OAuth2 Settings

1. In your Discord application, go to the "OAuth2" section in the left sidebar
2. Click on "General"
3. Copy the "Client ID" and "Client Secret"
4. Go to "OAuth2" → "Redirects"
5. Add the following redirect URL:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```

### 3. Update Environment Variables

1. Open the `.env.local` file in your project root
2. Replace the placeholder values with your actual Discord credentials:

```env
# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_actual_client_id_here
DISCORD_CLIENT_SECRET=your_actual_client_secret_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

### 4. Generate NextAuth Secret

Generate a random secret for NextAuth:

```bash
openssl rand -base64 32
```

Replace `your_random_secret_here` with the generated value.

### 5. Restart Your Application

After updating the environment variables, restart your development server:

```bash
npm run dev
```

## 🎯 Features

Once configured, users can:

- **Login with Discord** - Click the "Login with Discord" button
- **View Profile** - See their Discord username, avatar, and user ID
- **Access Games** - Play games while logged in
- **Logout** - Sign out from their account

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"** - Make sure the redirect URL in Discord matches exactly
2. **"Client ID not found"** - Verify your Discord Client ID is correct
3. **"Invalid client secret"** - Check your Discord Client Secret
4. **Environment variables not loading** - Restart your development server

### Security Notes:

- Never commit your `.env.local` file to version control
- Keep your Discord Client Secret secure
- Use different credentials for development and production

## 🚀 Ready to Use!

Once configured, your Game Hub will have full Discord authentication integration! 🎉
