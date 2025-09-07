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
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      node_args: '--max-http-header-size=65536 --max-old-space-size=8192'
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
