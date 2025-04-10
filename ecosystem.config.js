module.exports = {
  apps: [{
    name: "railway-management",
    script: "server.js",
    watch: true,
    env: {
      NODE_ENV: "development",
      PORT: 3000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
} 