module.exports = {
    apps: [
      {
        name: "metahup-pastoral",
        script: "./dist/server.js",
        env: {
          APP_ENV: "pastoraltmgdk"
        }
      },
      {
        name: "metahup-guezel",
        script: "./dist/server.js",
        env: {
          APP_ENV: "guezelwebdesign"
        }
      }
    ]
  };
    // Production configuration
    // Deploy configuration  
    //pm2 start ecosystem.config.js
