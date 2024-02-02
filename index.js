const dotenv = require("dotenv");
const app = require("express")();
const request = require("request");
const cors = require("cors");
dotenv.config();
app.use(cors());
const BASE_URL = "https://elastic.webmapp.it";
// const BASE_URL = "http://127.0.0.1:9200";
const PORT = process.env.PORT || 3000;
const method = "POST";
const token = process.env["TOKEN"];
const Authorization = `Basic ${token}`;
// Carica le variabili d'ambiente dal file .env
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
  const search =
    req.query.query != undefined
      ? req.query.query.replace("%20", " ")
      : "" || "";
  const layer = req.query.layer || null;
  const filters = JSON.parse(req.query.filters || null);
  var hostName = getHost(geoHubId);
  let must = [
    {
      query_string: {
        fields: ["searchable"],
        query: `*${search}*`,
        default_operator: "or",
      },
    },
  ];

  let size = 1000;
  let filter = [];
  let query = {
    bool: {
      must,
    },
  };
  if (layer != null) {
    must.push({ term: { layers: layer } });
    size = 200;
  }
  if (filters != null) {
    must = [
      ...must,
      ...filters
        .filter((a) => a.taxonomy)
        .map((filter) => {
          if (filter.taxonomy != null) {
            let term = {};
            let key = `${filter.taxonomy}.keyword`;
            term[key] = filter.identifier;
            return {
              term,
            };
          }
        }),
    ];

    filter = filters
      .filter((a) => a.min || a.max)
      .map((filter) => {
        let range = {};
        let key = `properties.${filter.identifier}`;
        range[key] = { gte: filter.min, lte: filter.max };
        return {
          range,
        };
      });
  }

  query = {
    bool: {
      must,
      filter,
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
    aggs: {
      activities: {
        filter: {
          exists: {
            field: "activities.keyword",
          },
        },
        aggs: {
          count: {
            terms: {
              field: "activities.keyword",
              size: 10,
            },
          },
        },
      },
      themes: {
        filter: {
          exists: {
            field: "themes.keyword",
          },
        },
        aggs: {
          count: {
            terms: {
              field: "themes.keyword",
              size: 10,
            },
          },
        },
      },
    },
  };
  console.log(Authorization);
  request(
    {
      url: hostName,
      headers: {
        Authorization,
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
