const dotenv = require("dotenv");
const app = require("express")();
const request = require("request");
const cors = require("cors");
dotenv.config();
app.use(cors());
// const BASE_URL = "https://elastic.webmapp.it";
const BASE_URL = "http://es01:9200";
const PORT = process.env.PORT || 3000;
const method = "POST";
const username = process.env["USERNAME"];
const password = process.env["PASSWORD"];
const token = Buffer.from(`${username}:${password}`).toString("base64");

const Authorization = `Basic ${token}`;
// Carica le variabili d'ambiente dal file .env
getHost = (id = 3) => {
  return `${BASE_URL}/geohub_app_${id}/_search/`;
};
getV2Host = (app = `geohub_3`) => {
  return `${BASE_URL}/${app}/_search/`;
};

app.get("/", function (req, res) {
  res.send("Hello World!");
});
app.get("/search", (req, resMain) => {
  console.log("sono search");
  console.log(token);
  console.log("---");
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
        default_operator: "and",
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
        _score: {
          order: "desc",
        },
      },
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
      if (body.error != null) {
        const body = _getV2Body(req, "v2");
        // Rimappatura del campo _source con il contenuto di doc

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
            body.hits.hits.forEach((hit) => {
              if (hit._source && hit._source.doc) {
                hit._source = hit._source.doc;
              }
            });
            resMain.send(body);
          }
        );
      } else {
        resMain.send(body);
      }
    }
  );
});
app.get("/v2/search", (req, resMain) => {
  const body = _getV2Body(req);
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
      const hits = [];
      body.hits.hits.forEach((hit) => {
        if (hit._source && hit._source.doc) {
          hits.push(hit._source.doc);
        }
      });
      resMain.send(hits);
    }
  );
});

app.get("/track", (req, resMain) => {
  const app = req.query.app || "geohub_app_3";
  const trackId = req.query.id || "152";
  const method = "GET";
  var hostName = `${BASE_URL}/${app}/_doc/${trackId}`;

  request(
    {
      url: hostName,
      headers: {
        Authorization,
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
      } else {
        resMain.send("Track not found");
      }
    }
  );
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});

_getV2Body = (req, v) => {
  console.log("Sono in /search");

  const app = req.query.app || "geohub_3";
  const search = req.query.query ? req.query.query.replace("%20", " ") : "";
  const layer = req.query.layer || null;
  const filters = JSON.parse(req.query.filters || "[]"); // Gestione dei filtri

  const hostName = v === "v2" ? getV2Host(app) : getHost(app);
  let must = [];

  // Aggiungi la query di ricerca con wildcard solo se il parametro di ricerca è fornito
  if (search) {
    must.push({
      query_string: {
        query: `*${search}*`,
        fields: ["doc.searchable"],
        default_operator: "and",
      },
    });
  }
  // Aggiungi filtro per layer, se fornito
  if (layer) {
    must.push({ term: { "doc.layers": layer } });
  }

  // Aggiungi eventuali filtri per taxonomy
  filters.forEach((filter) => {
    if (filter.taxonomy) {
      let term = {};
      let key = `doc.${filter.taxonomy}.keyword`;
      term[key] = filter.identifier;
      must.push({ term });
    }
  });

  let filter = [];

  // Aggiungi eventuali filtri di range
  filters.forEach((f) => {
    if (f.min || f.max) {
      let range = {};
      let key = `doc.${f.identifier}`;
      range[key] = {};
      if (f.min) range[key].gte = f.min;
      if (f.max) range[key].lte = f.max;
      filter.push({ range });
    }
  });

  const query = {
    bool: {
      must,
      filter,
    },
  };

  return {
    _source: {
      excludes: ["geometry"],
    },
    sort: [
      { _score: { order: "desc" } },
      { "doc.name.keyword": { order: "asc" } },
    ],
    query,
    size: layer ? 200 : 1000,
    aggs: {
      activities: {
        filter: {
          exists: {
            field: "doc.activities.keyword",
          },
        },
        aggs: {
          count: {
            terms: {
              field: "doc.activities.keyword",
              size: 10,
            },
          },
        },
      },
      themes: {
        filter: {
          exists: {
            field: "doc.themes.keyword",
          },
        },
        aggs: {
          count: {
            terms: {
              field: "doc.themes.keyword",
              size: 10,
            },
          },
        },
      },
    },
  };
};
