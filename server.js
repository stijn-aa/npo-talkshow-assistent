const express = require("express");
const app = express();
const server = require('http').createServer(app);
const rp = require('request-promise');
const puppeteer = require('puppeteer');
const $ = require('cheerio');
const bodyParser = require('body-parser');
const path = require('path');

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
const dwddUrl = "https://dewerelddraaitdoor.bnnvara.nl/gemist/fragment/datum/altijd"
const jinekUrl = "https://evajinek.kro-ncrv.nl/uitzendingen/programma/jinek"
let list = [{
  "pauw": []
}, {
  "dwdd": []
}, {
  "jinek": []
}];

app.use(express.static('public'))
app.use(bodyParser.json());

app.get('/list', function (req, res) {
  res.json(list)
});
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

async function getTopicPauw() {
  for (a = 1; a < 9; a++) {
    await rp(pauwUrl + a) //pauw
      .then(function (html) {
        const length = $('.card-title', html).length;
        for (let i = 0; i < length; i++) {
          const date = $('.card-footer > span > .meta-date', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
          const topic = $('.card-footer > a > h3', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
          obj = {}
          obj.date = new Date(setDate(date))
          obj.topic = topic
          pushTopic("pauw", obj)
        }
      })

      .catch(function (err) {

      });
  }
}

async function getTopicDwdd() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  let selector = '[class="button expand lazyload"]';

  const page = await browser.newPage();

  await page.goto(dwddUrl, {
    waitUntil: 'networkidle2'
  });
  await page.waitFor(selector)
  await page.focus(selector)
  for (i = 0; i < 10; i++) {
    await page.click(selector)
    await page.waitFor(1000);
  }
  await page.evaluate(() => document.body.innerHTML)

    .then(function (html) {
      const length = $('.item-footer', html).length;
      ////console.log(length)
      for (let i = 0; i < length; i++) {
        const date = $('[pubdate="pubdate"]', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
        const topic = $('.item-footer > h3 > a', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
        ////console.log(topic)
        const newDate = date.substr(date.indexOf(" ") + 1)
        obj = {}
        obj.date = new Date(setDate(newDate))
        ////console.log("dwdd", new Date(setDate(newDate)))
        obj.topic = topic
        pushTopic("dwdd", obj)
      }
    })

  await browser.close();
  console.log("------------------------------------------------------------------------------ Iam done!");
}

async function getTopicJinek() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  let selector = '[class="scroll-top"]';
  const page = await browser.newPage();
  await page.goto(jinekUrl, {
    waitUntil: 'networkidle2'
  });

  for (i = 0; i < 10; i++) {
    await page.$eval(selector, (el) => el.scrollIntoView())
    await page.waitFor(1000);
  }

  await page.evaluate(() => document.body.innerHTML)
    .then(function (html) {
      const length = $('.js-full-click-enabled', html).length;
      for (let i = 0; i < length - 5; i++) {
        const date = $('[class="date-display-single"]', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
        const topic = $('[class="ds-1col node node-fragment view-mode-tile "] > h2 > a', html)[i].children[0].data.replace(/(\r\n|\n|\r)/gm, "").trim()
        obj = {}
        obj.date = new Date(setDate(date))
        obj.topic = topic
        pushTopic("jinek", obj)
      }
    })
  await browser.close();
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

function hasShow(show) {
  list.forEach(element => {
    if (Object.keys(element) === show) {
      return true
    } else {
      return false
    }
  });
}

function pushTopic(show, obj) {
  list.forEach(_show => {
    //console.log(Object.values(_show)[0])
    if (Object.keys(_show)[0] === show.toString()) {
      //console.log("true")
      array = Object.values(_show)[0]
      console.log(array)

      let contains = array.some(elem =>{
        return JSON.stringify(obj) === JSON.stringify(elem);
      });

      if (!contains) {
        console.log(Object.keys(_show)[0], "does nog include", obj)
        Object.values(_show)[0].push(obj)
      }
    }
  })
}

function selector(_show, reqdate) {
  let topics = []
  list.forEach(show => {
    if (Object.keys(show).toString() === _show) {
      Object.values(show)[0].forEach(element => {
        if (element.date.toISOString().split("T")[0] === reqdate.toISOString().split("T")[0]) {
          topics.push(element.topic)
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
  return topics
}

reqproces.intent('GetTopic', (conv, params) => {
  //console.log(params)
  reqDate = new Date(params.date)
  topics = selector(params.talkshowNamen, reqDate)
  //console.log(topics)
  if (topics.length !== 0) {
    conv.ask(`<speak> Ik heb ${topics.length} onderwerpen gevonden. <break time='0.5' /> ${topics.toString().replace(/,/gm, ". <break time='0.5' /> ")} </speak>`);
    conv.ask(`Wil je nog wat weten?`);
  } else if (params.talkshowNamen === "pauw" || params.talkshowNamen === "jinek" || params.talkshowNamen === "dwdd") {
    conv.ask(`<speak> Ik heb niks voor je kunnen vinden op  <say-as interpret-as="date" format="yyyymmdd" detail="1">${reqDate.toISOString().split("T")[0]}</say-as></speak>`);
    conv.ask(`Wil je nog wat weten?`);
  } else {
    conv.ask(`${params.talkshowNamen} is nog niet toegevoegd aan de app. Tot nu toe weet ik alleen de onderwerpen van pauw, jinek en de wereld draait door.`);
    conv.ask(`Wil je nog wat weten?`);
  }
});

app.post('/webhook', reqproces);

getTopicPauw();
getTopicDwdd();
getTopicJinek()

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  //console.log(`Our app is running on port ${ PORT }`);
})