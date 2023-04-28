const app = require('express')()
const request = require('request')
const cors = require('cors')
app.use(cors())
// const BASE_URL = 'https://elastic.webmapp.it'
const BASE_URL = 'http://127.0.0.1:9200';
const  PORT = process.env.PORT || 3000;
const method = 'POST'
const auth = 'Basic Zm9yZ2U6MWIwVlVKeFJGeGVPdXBralBlaWU='

getHost = (id = 3) => {
    return    `${BASE_URL}/geohub_app_${id}/_search/`;
}

app.get('/', function (req, res) {
    res.send('Hello World!')
});

app.get('/search', (req, resMain) => {
    const geoHubId = req.query.id || '3';
    const search = req.query.query != undefined ? req.query.query : '' || '';
    const layer = req.query.layer || null;
    var hostName = getHost(geoHubId);
  
    let size = 20000;

    let query ={
        query_string: {
            fields: ['name','from','to','ref'],
            query: `*${search}*`,
        },
    }
    if (layer != null) {
        query = {
            bool: {
                must: [
                    {
                        query_string: {
                            fields: ['name', 'from', 'to', 'ref'],
                            query: `*${search}*`,
                        }
                    },
                    {
                        terms: {
                            layers: [layer],
                        }
                    }
                ]
            }
        }
        size= 200;
    }
    const body = {
        _source: {
            excludes: ['geometry'],
        },
        sort: [
            {
              name: {
                order: "asc"
              }
            }
        ],
        query,
        size
    }
    request({
        url: hostName,
        headers: {
            "Authorization": auth
        },
        method,
        body,
        json: true
    }, (err, res, body) => {
        if (err) { return console.log(err); }
        resMain.send(body)
    });

});
app.get('/track',(req, resMain) => {
    const geoHubId = req.query.geohub || '3';
    const trackId =req.query.track || '3';
    const method = 'GET'
    var hostName = `${BASE_URL}/geohub_app_${geoHubId}/_doc/${trackId}`;

    request({
        url: hostName,
        headers: {
            "Authorization": auth
        },
        method,
        json: true
    }, (err, res, body) => {
        if (err) { return console.log(err); }
        if(body != null && body._source != null){
            resMain.send(body._source)
        }
    });
})
app.listen(PORT);