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

const pauw = 'https://pauw.bnnvara.nl/gemist/fragment/datum/altijd/pagina/';
const list = [];

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.json(list)
});

const getTopic = {
  pauw: function (a) {
    rp(pauw + a) //pauw
      .then(function (html) {
        const length = $('.card-title', html).length;
        for (let i = 0; i < length; i++) {
          const date = $('.card-footer > span > .meta-date', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
          const topic = $('.card-footer > a > h3', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
          obj = {}
          obj.date = new Date(setDate(date))
          //console.log(new Date(setDate(date)))
          obj.topic = topic
          list.push(obj);
        }
      })
      .then(function () {
        console.log(list)
      })

      .catch(function (err) {
        //handle error
      });


  }
}


let month = new Map()

month.set("maart", "March");
month.set("mei", "May");
month.set("juni", "June");
month.set("juli", "July");
month.set("augustus", "August");
month.set("februari", "February");

function setDate(date) {
  const part = date.split(" ")

  if (month.has(part[1])) {
    part[1] = month.get(part[1])
  }

  newDate = part.reverse().join(" ")

  return newDate
}


function selector(reqdate) {
  let topics = []
  list.forEach(element => {
    //console.log(element.date.toISOString().split("T")[0] , reqdate.toISOString().split("T")[0])
    if (element.date.toISOString().split("T")[0] === reqdate.toISOString().split("T")[0]) {
      topics.push(element.topic)
    }
  })

  for (a = 0; a < topics.length; a++) {
    topics[a] = topics[a] + ". "
    if (a === topics.length - 1) {
      topics[a] = "En " + topics[a] + ". "
    }
  }
  console.log(topics)
  return topics
}


reqproces.intent('GetTopic', (conv, params) => {

  reqDate = new Date(params.date)
  topics = selector(reqDate)
  if (topics.length !== 0) {
    conv.ask(`ik heb ${topics.length} onderwerpen gevonden`);

    conv.close(`${topics.toString()}`);

  } else {
    conv.ask(`ik heb niks voor je kunnen vinden`);
  }

});

app.post('/webhook', reqproces);

async function init() {
  for (a = 1; a < 9; a++) {
    await getTopic.pauw(a)
  }
}

init()

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Our app is running on port ${ PORT }`);
})