const app = require('express')()
const request = require('request')
const cors = require('cors')
app.use(cors())

const  PORT = process.env.PORT || 3000;

app.get('/', function (req, res) {
    res.send('Hello World!')
});

app.get('/search', (req, resMain) => {
    const geoHubId = req.query.id || '3';
    const search = req.query.query != undefined ? req.query.query : '' || '';
    const layer = req.query.layer || null;
    // var hostName = `https://elastic.webmapp.it/geohub_app_${geoHubId}/_search/`;
    var hostName = `http://127.0.0.1:3000/geohub_app_${geoHubId}/_search/`;
    var auth = 'Basic Zm9yZ2U6MWIwVlVKeFJGeGVPdXBralBlaWU='
    const method = 'POST'
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
app.listen(PORT);