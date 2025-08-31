module.exports = {
  apps: [
    {
      name: 'business-empire',
      script: 'npm',
      args: 'start',
      cwd: '/root/projects/business-empire',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-http-header-size=65536 --max-old-space-size=4096'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-http-header-size=65536 --max-old-space-size=4096'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      node_args: '--max-http-header-size=65536 --max-old-space-size=4096'
    },
    {
      name: 'checkin',
      script: 'npm',
      args: 'run checkin',
      cwd: '/root/projects/checkin',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
