#!/bin/bash
cd "$(dirname "$(dirname $0)")"

node=${NODE:-../node}

$node http/http_trivial.js &
npid=$!

sleep 1

for i in a a a a a a a a a a a a a a a a a a a a; do
  ab -t 10 -c 100 http://127.0.0.1:8000/ > /dev/null 2>&1
done

kill $npid
