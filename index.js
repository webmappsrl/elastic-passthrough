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
    var hostName = `https://elastic.webmapp.it/geohub_app_${geoHubId}/_search/`;
    // var hostName = `http://es01:9200/geohub_app_${geoHubId}/_search/`;
    var auth = 'Basic Zm9yZ2U6MWIwVlVKeFJGeGVPdXBralBlaWU='
    const method = 'POST'
    const body = {
        _source: {
            excludes: ['geometry'],
        },
        query: {
            query_string: {
                fields: ['name','from','to','ref'],
                query: `*${search}*`,
            },
        },
        size:20000
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