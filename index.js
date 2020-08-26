const axios = require('axios')
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const { convertArrayToCSV } = require('convert-array-to-csv');
const xlsx = require('xlsx')

let userAction = process.argv
userAction.shift()
userAction.shift()

fs.exists('output', exist => {
    if (!exist) {
        fs.mkdirSync('output')
    }
})

let symbolSourceList = []
let symbolPosition = 1

const type = userAction[0].toLocaleUpperCase()


const fetchHistoricalData = async (symbol, series, startDate, endDate) => {

    try {
        let symb = symbol.toLowerCase()
        symb = symb.replace('&', '%26')
        const url = `https://www.nseindia.com/api/historical/cm/equity?symbol=${symb}&series=["${series}"]&from=${startDate}&to=${endDate}`
        let cumData = []
        let data = await axios.get(url)
        let symbolArrayData = []
        data.data.data.map(values => {
            let symbolJsonData = {
                symbol: values.CH_SYMBOL,
                date: values.mTIMESTAMP,
                series: values.CH_SERIES,
                open: values.CH_OPENING_PRICE,
                high: values.CH_TRADE_HIGH_PRICE,
                low: values.CH_TRADE_LOW_PRICE,
                close: values.CH_CLOSING_PRICE,
                ltp: values.CH_LAST_TRADED_PRICE,
                previousClose: values.CH_PREVIOUS_CLS_PRICE,
                Week52High: values.CH_52WEEK_HIGH_PRICE,
                Week52Low: values.CH_52WEEK_LOW_PRICE,
                vwap: values.VWAP,
                tradeQty: values.CH_TOT_TRADED_QTY,
                tradeVal: values.CH_TOT_TRADED_VAL,
                totalTrades: values.CH_TOTAL_TRADES,
            }
            symbolArrayData.push(symbolJsonData)
        })

        return symbolArrayData

    } catch (err) {
        console.log(err.response.data.message)
        // setTimeout(() => fetchHistoricalData(symbol, series, startDate, endDate), 5000)
    }
}

const get1stHistoricalData = async (symbol) => {

    const toDate = moment().format('DD-MM-yyyy')
    const fromDate = moment().subtract(100, 'days').format('DD-MM-yyyy')

    let getSymbolInfo = await getSymbolData(symbol)
    let seriesses = getSymbolInfo.info.activeSeries

    if (seriesses.length > 0) {
        seriesses.map(series => {
            fetchHistoricalData(symbol, series, fromDate, toDate)
                .then(data => getFinalData(symbol, series, data))

        })
    } else {
        console.log('--------------------------------------------')
        console.log(`|  No Active Series Found for "${symbol}"  |`)
        console.log('--------------------------------------------')
    }
}

const getFinalData = async (symbol, series, cumData) => {

    let lastDate = cumData[cumData.length - 1].date
    const toDate = moment(new Date(lastDate).getTime()).subtract(1, 'days').format('DD-MM-yyyy')
    const fromDate = moment(new Date(lastDate).getTime()).subtract(100, 'days').format('DD-MM-yyyy')

    console.log(`"${symbol}" Data Fetched upto ${cumData[cumData.length - 1].date}`)
    let data = await fetchHistoricalData(symbol, series, fromDate, toDate)

    cumData = cumData.concat(data)

    if (data.length > 2) {
        getFinalData(symbol, series, cumData)
    } else {
        cumData = cumData.reverse()
        let newWb = xlsx.utils.book_new()
        let newWs = xlsx.utils.json_to_sheet(cumData)
        xlsx.utils.book_append_sheet(newWb, newWs, 'Historical data')
        xlsx.writeFile(newWb, path.join(__dirname, `./output/${symbol}.xlsx`), { compression: true })

        if (symbolSourceList.length > 0) {
            let symbolLength = symbolSourceList.length
            if (symbolLength - 1 > symbolPosition) {
                checkLastAvailableData(symbolSourceList[symbolPosition])
                symbolPosition++
            }
        }
    }

}


const getSymbolData = async (symbol) => {
    let symb = (symbol).toUpperCase()

    symb = symb.replace('&', '%26')
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${symb}`

    try {
        let data = await axios.get(url)
        return data.data

    } catch (err) {
        console.log(err)
    }

}

const findSymbol = async (text) => {
    const name = text.toLocaleUpperCase()
    const data = await axios.get(`https://www.nseindia.com/api/search/autocomplete?q=${name}`)
    data.data.symbols.map(results => {
        console.log(`${results.symbol} => ${results.activeSeries} => ${results.symbol_info}`)
    })
}


const checkLastAvailableData = (symbol) => {
    fs.exists(path.join(__dirname, `./output/${symbol}.xlsx`), isExist => {
        if (isExist) {
            console.log(`Checking Updates For ${symbol}`)
            let workBook = xlsx.readFile(path.join(__dirname, `./output/${symbol}.xlsx`), { cellDates: true })
            let workSheet = workBook.Sheets['Historical data']
            let data = xlsx.utils.sheet_to_json(workSheet)

            let lastAvailableDataDate = data[data.length - 1].date

            checkDataDuration(symbol, lastAvailableDataDate)
        } else {
            console.log(`Getting New Data For ${symbol}`)
            get1stHistoricalData(symbol)
        }
    })
}

const checkDataDuration = (symbol, fromDate) => {

    let fromAvlDate = moment(new Date(fromDate).getTime()).add(1, 'days').format('DD-MMM-yyyy')
    let toDate = moment().format('DD-MMM-yyyy')

    if (moment(new Date(fromAvlDate).getTime()).isSameOrBefore(new Date(toDate).getTime())) {
        console.log(`Updates Available for ${symbol}`)
        update1stData(symbol, fromAvlDate, toDate)
    } else {
        console.log(`${symbol} Already Updated`)
        if (symbolSourceList.length > 0) {
            let symbolLength = symbolSourceList.length
            if (symbolLength - 1 > symbolPosition) {
                checkLastAvailableData(symbolSourceList[symbolPosition])
                symbolPosition++
            }
        }
    }


}

const update1stData = async (symbol, fromDate, toDate) => {

    toDate = moment(new Date(toDate).getTime()).format('DD-MM-yyyy')
    fromDate = moment(new Date(fromDate).getTime()).format('DD-MM-yyyy')

    let getSymbolInfo = await getSymbolData(symbol)
    let seriesses = getSymbolInfo.info.activeSeries

    if (seriesses.length > 0) {
        seriesses.map(series => {
            fetchHistoricalData(symbol, series, fromDate, toDate)
                .then(cumData => {
                    if (cumData.length > 0) {
                        cumData = cumData.reverse()

                        let workBook = xlsx.readFile(path.join(__dirname, `./output/${symbol}.xlsx`), { cellDates: true })
                        let workSheet = workBook.Sheets['Historical data']
                        let existingData = xlsx.utils.sheet_to_json(workSheet)

                        cumData = existingData.concat(cumData)

                        let newWb = xlsx.utils.book_new()
                        let newWs = xlsx.utils.json_to_sheet(cumData)
                        xlsx.utils.book_append_sheet(newWb, newWs, 'Historical data')
                        xlsx.writeFile(newWb, path.join(__dirname, `./output/${symbol}.xlsx`), { compression: true })

                        console.log(`${symbol} Data Updated`)
                    }
                })

        })
    } else {
        console.log('--------------------------------------------')
        console.log(`|  No Active Series Found for "${symbol}"  |`)
        console.log('--------------------------------------------')
    }


}

if (type == 'HISTORICALDATA') {
    const symbols = userAction[1].toUpperCase()
    symbols.split(',').map(symbol => checkLastAvailableData(symbol))

} else if (type == 'FINDSYMBOL') {
    const text = userAction[1].toUpperCase()
    findSymbol(text)
} else if (type == 'HELP') {
    console.log('To Find Symbols   =>   e.g. node index.js findsymbol bank')
    console.log('For Historical Data   =>   e.g. node index.js historicaldata sbin...,abb,...itc')
} else if (type == 'FROMSOURCE') {
    fs.readFile(path.join(__dirname, `./source/symbols.csv`), (err, data) => {
        let symbols = data.toString().split('\r\n')
        symbols.map(symbol => symbolSourceList.push((symbol.trim())))
        checkLastAvailableData(symbolSourceList[0])
    })
} else if (type == 'UPDATE') {
    const symbols = userAction[1].toUpperCase()
    checkLastAvailableData(symbols)
}
