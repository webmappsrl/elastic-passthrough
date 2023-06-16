const app = require("express")();
const request = require("request");
const url = require("url");
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
        fields: ["name", "from", "to", "ref", "searchable"],
        query: `*${search}*`,
        default_operator: "or",
      },
    },
  ];

  let size = 20000;
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
        .map((activity) => {
          if (activity.taxonomy != null) {
            if (activity.taxonomy === "activity") {
              return {
                term: { "activities.keyword": activity.identifier },
              };
            }
          }
        }),
    ];

    filters
      .filter((a) => a.min || a.max)
      .forEach((activity) => {
        let range = {};
        let key = `properties.${activity.identifier}`;
        range[key] = { gte: activity.min, lte: activity.max };
        filter.push({
          range,
        });
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
      activities_count: {
        terms: {
          field: "activities.keyword",
          size: 10,
        },
      },
    },
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
