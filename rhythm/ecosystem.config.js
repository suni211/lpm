module.exports = {
  apps: [
    {
      name: 'rhythm-server',
      script: './server/dist/index.js',
      cwd: './rhythm',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5003
      },
      error_file: './logs/rhythm-error.log',
      out_file: './logs/rhythm-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false
    }
  ]
};
