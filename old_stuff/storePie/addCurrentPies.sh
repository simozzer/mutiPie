rm ./lastSlice.pie
curl http://192.168.0.38:8083 > lastSlice.pie
mongoimport --db pieStats --collection pieStats --jsonArray --file lastSlice.pie

