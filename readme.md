# elastic-passtrough

## Testing in Local

For testing in local

1. Open the file index.js
2. Uncomment the line 5 (const BASE_URL = 'https://elastic.webmapp.it')
3. Comment the line 6 (const BASE_URL = 'http://127.0.0.1:9200';)
4. Use this link in the browser to debug: http://127.0.0.1:3000
5. Add the necessary parameters to the link (ex. /search/?id=29&layer=196)

**Important Note**
Remember to switch the steps 2 and 3 before pushing the repository to Git

## Project path

```bash
/root/docker/configs/elastic-passtrough
```

## After any changes the docker instance should be restarted:

```bash
docker compose down --rmi local
docker compose up -d --build
```

docker run --name es01 --net elastic -p 9200:9200 -it -m 1GB -e "discovery.type=single-node" -e "xpack.security.enabled=false" docker.elastic.co/elasticsearch/elasticsearch:8.15.0

docker run -d --name es01 \
 -p 9200:9200 \  
 -p 9300:9300 \
 -e "discovery.type=single-node" \
 -e "xpack.security.enabled=false" \
 docker.elastic.co/elasticsearch/elasticsearch:8.0.0
