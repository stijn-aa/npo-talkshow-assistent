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

const pauwUrl = 'https://pauw.bnnvara.nl/gemist/fragment/datum/altijd/pagina/';
let list = [];


app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.json(list)
});

const getTopic = {
  pauw: async function () {
    let pauw = [];
    for (a = 1; a < 9; a++) {
      await rp(pauwUrl + a) //pauw
        .then(function (html) {
          const length = $('.card-title', html).length;
          for (let i = 0; i < length; i++) {
            const date = $('.card-footer > span > .meta-date', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
            const topic = $('.card-footer > a > h3', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
            obj = {}
            obj.date = new Date(setDate(date))
            //console.log(new Date(setDate(date)))
            obj.topic = topic
            if (!pauw.includes(obj)) {
              pauw.push(obj);
            }
          }
        })
        .catch(function (err) {
          //handle error
        });
    }
    host = {
      "pauw": pauw
    }
    list.push(host)
    //console.log(list)
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

function selector(_host, reqdate) {
  let topics = []
  //console.log(_host)
  list.forEach(host => {
    // console.log(_host, Object.keys(host).toString())
    if (Object.keys(host).toString() === _host) {
      //console.log(Object.values(host)[0])
      Object.values(host)[0].forEach(element => {
        //console.log(element.date.toISOString().split("T")[0], reqdate.toISOString().split("T")[0])
        if (element.date.toISOString().split("T")[0] === reqdate.toISOString().split("T")[0]) {
            topics.push(element.topic)
          console.log("push")
        }
      })
    }
  })
  for (a = 0; a < topics.length; a++) {
    topics[a] = " " + topics[a]
    if (a === topics.length - 1) {
      topics[a] = "En" + topics[a] + ". "
    }
  }
  console.log(topics)
  return topics
}

reqproces.intent('GetTopic', (conv, params) => {
  console.log(params)
  reqDate = new Date(params.date)
  topics = selector(params.talkshowNamen, reqDate)
  if (topics.length !== 0) {
    conv.ask(`<speak> Ik heb ${topics.length} onderwerpen gevonden. <break time='0.5' /> ${topics.toString().replace(/,/gm, ". <break time='0.5' /> ")} </speak>`);
    conv.ask(`Wil je nog wat weten?`);

  } else if (params.talkshowNamen === "pauw") {
    conv.ask(`<speak> Ik heb niks voor je kunnen vinden op  <say-as interpret-as="date" format="yyyymmdd" detail="1">${reqDate.toISOString().split("T")[0]}</say-as></speak>`);
    conv.ask(`Wil je nog wat weten?`);
  } else {
    conv.ask(`${params.talkshowNamen} is nog niet toegevoegd aan de app. Tot nu toe ken ik alleen de onderwerpen van pauw.`);
    conv.ask(`Wil je nog wat weten?`);
  }
});

app.post('/webhook', reqproces);

getTopic.pauw();

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Our app is running on port ${ PORT }`);
})