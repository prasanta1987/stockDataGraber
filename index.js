const axios = require('axios')
const csv = require('csvtojson')
const firebase = require('firebase')
const fs = require('fs')

const fbConfig = require('./fbConfig').firebaseConfig

const url = 'https://www1.nseindia.com/products/content/sec_bhavdata_full.csv'

firebase.initializeApp(fbConfig)
const db = firebase.firestore()
const stockDbData = db.collection('stockData')


function getData() {
    axios.get(url)
        .then(res => {
            csv({ noheader: true, output: "csv" })
                .fromString(res.data)
                .then((stockData) => {
                    let headerRow = stockData.shift()
                    let jsonArrayData = []
                    let i = 1
                    stockData.map(x => {
                        let data = {
                            [headerRow[0]]: x[0],
                            [headerRow[1]]: x[1],
                            [headerRow[2]]: x[2],
                            [headerRow[3]]: x[3],
                            [headerRow[4]]: x[4],
                            [headerRow[5]]: x[5],
                            [headerRow[6]]: x[6],
                            [headerRow[7]]: x[7],
                            [headerRow[8]]: x[8],
                            [headerRow[9]]: x[9],
                            [headerRow[10]]: x[10],
                            [headerRow[11]]: x[11],
                            [headerRow[12]]: x[12],
                            [headerRow[13]]: x[13],
                            [headerRow[14]]: x[14],
                        }

                        storeData(data, i)
                        i++;
                        jsonArrayData.push(data)
                    })

                    let fileDate = jsonArrayData[0].DATE1
                    fs.writeFileSync(`./offlineData/stock_data_${fileDate}.json`, JSON.stringify(jsonArrayData))
                })
        })
        .catch(err => {
            console.log(err)
        })
}


function storeData(data, i) {

    let symbol = data.SYMBOL
    let date = data.DATE1

    stockDbData.doc(symbol).set({ [date]: data }, { merge: true })
        .then(() => {
            console.log(`${i} : "${symbol}" dated "${date}" is Saved`)
        })
        .catch(error => console.log(`${i} : ${symbol} dated ${date} Failed to Save`))
}

let day = 1, hour = 0, minute = 0, second = 0;

const interval = (day * 24 * 60 * 60) + (hour * 60 * 60) + (minute * 60) + second

getData()