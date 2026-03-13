module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "/app/apps/frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" }
    },
    {
      name: "backend",
      cwd: "/app/apps/backend",
      script: "dist/server.js",
      env: { NODE_ENV: "production" }
    }
  ]
}
