module.exports = {
  apps: [{
    name: 'business-empire',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      NEXTAUTH_URL: 'https://hamsterhub.fun',
      NEXTAUTH_SECRET: 'business-empire-secret-key-2024',
      DISCORD_CLIENT_ID: '1402212628956315709',
      DISCORD_CLIENT_SECRET: 'E25_5pH0IWbwc9gnImi85S8tTdOVy1KY'
    }
  }]
};
