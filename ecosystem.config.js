module.exports = {
  apps: [
    {
      name: "metahup-metahub",
      script: "./dist/server.js",
      env: {
        APP_ENV: "metahub",
      },
    },
    {
      name: "metahup-anastasia",
      script: "./dist/server.js",
      env: {
        APP_ENV: "anastasia",
      },
    },
    {
      name: "metahup-ensotek",
      script: "./dist/server.js",
      env: {
        APP_ENV: "ensotek",
      },
    },
    {
      name: "metahup-radanor",
      script: "./dist/server.js",
      env: {
        APP_ENV: "radanor",
      },
    },
  ],
};

    // Production configuration
    // Deploy configuration  
    //pm2 start ecosystem.config.js
