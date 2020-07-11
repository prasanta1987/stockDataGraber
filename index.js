const axios = require('axios')
const csv = require('csvtojson')
const firebase = require('firebase')
const fs = require('fs')
const csvtojson = require('csvtojson')

const fbConfig = require('./fbConfig').firebaseConfig

let userAction = process.argv[2].toLowerCase()
let isUpload = process.argv[4] || false

const url = 'https://www1.nseindia.com/products/content/sec_bhavdata_full.csv'

firebase.initializeApp(fbConfig)
const db = firebase.firestore()
const stockDbData = db.collection('stockHistoricalData')


const getData = () => {
    axios.get(url)
        .then(res => convertDatas(res.data))
        .catch(() => console.log('Error in Fetching Data'))
}


const convertFromFile = (fileName = 'sec_bhavdata_full.csv') => {

    csv({ noheader: true, output: "csv" })
        .fromFile(`./offlineCsv/${fileName}`)
        .then(jsonObj => {
            makeJsonObject(jsonObj)
        })
        .catch(() => console.log('File Name Incorrect.'))
}

const convertDatas = (data) => {

    csv({ noheader: true, output: "csv" })
        .fromString(data)
        .then((stockData) => {

            makeJsonObject(stockData)

        })
        .catch(() => console.log('Conversion Error'))
}

const makeJsonObject = (stockData) => {

    let headerRow = stockData.shift()
    let jsonArrayData = []
    let i = 1
    stockData.map(x => {
        let data = {
            [headerRow[0]]: x[0],
            [headerRow[1]]: x[1],
            [headerRow[2]]: (isUpload) ? convertDateToTimeStamp(x[2]) : x[2],
            [headerRow[3]]: parseFloat(x[3]),
            [headerRow[4]]: parseFloat(x[4]),
            [headerRow[5]]: parseFloat(x[5]),
            [headerRow[6]]: parseFloat(x[6]),
            [headerRow[7]]: parseFloat(x[7]),
            [headerRow[8]]: parseFloat(x[8]),
            [headerRow[9]]: parseFloat(x[9]),
            [headerRow[10]]: parseFloat(x[10]),
            [headerRow[11]]: parseFloat(x[11]),
            [headerRow[12]]: parseFloat(x[12]),
            [headerRow[13]]: parseFloat(x[13]),
            [headerRow[14]]: parseFloat(x[14]),
        }

        if (isUpload) {
            storeData(data, i)
            i++;
        }
        jsonArrayData.push(data)
    })

    if (isUpload == false) {
        console.log(jsonArrayData)
    }
    storeToFile(jsonArrayData)
}


const storeData = (data, i) => {

    let symbol = data.SYMBOL
    let date = data.DATE1

    stockDbData.doc(symbol).set({ [date]: data }, { merge: true })
        .then(() => {
            console.log(`${i} : "${symbol}" dated "${timeStamptoDate(date)}" is Saved`)
        })
        .catch(() => console.log(`${i} : ${symbol} dated ${date} Failed to Save`))
}

const storeToFile = (jsonArrayData) => {

    let fileDate = jsonArrayData[0].DATE1
    fs.writeFileSync(`./offlineData/stock_data_${fileDate}.json`, JSON.stringify(jsonArrayData))

}

const convertDateToTimeStamp = (date) => {
    let newDate = new Date(date).getTime()
    return newDate
}

const timeStamptoDate = (time) => {

    let d = new Date(time)
    let day = d.getDate()
    let mon = d.getMonth()
    let year = d.getFullYear()

    var monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];


    let date = `${day}-${monthNames[mon]}-${year}`

    return date
}

if (userAction == 'online') {
    getData()
}
else if (userAction == 'offline') {
    if (process.argv.length >= 3) {
        convertFromFile(process.argv[3])
    } else {
        convertFromFile()
    }
}