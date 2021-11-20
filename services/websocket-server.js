const axios = require("axios");
const WebSocket = require(`ws`);
const utils = require("../utils/tdd/src/helpers/utils");

// function makeid(length) {
//   var result = '';
//   var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//   var charactersLength = characters.length;
//   for ( var i = 0; i < length; i++ ) {
//     result += characters.charAt(Math.floor(Math.random() * charactersLength));
//  }
//   return result;
// }

class WebSoketServer {
  constructor({ server }) {
    this.server = server;
  }

  create() {
    const wss = new WebSocket.Server({ server: this.server });

    let user;

    let connectMessage = {
      type: "CONNECT",
      payload: {
        success: true,
      },
    }

    let errorMesssage = {
      type: "ERROR",
      payload: {
        message: ""
      },
    }

    let historyResponse = {
      type: "HISTORY",
      payload: [],
    }

    wss.on('connection', function connection(ws, req) {
      ws.on('message', async function incoming(message) {
        try {
          const messageObj = JSON.parse(message);
          console.log('messageObj: ', messageObj);
          // ws.send("Received correct format message");
          let dbQuery, dbSubscriberQuery, dbRequestsQuery;

          switch(messageObj.type)
          {
            case "CONNECT":
              dbQuery = await strapi.query('subscriber').find({username: messageObj.payload.name});
              if (dbQuery.length === 0){
                user = await strapi.query('subscriber').create({
                  username: messageObj.payload.name,
                });
                ws.send(JSON.stringify(connectMessage));
              }
              else{
                user = dbQuery[0];
                ws.send(JSON.stringify(connectMessage));
              }
              console.log("dbQuery: ", dbQuery);
              break;
            case "GET_DATA":
              dbSubscriberQuery = await strapi.query('subscriber').findOne(user);

              // console.log("SubscriberQuery", dbSubscriberQuery);
              if (dbSubscriberQuery)
              {
                dbQuery = await strapi.query('request').create({
                  type: "GET_DATA",
                  symbol: messageObj.payload.symbol,
                  username: dbSubscriberQuery,
                });

                // let lastRequestId = await strapi.query('request').find({symbol: messageObj.payload.symbol});

                // lastRequestId = lastRequestId[lastRequestId.length - 1].id;

                dbSubscriberQuery.requests.push(dbQuery.id);

                // console.log(dbSubscriberQuery.requests);

                strapi.query('subscriber').update({
                  username: messageObj.payload.name,
                },{
                  requests: dbSubscriberQuery.requests,
                });

                let coinList = await axios.get(`https://api.coingecko.com/api/v3/coins/list`); //better with cache
                
                let coinId = coinList.data.map(val => val['symbol'] == messageObj.payload.symbol ? val['id'] : null)
                .filter(val => val !== null)[0];

                let coinRequest = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);

                // console.log(coinRequest);

                if (coinRequest.status === 200){
                  ws.send(JSON.stringify(
                    {
                      type: "GET_DATA", 
                      payload: coinRequest.data,
                    }));
                }
                else{
                  console.log(`HTTP error: ${coinRequest.status}`);
                  ws.send(errorMesssage.payload.message = coinRequest.statusText);
                }
              }
              else{
                ws.send(JSON.stringify(errorMesssage.payload.message = "You are not a subscriber. Connect first."));
              }
              break;
            case "HISTORY":
              // dbSubscriberQuery = await strapi.query("subscriber").find({user});

              // let requests = dbSubscriberQuery.requests;

              dbRequestsQuery = await strapi.query("request").find({username: user.id, type_in: messageObj.payload.types});

              console.log(dbRequestsQuery);

              dbRequestsQuery.forEach(request => historyResponse.payload.push({
                type: request.type,
                symbol: request.symbol,
                created_at: request.created_at,
              }));

              ws.send(JSON.stringify(historyResponse));
              historyResponse.payload = [];
              break;
            default:
              errorMesssage.payload.message = `Passed message should be JSON.parse'able`;
              ws.send(JSON.stringify(errorMesssage));
          }
        } 
        catch (error) {
          console.log('error: ', error);
          if (error.isPrototypeOf(SyntaxError)) //add other errors
          {
            errorMesssage.payload.message = `Passed message should be JSON.parse'able`;
            ws.send(JSON.stringify(errorMesssage)); 
          }
          // errorMesssage.payload.message = error.message;
          // ws.send(JSON.stringify(errorMesssage));
        }
      });
    });
  }
}

module.exports = { WebSoketServer };
