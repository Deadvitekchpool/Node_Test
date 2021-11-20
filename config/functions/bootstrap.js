"use strict";

const { WebSoketServer } = require("../../services/websocket-server");

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */

module.exports = async () => {
  try {
    strapi; //?

    console.log("sub",  await strapi.query('subscriber').find({username: `User`}));
    if(strapi) {
      // console.log('strapi.server', strapi.server);

      const WSServer = new WebSoketServer({ server: strapi.server });
      await WSServer.create();
    }

  } catch (err) {
    console.error(err);
  }
};
