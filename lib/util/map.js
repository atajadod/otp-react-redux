import moment from 'moment'
import polyline from '@mapbox/polyline'
import { isTransit, toSentenceCase } from './itinerary'

export function latlngToString (latlng) {
  return latlng && `${latlng.lat.toFixed(5)}, ${(latlng.lng || latlng.lon).toFixed(5)}`
}

export function coordsToString (coords) {
  return coords.length && coords.map(c => (+c).toFixed(5)).join(', ')
}

export function stringToCoords (str) {
  return (str && str.split(',').map(c => +c)) || []
}

export function constructLocation (latlng) {
  return {
    name: latlngToString(latlng),
    lat: latlng.lat,
    lon: latlng.lng
  }
}

export function formatStoredPlaceName (location, withDetails = true) {
  let displayName = location.type === 'home' || location.type === 'work'
    ? toSentenceCase(location.type)
    : location.name
  if (withDetails) {
    let detailText = getDetailText(location)
    if (detailText) displayName += ` (${detailText})`
  }
  return displayName
}

export function getDetailText (location) {
  let detailText
  if (location.type === 'home' || location.type === 'work') {
    detailText = location.name
  }
  if (location.type === 'stop') {
    detailText = location.id
  } else if (location.type === 'recent' && location.timestamp) {
    detailText = moment(location.timestamp).fromNow()
  }
  return detailText
}

export function matchLatLon (location1, location2) {
  if (!location1 || !location2) return location1 === location2
  return location1.lat === location2.lat && location1.lon === location2.lon
}

export function itineraryToTransitive (itin, includeGeometry, config) {
  // console.log('itineraryToTransitive', itin);
  const tdata = {
    journeys: [],
    streetEdges: [],
    places: [],
    patterns: [],
    routes: [],
    stops: []
  }
  const routes = {}
  const stops = {}
  let streetEdgeId = 0
  let patternId = 0

  const journey = {
    journey_id: 'itin',
    journey_name: 'Iterarary-derived Journey',
    segments: []
  }

  // add 'from' and 'to' places to the tdata places array
  tdata.places.push({
    place_id: 'from',
    place_lat: itin.legs[0].from.lat,
    place_lon: itin.legs[0].from.lon
  })
  tdata.places.push({
    place_id: 'to',
    place_lat: itin.legs[itin.legs.length - 1].to.lat,
    place_lon: itin.legs[itin.legs.length - 1].to.lon
  })

  itin.legs.forEach(leg => {
    if (
      leg.mode === 'WALK' ||
      leg.mode === 'BICYCLE' ||
      leg.mode === 'CAR' ||
      leg.mode === 'MICROMOBILITY'
    ) {
      const fromPlaceId = leg.from.bikeShareId
        ? `bicycle_rent_station_${leg.from.bikeShareId}`
        : `itin_street_${streetEdgeId}_from`
      const toPlaceId = leg.to.bikeShareId
        ? `bicycle_rent_station_${leg.to.bikeShareId}`
        : `itin_street_${streetEdgeId}_to`

      const segment = {
        type: leg.mode,
        streetEdges: [streetEdgeId],
        from: { type: 'PLACE', place_id: fromPlaceId },
        to: { type: 'PLACE', place_id: toPlaceId }
      }
      // For TNC segments, draw using an arc
      if (leg.mode === 'CAR' && leg.hailedCar) segment.arc = true
      journey.segments.push(segment)

      tdata.streetEdges.push({
        edge_id: streetEdgeId,
        geometry: leg.legGeometry
      })
      tdata.places.push({
        place_id: fromPlaceId,
        // Do not label the from place in addition to the to place. Otherwise,
        // in some cases (bike rental station) the label for a single place will
        // appear twice on the rendered transitive view.
        // See https://github.com/conveyal/trimet-mod-otp/issues/152
        // place_name: leg.from.name,
        place_lat: leg.from.lat,
        place_lon: leg.from.lon
      })
      tdata.places.push({
        place_id: toPlaceId,
        place_name: leg.to.name,
        place_lat: leg.to.lat,
        place_lon: leg.to.lon
      })
      streetEdgeId++
    }
    if (isTransit(leg.mode)) {
      // determine if we have valid inter-stop geometry
      const hasInterStopGeometry = 
        leg.interStopGeometry &&
        leg.interStopGeometry.length === leg.intermediateStops.length + 1

      // create leg-specific pattern
      const ptnId = 'ptn_' + patternId
      const pattern = {
        pattern_id: ptnId,
        pattern_name: 'Pattern ' + patternId,
        route_id: leg.routeId,
        stops: []
      }

      // add 'from' stop to stops dictionary and pattern object
      stops[leg.from.stopId] = {
        stop_id: leg.from.stopId,
        stop_name: leg.from.name,
        stop_lat: leg.from.lat,
        stop_lon: leg.from.lon
      }
      pattern.stops.push({ stop_id: leg.from.stopId })

      let additionalStopCounter=0;
      let addLegGeometry=(config && config.map &&  config.map.fixInterStopGeometry) || false;
      //add intermediate stops to stops dictionary and pattern object
      if (!addLegGeometry){
        for (const [i, stop] of leg.intermediateStops.entries()) {
          additionalStopCounter++;
          stops[stop.stopId] = {
            stop_id: stop.stopId,
            stop_name: stop.name,
            stop_lat: stop.lat,
            stop_lon: stop.lon
          }
          pattern.stops.push({
            stop_id: stop.stopId,
            geometry:  hasInterStopGeometry && leg.interStopGeometry[i].points
          })
        }  
      }
      else{
        let arr=polyline.decode(leg.legGeometry.points);      
        for(let i=0;i<arr.length;i++){
          //if (i>=1) break;
          //if ((i%9)!=0) continue;
          additionalStopCounter++;
          let p=arr[i];
          let id= leg.from.stopId + ":"+i ;
          stops[id]={
            stop_id: id,
            stop_name: id,
            stop_lat: p[0],
            stop_lon: p[1]
          }        
          pattern.stops.push({
            stop_id: id,
            geometry:  hasInterStopGeometry && i==0 && leg.interStopGeometry[leg.interStopGeometry.length - 1].points
          })
        }
      }
      
     
      // add 'to' stop to stops dictionary and pattern object
      stops[leg.to.stopId] = {
        stop_id: leg.to.stopId,
        stop_name: leg.to.name,
        stop_lat: leg.to.lat,
        stop_lon: leg.to.lon
      }
      pattern.stops.push({
        stop_id: leg.to.stopId,
        geometry: hasInterStopGeometry && leg.interStopGeometry[leg.interStopGeometry.length - 1].points
      })
     
      // add route to the route dictionary
      routes[leg.routeId] = {
        agency_id: leg.agencyId,
        route_id: leg.routeId,
        route_short_name: leg.routeShortName || '',
        route_long_name: leg.routeLongName || '',
        route_type: leg.routeType,
        route_color: leg.routeColor
      }

      // add the pattern to the tdata patterns array
      tdata.patterns.push(pattern)

      // add the pattern refrerence to the journey object
      journey.segments.push({
        type: 'TRANSIT',
        patterns: [{
          pattern_id: ptnId,
          from_stop_index: 0,
          //to_stop_index: (leg.intermediateStops.length + 2) + arr.length - 1
          to_stop_index: 2 + additionalStopCounter - 1
        }]
      })

      patternId++
    }
  })

  // add the routes and stops to the tdata arrays
  for (const k in routes) tdata.routes.push(routes[k])
  for (const k in stops) tdata.stops.push(stops[k])

  // add the journey to the tdata journeys array
  tdata.journeys.push(journey)

  // console.log('derived tdata', tdata);
  return tdata
}

export function isBikeshareStation (place) {
  return place.place_id.lastIndexOf('bicycle_rent_station') !== -1
}
