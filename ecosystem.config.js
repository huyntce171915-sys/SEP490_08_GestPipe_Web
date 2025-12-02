const path = require('path');

module.exports = {
  apps: [
    {
      name: "GestPipe-Backend",
      // Use absolute path for script
      script: path.join(__dirname, "SEP490_08_GestPipe_WebApplication", "backend", "server.js"),
      // Set CWD to the backend folder so relative paths inside server.js work (like .env)
      cwd: path.join(__dirname, "SEP490_08_GestPipe_WebApplication", "backend"),
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: "GestPipe-Frontend",
      // Use absolute path for script
      script: path.join(__dirname, "SEP490_08_GestPipe_WebApplication", "frontend", "node_modules", "react-scripts", "scripts", "start.js"),
      // Set CWD to frontend folder
      cwd: path.join(__dirname, "SEP490_08_GestPipe_WebApplication", "frontend"),
      env: {
        PORT: 3000,
        BROWSER: "none"
      }
    }
  ]
};
