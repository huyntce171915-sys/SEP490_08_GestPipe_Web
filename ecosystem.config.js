module.exports = {
  apps: [
    {
      name: "GestPipe-Backend",
      script: "./SEP490_08_GestPipe_WebApplication/backend/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      // Tự động khởi động lại khi file thay đổi (tùy chọn)
      watch: false, 
      // Giới hạn RAM (tùy chọn)
      max_memory_restart: '1G'
    },
    {
      name: "GestPipe-Frontend",
      cwd: "./SEP490_08_GestPipe_WebApplication/frontend",
      script: "npm",
      args: "start",
      env: {
        PORT: 3000
      }
    }
  ]
};
