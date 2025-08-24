module.exports = {
  apps: [
    {
      name: 'business-empire',
      script: 'npm',
      args: 'start',
      cwd: '/root/projects/business-empire',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGODB_URI: 'mongodb://localhost:27017/business-empire',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
        NEXTAUTH_URL: 'https://hamsterhub.fun',
        DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
        DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G'
    }
  ]
};
