const icon = require('../assets/icon.png')
const fs = require('fs')

const regexDD = '[+-]?[0-9]{1,2}\\.[0-9]{2,}\\s?[NS]?\\°?[\\,\\s]{1,2}[+-]?[0-9]{1,3}\\.[0-9]{2,}\\s?[EW]?\\°?'
const regexDMS = '[+-]?[0-9]{1,2}[\\°\\s][0-9]{1,2}[\'\\s][0-9]{1,2}\\.?[0-9]{1,2}?[\\"\\s][NS]?[\\,\\s]{1,2}[+-]?[0-9]{1,3}[\\°\\s][0-9]{1,2}[\'\\s][0-9]{1,2}\\.?[0-9]{1,2}[\\"\\s][EW]?'

const plugin =  ({ term, display, actions }) => {

  let match = matchCoordTerm(term)

  if (match) {
    let coordinates = match[1]
    let latLongObj = {}

    if (new RegExp(`${regexDD}`).test(coordinates)) {
      latLongObj = handleDD(coordinates)
    } else if (new RegExp(`${regexDMS}`).test(coordinates)) {
      latLongObj = handleDMS(coordinates)
    }

    display({
      title: `${latLongObj.lat}, ${latLongObj.long}`,
      icon,
      subtitle: 'Open in default .kml app.',
      onSelect: () => {
        let filePath = require('path').join(require('os').homedir(), 'Documents', 'cerebro-open-coords.kml')
        let content = 
        `<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://earth.google.com/kml/2.0">
          <Document>
          <Placemark>
          <name>${match[1]}</name>
          <LookAt>
              <longitude>${latLongObj.long}</longitude>
              <latitude>${latLongObj.lat}</latitude>
              <range>1000</range><tilt>0</tilt><heading>0</heading>
          </LookAt>
          <Point>
            <coordinates>${latLongObj.long},${latLongObj.lat},10</coordinates>
          </Point>
          </Placemark>
        </Document>
        </kml>`
          saveKml(filePath, content).then(() => actions.open(`file://${filePath}`))
      }
    })
  }
}

module.exports = {
  fn: plugin,
  name: 'Open coordinates',
  keyword: 'coords',
  icon
}

const matchCoordTerm = (termStr) => {
  let re = new RegExp(`coords(?:\\s(${regexDD}|${regexDMS}))`)
  
  return termStr.match(re)
}

const handleDD = (coordStr) => {
  let latitude, longitude

  if (/[NSEW]/i.test(coordStr)) {
    let coordinateParts = coordStr.split(/[^\d\w\.]+/)
    latitude = (coordinateParts[1].toUpperCase() == 'S' ? '-' : '') + coordinateParts[0].trim()
    longitude = (coordinateParts[3].toUpperCase() == 'W' ? '-' : '') + coordinateParts[2].trim()
  } else {
    if (/\°/g.test(coordStr)) {
      coordStr = coordStr.replace(/\°/g, '')
    }

    coordinateParts = coordStr.split(/[^\d\.\°\-]+/)
    latitude = coordinateParts[0].trim()
    longitude = coordinateParts[1].trim()
  }
  console.log(`lat: ${latitude}, long: ${longitude}`)
  return {
    lat: latitude,
    long: longitude
  }
}

const handleDMS = (coordStr) => {
  let latitude, longitude

  // Has no direction
  if (!/[NSEW]+/i.test(coordStr)) {

    let coordinateParts = coordStr.split(/[^\d\w\.-]+/)
    // Give direction
    if (/-/.test(coordinateParts[3])) {
      coordinateParts[3] = coordinateParts[3].replace(/-/, '')
      coordinateParts.splice(6, 1, 'W')
    } else {
      coordinateParts.splice(6, 1, 'E')
    }
    if (/-/.test(coordinateParts[0])) {
      coordinateParts[0] = coordinateParts[0].replace(/-/, '')
      coordinateParts.splice(3, 0, 'S')
    } else {
      coordinateParts.splice(3, 0, 'N')
    }
    latitude = dmsToDd(coordinateParts[0], coordinateParts[1], coordinateParts[2], coordinateParts[3])
    longitude = dmsToDd(coordinateParts[4], coordinateParts[5], coordinateParts[6], coordinateParts[7])
  } else {
    coordinateParts = coordStr.split(/[^\d\w\.]+/)
    latitude = dmsToDd(coordinateParts[0], coordinateParts[1], coordinateParts[2], coordinateParts[3])
    longitude = dmsToDd(coordinateParts[4], coordinateParts[5], coordinateParts[6], coordinateParts[7])
  }

  return {
    lat: latitude,
    long: longitude
  }
}

const dmsToDd = (degrees, minutes, seconds, direction) => {
  let decimalDegrees = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600

  if (direction == 'S' || direction == 'W') {
    decimalDegrees = decimalDegrees * -1
  }

  return decimalDegrees.toFixed(6)
}

const saveKml = async (filePath, content) => {

  const options = {encoding:'utf-8', flag:'w'}

  fs.writeFile(filePath, content, options, (error) => {
    if (error) {
      console.error(error)
    } else {
      // console.log('cerebro-open-coords.kml saved') // Remove
    }
  })
}