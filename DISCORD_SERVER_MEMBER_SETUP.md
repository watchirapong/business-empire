# Discord Server Member Lookup Setup Guide

This guide explains how to set up Discord server member lookup functionality that allows you to get user information from Discord servers where both the bot and user are members.

## 🎯 What This Does

- ✅ **Fetch server member data** for authenticated users
- ✅ **Get server-specific information** like roles, nickname, join date
- ✅ **Display server and user details** in a beautiful UI
- ✅ **Verify user membership** in specific Discord servers

## 🔧 Setup Requirements

### 1. Discord Bot Setup

1. **Go to Discord Developer Portal**: https://discord.com/developers/applications
2. **Create a new application** or use existing one
3. **Go to "Bot" section** and create a bot
4. **Copy the bot token** (you'll need this)

### 2. Bot Permissions

Your Discord bot needs these permissions:
- `guilds.members.read` - Read server member information
- `guilds.read` - Read server information

### 3. Environment Variables

Add these to your `.env` file:

```env
# Existing variables...
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://hamsterhub.fun

# New variable for bot functionality
DISCORD_BOT_TOKEN=your-discord-bot-token-here
```

### 4. Invite Bot to Server

Generate an invite link with these scopes:
- `bot`
- `guilds.members.read`
- `guilds.read`

Example invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=1024&scope=bot
```

## 🚀 How to Use

### 1. API Endpoints

#### GET `/api/discord/server-member`
Query parameters:
- `guildId` - Discord server ID
- `userId` - User ID to look up

#### POST `/api/discord/server-member`
Body:
```json
{
  "guildId": "123456789012345678"
}
```

### 2. React Component Usage

```tsx
import DiscordServerMember from '@/components/DiscordServerMember';

export default function MyPage() {
  return (
    <div>
      <DiscordServerMember />
    </div>
  );
}
```

### 3. Manual API Call

```javascript
// Get member info for authenticated user
const response = await fetch('/api/discord/server-member', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    guildId: '123456789012345678' 
  }),
});

const data = await response.json();
console.log(data);
```

## 📊 Response Data Structure

```json
{
  "member": {
    "user": { "id": "123", "username": "user", "avatar": "abc" },
    "nick": "Server Nickname",
    "roles": ["role1", "role2"],
    "joined_at": "2023-01-01T00:00:00.000Z"
  },
  "guild": {
    "id": "123456789012345678",
    "name": "My Server",
    "icon": "server_icon_hash"
  },
  "serverInfo": {
    "guildId": "123456789012345678",
    "userId": "123",
    "joinedAt": "2023-01-01T00:00:00.000Z",
    "roles": ["role1", "role2"],
    "nick": "Server Nickname",
    "avatar": "user_avatar_hash",
    "guildName": "My Server",
    "guildIcon": "server_icon_hash"
  }
}
```

## 🛡️ Security Features

- ✅ **Authentication required** - Only logged-in users can access
- ✅ **User verification** - Can only look up own member data
- ✅ **Error handling** - Proper error messages for various scenarios
- ✅ **Rate limiting** - Built-in protection against abuse

## 🔍 Error Handling

### Common Error Responses

```json
// User not in server
{
  "error": "User not found in server",
  "member": null
}

// Invalid server ID
{
  "error": "Failed to fetch server member data",
  "details": "Discord API error details"
}

// Not authenticated
{
  "error": "Unauthorized"
}
```

## 🎨 UI Features

The React component includes:
- ✅ **Beautiful design** matching your black/orange/white theme
- ✅ **Loading states** with proper feedback
- ✅ **Error display** with clear messages
- ✅ **Responsive layout** for mobile and desktop
- ✅ **Server icons** and user avatars
- ✅ **Role display** with visual badges

## 🔧 Troubleshooting

### Bot Not Working
1. Check bot token is correct
2. Verify bot has proper permissions
3. Ensure bot is in the target server
4. Check bot is online

### API Errors
1. Verify environment variables
2. Check Discord API status
3. Ensure user is authenticated
4. Verify server ID is correct

### Permission Issues
1. Bot needs `guilds.members.read` permission
2. Bot must be in the target server
3. User must also be in the server

## 📝 Example Usage in Profile Page

You can integrate this into your profile page:

```tsx
// In src/app/profile/page.tsx
import DiscordServerMember from '@/components/DiscordServerMember';

// Add this section to your profile page
<div className="mt-8">
  <DiscordServerMember />
</div>
```

## 🎯 Next Steps

1. **Add bot token** to your `.env` file
2. **Invite bot** to your Discord server
3. **Test the functionality** with the React component
4. **Integrate** into your existing pages as needed

This setup allows you to fetch and display Discord server member information for authenticated users, providing a rich integration between your web app and Discord servers! 🐹✨
