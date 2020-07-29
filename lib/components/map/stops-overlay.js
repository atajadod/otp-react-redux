import { divIcon } from 'leaflet'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { FeatureGroup, MapLayer, Popup, Marker, withLeaflet } from 'react-leaflet'
import { Button } from 'react-bootstrap'

import SetFromToButtons from './set-from-to'
import { isMobile } from '../../util/ui'
import { findStopsWithinBBox, clearStops} from '../../actions/api'
import { setLocation } from '../../actions/map'
import { setViewedStop, setMainPanelContent } from '../../actions/ui'
import MemoryCache from '../../util/memorycache'
import ba from '../../../images/bart.png'

//const ba=require('../../../images/bart.png');
import l,{Icon} from 'leaflet'

class StopsOverlay extends MapLayer {
  static propTypes = {
    minZoom: PropTypes.number,
    queryMode: PropTypes.string,
    stops: PropTypes.array,
    refreshStops: PropTypes.func,
    getAgency:PropTypes.func,
    clearAgency: PropTypes.func,
    getFeeds: PropTypes.func,
    getAgencies:PropTypes.func
  }

  static defaultProps = {
    minZoom: 15
  }

  componentDidMount () {
    // set up pan/zoom listener
    this.props.leaflet.map.on('moveend', () => {
      this._refreshStops()
      //if (this.props.getFeeds) this.props.getFeeds();
      //if (this.props.getAgencies) this.props.getAgencies();
    })
  }

  // TODO: determine why the default MapLayer componentWillUnmount() method throws an error
  componentWillUnmount () { }

  _refreshStops () {
    if (this.props.leaflet.map.getZoom() < this.props.minZoom) {
      this.forceUpdate()
      return
    }

    const bounds = this.props.leaflet.map.getBounds()
    if (!bounds.equals(this.lastBounds)) {
      setTimeout(() => {
        this.props.refreshStops({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLon: bounds.getWest(),
          maxLon: bounds.getEast()
        })
        this.lastBounds = bounds
      }, 300)
    }
  }

  createLeafletElement () {
  }

  updateLeafletElement () {
  }

  render () {
    const { leaflet, minZoom, setLocation, setViewedStop, setMainPanelContent, stops, languageConfig, icons,getAgency, clearAgency,agencies } = this.props
    const mobileView = isMobile()

    // Don't render if below zoom threshold or no stops visible
    if (this.props.leaflet.map.getZoom() < minZoom || !stops || stops.length === 0) {
      return <FeatureGroup />
    }

    // Helper to create StopMarker from stop
    const createStopMarker = (stop) => <StopMarker
      key={stop.id}
      stop={stop}
      leaflet={leaflet}
      mobileView={mobileView}
      setLocation={setLocation}
      setViewedStop={setViewedStop}
      setMainPanelContent={setMainPanelContent}
      languageConfig={languageConfig}
      icons={icons}
      agencies={agencies}

    />

    // Singleton case; return FeatureGroup with single StopMarker
    if (stops.length === 1) {
      return <FeatureGroup>{createStopMarker(stops[0])}</FeatureGroup>
    }

    // Otherwise, return FeatureGroup with mapped array of StopMarkers
    return <FeatureGroup>{stops.map(stop => createStopMarker(stop))}</FeatureGroup>
  }
}

class StopMarker extends Component {
  static propTypes = {
    mobileView: PropTypes.bool,
    setLocation: PropTypes.func,
    setViewedStop: PropTypes.func,
    setMainPanelContent: PropTypes.func,
    stop: PropTypes.object
    // getAgency: PropTypes.func,
    // clearAgency: PropTypes.func
  }

  _onClickView = () => {
    this.props.setMainPanelContent(null)
    this.props.setViewedStop({ stopId: this.props.stop.id })
  }

  render () {
    const { setLocation, stop, languageConfig, icons,agencies } = this.props
    const { id, name, lat, lon } = stop
    const idArr = id.split(':')
    const radius = 20
    const half = radius / 2
    const quarter = radius / 4
    
    const html = `<div class="stop-overlay-icon" style="height: ${half}px; width: ${half}px; margin-left: ${quarter}px; margin-top: ${quarter}px;" />`
    //const html = `<div  class="stop-overlay-icon"  style="height: ${half}px; width: ${half}px; margin-left: ${quarter}px; margin-top: ${quarter}px;"><i className='fa fa-pencil'  /></div>`
    // const html = `<div  class="stop-overlay-icon"  style="height: ${half}px; width: ${half}px; margin-left: ${quarter}px; margin-top: ${quarter}px;">
    // <img src=${{ba}}/></div>`
    
    //const html = `<i className='fa fa-pencil stop-overlay-icon'  />`
    const icon = divIcon({
      html,
      className: 'stop-overlay-bg',
      iconSize: radius
    })



    //const icon=l.icon({iconUrl:ba, iconSize:L.point(16,16)})

    return (      
      <Marker
        position={[lat, lon]}
        icon={icon}
      >
        <Popup>
          <div className='map-overlay-popup'>
            <div className='popup-title'>{name}</div>
            {/* <div className='popup-row'><b>Agency:</b> {idArr[0]} {agencies &&  agencies.agencies && agencies.agencies.length>0 && (<a href={agencies.agencies[0].url}>{agencies.agencies[0].name}</a>)}</div> */}
            <div className='popup-row'><b>Agency:</b> {agencies && agencies[idArr[0]] && (<a href={agencies[idArr[0]].url}>{agencies[idArr[0]].name}</a>)}({idArr[0]})</div>
            {/* <div className='popup-row'><b>Agency:</b> {idArr[0]} {agencies && (<a>test</a>)}</div> */}
            {/* <div className='popup-row'><b>Agency:</b> {MemoryCache &&  MemoryCache.agencies && MemoryCache.agencies[idArr[0]] && (<a href={MemoryCache.agencies[idArr[0]].agencies[0].url}>{MemoryCache.agencies[idArr[0]].agencies[0].name}</a>)}</div> */}

            <div className='popup-row'>
              <span><b>Stop ID:</b> {idArr[1]}</span>
              {/* The Stop Viewer button
                * Note: we use a vanilla Button instead of ViewStopButton because
                * connected components don't work within react-leaflet Popups)
                * TODO: Make ViewStopButton work here, perhaps w/ React 16 portals
                */}
              <Button
                className='view-stop-button'
                bsSize='xsmall'
                onClick={this._onClickView}
              >{languageConfig.stopViewer || 'Stop Viewer'}</Button>
            </div>

            {/* The "Set as [from/to]" ButtonGroup */}
            <div className='popup-row'>
              <SetFromToButtons
                map={this.props.leaflet.map}
                location={{ lat, lon, name }}
                setLocation={setLocation}
              />
            </div>
          </div>
        </Popup>
      </Marker>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  return {
    stops: state.otp.overlay.transit.stops,
    agencies:state.otp.agencies,
    queryMode: state.otp.currentQuery.mode,
    languageConfig: state.otp.config.language
  }
}

const mapDispatchToProps = {
  refreshStops: findStopsWithinBBox,
  //getAgency: getAgencyInformationsByFeedId,
  //getFeeds: getFeeds,
  // getAgencies:getAgenciesInformations,
  // clearAgency: ClearAgencyInformations,
  clearStops,
  setLocation,
  setViewedStop,
  setMainPanelContent
}

export default connect(mapStateToProps, mapDispatchToProps)(withLeaflet(StopsOverlay))
