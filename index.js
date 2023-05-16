const app = require("express")();
const request = require("request");
const cors = require("cors");
app.use(cors());
// const BASE_URL = "https://elastic.webmapp.it";
const BASE_URL = "http://127.0.0.1:9200";
const PORT = process.env.PORT || 3000;
const method = "POST";
const auth = "Basic Zm9yZ2U6MWIwVlVKeFJGeGVPdXBralBlaWU=";

getHost = (id = 3) => {
  return `${BASE_URL}/geohub_app_${id}/_search/`;
};

function stringToArray(value) {
  if (value == null) return null;
  return value.split(",");
}

app.get("/", function (req, res) {
  res.send("Hello World!");
});

app.get("/search", (req, resMain) => {
  const geoHubId = req.query.id || "3";
  const search = req.query.query != undefined ? req.query.query : "" || "";
  const layer = req.query.layer || null;
  const activities = stringToArray(req.query.activities || null);
  var hostName = getHost(geoHubId);
  let must = [
    {
      query_string: {
        fields: ["name", "from", "to", "ref"],
        query: `*${search}*`,
      },
    },
  ];

  let size = 20000;

  let query = {
    bool: {
      must,
    },
  };
  if (layer != null) {
    must.push({ term: { layers: layer } });
    size = 200;
  }
  if (activities != null) {
    must = [
      ...must,
      ...activities.map((activity) => ({
        term: { "activities.keyword": activity },
      })),
    ];
  }
  query = {
    bool: {
      must,
    },
  };
  console.log(query);
  const body = {
    _source: {
      excludes: ["geometry"],
    },
    sort: [
      {
        "name.keyword": {
          order: "asc",
        },
      },
    ],
    query,
    size,
  };
  request(
    {
      url: hostName,
      headers: {
        Authorization: auth,
      },
      method,
      body,
      json: true,
    },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      resMain.send(body);
    }
  );
});
app.get("/track", (req, resMain) => {
  const geoHubId = req.query.geohub || "3";
  const trackId = req.query.track || "3";
  const method = "GET";
  var hostName = `${BASE_URL}/geohub_app_${geoHubId}/_doc/${trackId}`;

  request(
    {
      url: hostName,
      headers: {
        Authorization: auth,
      },
      method,
      json: true,
    },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      if (body != null && body._source != null) {
        resMain.send(body._source);
      }
    }
  );
});
app.listen(PORT);
