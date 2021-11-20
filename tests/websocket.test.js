const tdd = require("../utils/tdd/index");
const axios = require("axios");

beforeAll(async () => {
  await tdd.setupStrapi();
  await tdd.createHttpServer();
});

describe(`WebSocket`, () => {
  describe(`Валидаторы`, () => {
    it(`должен отправлять сообщение с ошибкой, если передано сообщение не в формате JSON`, async () => {
      // Запрос, который должен выбросить ошибку
      const message = `wrong message`;

      // Отправляем запрос и парсим ответ
      const { res: response } = await tdd.wsCreateAndSendMessage(message); //?
      const result = JSON.parse(response);
      console.log("result", result);
      expect(result.type).toEqual(`ERROR`);
      expect(result.payload.message).toEqual(
        `Passed message should be JSON.parse'able`
      );
    });
  });

  describe(`CONNECT`, () => {
    it(`должен добавлять пользователя в БД и отправлять сообщение о успешности подключения, если пользователь не был подключался до этого`, async () => {
      // Запрос на подключение пользователя
      const message = JSON.stringify({
        type: "CONNECT",
        payload: {
          name: `User#${parseInt(Math.random() * 10000)}`,
        },
      }); //?

      // Следим за методом добавления subscriber в БД, он должен быть вызван
      const spyToDbQuerySubscriberCreate = jest.spyOn(
        strapi.db.query("subscriber"),
        "create"
      );

      // Отправляем запрос и парсим ответ
      const { res: response } = await tdd.wsCreateAndSendMessage(message); //?
      const result = JSON.parse(response);

      expect(result.type).toEqual(`CONNECT`);
      expect(result.payload.success).toEqual(true);
      expect(spyToDbQuerySubscriberCreate).toHaveBeenCalled();
    });

    it("должен брать пользователя из БД, если он уже был добавлен", async () => {
      // Запрос на подключение пользователя
      const message = JSON.stringify({
        type: "CONNECT",
        payload: {
          name: `User#${parseInt(Math.random() * 10000)}`,
        },
      }); //?

      // Отправляем запрос, чтобы пользователь был добавлен в БД
      await tdd.wsCreateAndSendMessage(message);

      // Следим за методом добавления нового subscriber в БД. Этот метод не должен вызываться, так как subscriber'а мы уже создали выше
      const spyToDbQuerySubscriberCreate = jest.spyOn(
        strapi.db.query("subscriber"),
        "create"
      );

      // Следим за методом поиска subscriber в БД. Этот метод должен быть вызван
      const spyToDbQuerySubscriberFind = jest.spyOn(
        strapi.db.query("subscriber"),
        "find"
      );

      // Отправляем запрос и парсим ответ
      const { res: response } = await tdd.wsCreateAndSendMessage(message); //?
      const result = JSON.parse(response);

      expect(result.type).toEqual(`CONNECT`);
      expect(result.payload.success).toEqual(true);
      expect(spyToDbQuerySubscriberFind).toHaveBeenCalled();
      expect(spyToDbQuerySubscriberCreate).not.toHaveBeenCalled();
    });
  });

  describe("GET_DATA", () => {
    it("должен запрашивать данные с coingecko, отдавать полученные данные и записывать запрос в историю", async () => {
      // Запрос на подключение пользователя
      const subscriberName = `User#${parseInt(Math.random() * 10000)}`;
      const connectMessage = JSON.stringify({
        type: "CONNECT",
        payload: {
          name: subscriberName,
        },
      }); //?

      // Запрос на получение данных, передаем мы symbol
      const getDataMessage = JSON.stringify({
        type: "GET_DATA",
        payload: {
          symbol: "zefu",
        },
      }); //?

      // Следим за добавлениями новых requests в БД, должен быть вызван
      const spyToDbQueryRequestCreate = jest.spyOn(
        strapi.db.query("request"),
        "create"
      );

      // Следим за axios, он должен отправить запрос на https://api.coingecko.com/api/v3/coins/zenfuse
      const spyToAxiosGet = jest.spyOn(axios, "get");

      // Отправляем запрос на подключение и берем объект сокета, через него мы отправим второй запрос
      const { socket } = await tdd.wsCreateAndSendMessage(connectMessage); //?
      // Сохраняем ответы с сокета в массив, чтобы потом проверить их
      const responses = [];
      socket.on("message", (message) => responses.push(JSON.parse(message)));

      // От имени пользователя отправляем запрос на получение данных
      socket.send(getDataMessage);

      // Ожидаем пока сервис ответит
      await tdd.waitForResponse(() => {}, 2000);

      // Запрос должен быть связан с subscriber, который запрашивает информацию. Поэтому нужно взять длинну массива requests у subscriber, должен быть 1 request
      const requestedSubscriber = await strapi.services["subscriber"].find({
        name: subscriberName,
      }); //?

      expect(spyToAxiosGet).toHaveBeenCalledWith(
        "https://api.coingecko.com/api/v3/coins/zenfuse"
      );
      expect(spyToAxiosGet).toHaveBeenCalledWith([
        "https://api.coingecko.com/api/v3/coins/zenfuse",
      ]);
      expect(responses[0].type).toEqual("GET_DATA");
      expect(responses[0].payload.platforms.ethereum).toEqual(
        "0xb1e9157c2fdcc5a856c8da8b2d89b6c32b3c1229"
      );
      expect(requestedSubscriber.requests.length).toEqual(1);
      expect(spyToDbQueryRequestCreate).toHaveBeenCalled();
      axios.mockRestore();
    });
  });

  describe("HISTORY", () => {
    it("должен возвращать массив с запросами пользователя", async () => {
      // Запрос на создание пользователя
      const connectMessage = JSON.stringify({
        type: "CONNECT",
        payload: {
          name: `User#${parseInt(Math.random() * 10000)}`,
        },
      }); //?

      // Отправляем запрос, чтобы пользователь был добавлен в БД
      await tdd.wsCreateAndSendMessage(connectMessage);

      // Запросы на получение данных, передаем мы symbol
      const getDataMessage1 = JSON.stringify({
        type: "GET_DATA",
        payload: {
          symbol: "zefu",
        },
      }); //?
      const getDataMessage2 = JSON.stringify({
        type: "GET_DATA",
        payload: {
          symbol: "btc",
        },
      }); //?

      // Запрос на получение history
      const getHistoryMessage = JSON.stringify({
        type: "HISTORY",
        payload: {
          types: ["GET_DATA"],
        },
      });

      // Отправляем запрос на подключение и берем объект сокета, через него мы отправим второй запрос
      const { socket } = await tdd.wsCreateAndSendMessage(connectMessage); //?

      // От имени пользователя отправляем запрос на получение данных
      socket.send(getDataMessage1);

      // Ожидаем пока сервис ответит
      await tdd.waitForResponse(() => {}, 2000);

      // От имени пользователя отправляем запрос на получение данных
      socket.send(getDataMessage2);

      // Ожидаем пока сервис ответит
      await tdd.waitForResponse(() => {}, 2000);

      // Сохраняем ответы с сокета в массив, чтобы потом проверить их
      const responses = [];
      socket.on("message", (message) => responses.push(JSON.parse(message)));
      // От имени пользователя отправляем запрос на получение данных
      socket.send(getHistoryMessage);

      // Ожидаем пока сервис ответит
      await tdd.waitForResponse(() => {}, 2000);

      expect(responses[0].type).toEqual("HISTORY");
      expect(responses[0].payload.GET_DATA.length).toEqual(2);
    });
  });
});
