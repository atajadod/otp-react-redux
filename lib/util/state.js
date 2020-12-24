import isEqual from 'lodash.isequal'

/**
 * Get the active search object
 * @param {Object} otpState the OTP state object
 * @returns {Object} an search object, or null if there is no active search
 */
export function getActiveSearch (otpState) {
  return otpState.searches[otpState.activeSearchId]
}

/**
 * Get the active itineraries for the active search, which is dependent on
 * whether realtime or non-realtime results should be displayed
 * @param {Object} otpState the OTP state object
 * @return {Array}      array of itinerary objects from the OTP plan response,
 *                      or null if there is no active search
 */
export function getActiveItineraries (otpState) {
  const search = getActiveSearch(otpState)
  const { useRealtime } = otpState
  // set response to use depending on useRealtime
  const response = !search
    ? null
    : useRealtime ? search.response : search.nonRealtimeResponse
  if (!response || !response.plan) return null;
  
  let {maxNumberOfIterations,
  preferredAgency,
  preferredAgencyCount}=otpState.config.plan;

  let itineraries=response.plan.itineraries;
  
  if (itineraries && itineraries!=null){
    if (preferredAgency && preferredAgency!='' && itineraries && itineraries.length>0){
      for(let i=0;i<preferredAgencyCount;i++){
        let foundIndex=itineraries.findIndex((e,index)=>{
          if (index<i) return false;
          if (e.legs && e.legs.length>0){
            return e.legs.findIndex((l)=>l.agencyName && l.agencyName==preferredAgency)>-1;
          }
        });
        if (foundIndex>-1){
          let changed=itineraries.splice(foundIndex, 1);
          itineraries.splice(i,0,changed[0]);
        }
          else break;
      }
    } 
    //this limits the result to the number configured in the config.yml. 0 = unlimited.
    if (maxNumberOfIterations && maxNumberOfIterations>0 && itineraries && maxNumberOfIterations<itineraries.length){
      itineraries.splice(maxNumberOfIterations, itineraries.length - maxNumberOfIterations);
    }
  }
  return itineraries;
}

/**
 * Get the active itinerary/profile for the active search object
 * @param {Object} otpState the OTP state object
 * @returns {Object} an itinerary object from the OTP plan response, or null if
 *   there is no active search or itinerary
 */
export function getActiveItinerary (otpState) {
  const search = getActiveSearch(otpState)
  const itineraries = getActiveItineraries(otpState)
  if (!itineraries) return null
  return itineraries.length > search.activeItinerary && search.activeItinerary >= 0
    ? itineraries[search.activeItinerary]
    : null
}

/**
 * Determine if the current query has a valid location, including lat/lon
 * @param {Object} otpState the OTP state object
 * @param {string} locationKey the location key ('from' or 'to')
 * @returns {boolean}
 */
export function hasValidLocation (otpState, locationKey) {
  return otpState.currentQuery[locationKey] &&
    otpState.currentQuery[locationKey].lat &&
    otpState.currentQuery[locationKey].lon
}

/**
 * Determine if the current query is valid
 * @param {Object} otpState the OTP state object
 * @returns {boolean}
 */
export function queryIsValid (otpState) {
  return hasValidLocation(otpState, 'from') &&
    hasValidLocation(otpState, 'to')
    // TODO: add mode validation
    // TODO: add date/time validation
}

export function getRealtimeEffects (otpState) {
  const search = getActiveSearch(otpState)

  const realtimeItineraries = search &&
    search.response &&
    search.response.plan
    ? search.response.plan.itineraries
    : null

  const hasNonRealtimeItineraries = search &&
    search.nonRealtimeResponse &&
    search.nonRealtimeResponse.plan

  const nonRealtimeItineraries = hasNonRealtimeItineraries
    ? search.nonRealtimeResponse.plan.itineraries
    : null

  const isAffectedByRealtimeData = !!(
    realtimeItineraries &&
    hasNonRealtimeItineraries &&
    // FIXME: Are realtime impacts only indicated by a change in the duration
    // of the first itinerary
    realtimeItineraries[0].duration !== nonRealtimeItineraries[0].duration
  )

  const normalRoutes = isAffectedByRealtimeData && nonRealtimeItineraries
    ? nonRealtimeItineraries[0].legs.filter(leg => !!leg.route).map(leg => leg.route)
    : []

  const realtimeRoutes = isAffectedByRealtimeData && realtimeItineraries
    ? realtimeItineraries[0].legs.filter(leg => !!leg.route).map(leg => leg.route)
    : []

  const normalDuration = isAffectedByRealtimeData && nonRealtimeItineraries
    ? nonRealtimeItineraries[0].duration : 0

  const realtimeDuration = isAffectedByRealtimeData && realtimeItineraries
    ? realtimeItineraries[0].duration : 0
  return {
    isAffectedByRealtimeData,
    normalRoutes,
    realtimeRoutes,
    routesDiffer: !isEqual(normalRoutes, realtimeRoutes),
    normalDuration,
    realtimeDuration,
    exceedsThreshold: Math.abs(normalDuration - realtimeDuration) >= otpState.config.realtimeEffectsDisplayThreshold
  }
  // // TESTING: Return this instead to simulate a realtime-affected itinerary.
  // return {
  //   isAffectedByRealtimeData: true,
  //   normalRoutes: ['10', '2', '10'],
  //   realtimeRoutes: ['1', '2'],
  //   routesDiffer: true,
  //   normalDuration: 1000,
  //   realtimeDuration: 800,
  //   exceedsThreshold: true
  // }
}

/**
 * Determine whether user settings panel is enabled.
 */
export function getShowUserSettings (otpState) {
  return otpState.config.persistence && otpState.config.persistence.enabled
}

export function getStopViewerConfig (otpState) {
  return otpState.config.stopViewer
}
