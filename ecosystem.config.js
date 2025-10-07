module.exports = {
  apps: [
    {
      name: 'business-empire',
      script: 'server.js',
      cwd: '/root/projects/business-empire',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Production optimizations
      node_args: '--max-old-space-size=2048',
      // Health monitoring
      health_check_grace_period: 3000,
      // Process management
      force: true,
      // Logging
      log_type: 'json',
      // Performance
      increment_var: 'PORT'
    }
  ]
};