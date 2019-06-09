const express = require("express");
const app = express();
const server = require('http').createServer(app);
const rp = require('request-promise');
const $ = require('cheerio');
const bodyParser = require('body-parser');
const {
  dialogflow,
  actionssdk,
  Image,
  Table,
  Carousel,
} = require('actions-on-google');
const reqproces = dialogflow({
  debug: true
});

const pauw = 'https://pauw.bnnvara.nl/gemist/fragment/datum/altijd/pagina/1';
const list = [];

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.json(list)
});

const getTopic = {
  pauw: function () {
    rp(pauw) //pauw
      .then(function (html) {
        const length = $('.card-title', html).length;
        for (let i = 0; i < length; i++) {
          const date = $('.card-footer > span > .meta-date', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
          const topic = $('.card-footer > a > h3', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
          console.log(date)
          obj = {}
          obj.date = new Date(date)
          obj.topic = topic
          list.push(obj);
        }
      })
      .catch(function (err) {
        //handle error
      });
    console.log(list)
    
  }
}



function selector(reqdate) {
  let topics = []
  list.forEach(element => {
    console.log(element.date.toISOString().split("T")[0], reqdate.toISOString().split("T")[0])
    if (element.date.toISOString().split("T")[0] === reqdate.toISOString().split("T")[0]) {
      topics.push(element.topic)
    }
  })
  return topics
}


reqproces.intent('GetTopic', (conv, params) => {
  reqDate = new Date(params.date)
  if (selector(reqDate).length !== 0) {
    conv.ask(`ik heb ${selector(reqDate).length} onderwerpen gevonden`);
    conv.close(`${selector(reqDate).toString()}`);
  } else {
    conv.ask(`ik heb niks voor je kunnen vinden`);
  }
});

app.post('/webhook', reqproces);

getTopic.pauw()

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Our app is running on port ${ PORT }`);
})