import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import isEqual from 'lodash.isequal'

import { Map, TileLayer, LayersControl, Popup, CircleMarker } from 'react-leaflet'

import { setLocation, setMapPopupLocation, setMapPopupLocationAndGeocode } from '../../actions/map'
import { setMapZoom, updateOverlayVisibility } from '../../actions/config'
import LocationIcon from '../icons/location-icon'
import { constructLocation } from '../../util/map'
import { getActiveItinerary, getActiveSearch } from '../../util/state'
import { getItineraryBounds, getLegBounds, legLocationAtDistance } from '../../util/itinerary'
import { isMobile } from '../../util/ui'
import MapBoxGLLayer from './mapbox-gl-layer'
import L from 'leaflet'

L.Evented.addInitHook(function () {
  if (this) this._singleClickTimeout = null
  this.on('click', this._scheduleSingleClick, this)
  this.on('dblclick dragstart zoomstart', this._cancelSingleClick, this)
})

L.Evented.include({
  _cancelSingleClick: function () {
    // This timeout is key to workaround an issue where double-click events
    // are fired in this order on some touch browsers: ['click', 'dblclick', 'click']
    // instead of ['click', 'click', 'dblclick']
    setTimeout(this._clearSingleClickTimeout.bind(this), 0)
  },

  _scheduleSingleClick: function (e) {
    this._clearSingleClickTimeout()

    this._singleClickTimeout = setTimeout(
      this._fireSingleClick.bind(this, e),
      (this.options.singleClickTimeout || 500)
    )
  },

  _fireSingleClick: function (e) {
    if (!e.originalEvent._stopped) {
      this.fire('singleclick', L.Util.extend(e, { type: 'singleclick' }))
    }
  },

  _clearSingleClickTimeout: function () {
    if (this._singleClickTimeout !== null) {
      clearTimeout(this._singleClickTimeout)
      this._singleClickTimeout = null
    }
  }
})

class BaseMap extends Component {
  static propTypes = {
    config: PropTypes.object,
    mapClick: PropTypes.func,
    setLocation: PropTypes.func, // TODO: rename from action name to avoid namespace conflict?
    toggleName: PropTypes.element
  }

  /* Internal Methods */

  _setLocationFromPopup = (type) => {
    const { setMapPopupLocation, setLocation, popupLocation: location } = this.props
    setMapPopupLocation({ location: null })
    setLocation({ type, location, reverseGeocode: true })
    if (typeof this.props.onSetLocation === 'function') {
      this.props.onSetLocation({type, location})
    }
  }

  _onClickTo = () => this._setLocationFromPopup('to')

  _onClickFrom = () => this._setLocationFromPopup('from')

  _onLeftClick = (e) => {
    this.props.setMapPopupLocationAndGeocode({ location: constructLocation(e.latlng) })
    if (typeof this.props.onClick === 'function') this.props.onClick(e)
  }

  _onOverlayAdd = ({ name }) => this.props.updateOverlayVisibility({ [name]: true })

  _onOverlayRemove = ({ name }) => this.props.updateOverlayVisibility({ [name]: false })

  // TODO: make map controlled component
  _mapBoundsChanged = e => {
    const bounds = e.target.getBounds()
    if (!bounds.equals(this.props.mapState.bounds)) {
      this.props.updateMapState({ bounds })
    }
  }

  _onViewportChanged = ({ zoom }) => this.props.setMapZoom({ zoom })

  _updateBounds (oldProps, newProps) {
    // TODO: maybe setting bounds ought to be handled in map props...

    oldProps = oldProps || {}
    newProps = newProps || {}

    // Don't auto-fit if popup us active
    if (oldProps.popupLocation || newProps.popupLocation) return

    const { map } = this.refs
    if (!map) return

    const padding = [30, 30]

    // Fit map to to entire itinerary if active itinerary bounds changed
    const oldItinBounds = oldProps.itinerary && getItineraryBounds(oldProps.itinerary)
    const fromChanged = !isEqual(oldProps.query && oldProps.query.from, newProps.query && newProps.query.from)
    const toChanged = !isEqual(oldProps.query && oldProps.query.to, newProps.query && newProps.query.to)
     const newItinBounds = newProps.itinerary && getItineraryBounds(newProps.itinerary)
      if (
        (!oldItinBounds && newItinBounds) ||
        (oldItinBounds && newItinBounds && !oldItinBounds.equals(newItinBounds))
      ) {
        map.leafletElement.fitBounds(newItinBounds, { padding })

     // Pan to to itinerary leg if made active (clicked); newly active leg must be non-null
      } else if (newProps.itinerary && newProps.activeLeg !== oldProps.activeLeg && newProps.activeLeg !== null) {
      map.leafletElement.fitBounds(
        getLegBounds(newProps.itinerary.legs[newProps.activeLeg]),
        { padding }
      )

    // If no itinerary update but from/to locations are present, fit to those
    } else if (newProps.query.from && newProps.query.to && (fromChanged || toChanged)) {
      // On certain mobile devices (e.g., Android + Chrome), setting from and to
      // locations via the location search component causes issues for this
      // fitBounds invocation. The map does not appear to be visible when these
      // prop changes are detected, so for now we should perhaps just skip this
      // fitBounds on mobile.
      // See https://github.com/opentripplanner/otp-react-redux/issues/133 for
      // more info.
      // TODO: Fix this so mobile devices will also update the bounds to the
      // from/to locations.
      if (!isMobile()) {
        map.leafletElement.fitBounds([
          [newProps.query.from.lat, newProps.query.from.lon],
          [newProps.query.to.lat, newProps.query.to.lon]
        ], { padding })
      }

    // If only from or to is set, pan to that
    } else if (newProps.query.from && fromChanged) {
      map.leafletElement.panTo([newProps.query.from.lat, newProps.query.from.lon])
    } else if (newProps.query.to && toChanged) {
      map.leafletElement.panTo([newProps.query.to.lat, newProps.query.to.lon])

    // Pan to to itinerary step if made active (clicked)
    } else if (
      newProps.itinerary &&
      newProps.activeLeg !== null &&
      newProps.activeStep !== null &&
      newProps.activeStep !== oldProps.activeStep
    ) {
      const leg = newProps.itinerary.legs[newProps.activeLeg]
      const step = leg.steps[newProps.activeStep]
      map.leafletElement.panTo([step.lat, step.lon])
    }
  }

  _popupClosed = () => this.props.setMapPopupLocation({ location: null })

  /**
   * Checks whether the modes have changed between old and new queries and
   * whether to update the map overlays accordingly (e.g., to show rental vehicle
   * options on the map).
   */
  _handleQueryChange = (oldQuery, newQuery) => {
    const { overlays } = this.props
    if (overlays && oldQuery.mode) {
      // Determine any added/removed modes
      const oldModes = oldQuery.mode.split(',')
      const newModes = newQuery.mode.split(',')
      const removed = oldModes.filter(m => !newModes.includes(m))
      const added = newModes.filter(m => !oldModes.includes(m))
      const overlayVisibility = {}
      for (const oConfig of overlays) {
        if (!oConfig.modes || oConfig.modes.length !== 1) continue
        // TODO: support multi-mode overlays
        const overlayMode = oConfig.modes[0]

        if (
          (
            overlayMode === 'CAR_RENT' ||
            overlayMode === 'CAR_HAIL' ||
            overlayMode === 'MICROMOBILITY_RENT'
          ) &&
          oConfig.companies
        ) {
          // Special handling for company-based mode overlays (e.g. carshare, car-hail)
          const overlayCompany = oConfig.companies[0] // TODO: handle multi-company overlays
          if (added.includes(overlayMode)) {
            // Company-based mode was just selected; enable overlay iff overlay's company is active
            if (newQuery.companies.includes(overlayCompany)) overlayVisibility[oConfig.name] = true
          } else if (removed.includes(overlayMode)) {
            // Company-based mode was just deselected; disable overlay (regardless of company)
            overlayVisibility[oConfig.name] = false
          } else if (newModes.includes(overlayMode) && oldQuery.companies !== newQuery.companies) {
            // Company-based mode remains selected but companies change
            overlayVisibility[oConfig.name] = newQuery.companies.includes(overlayCompany)
          }
        } else { // Default handling for other modes
          if (added.includes(overlayMode)) overlayVisibility[oConfig.name] = true
          if (removed.includes(overlayMode)) overlayVisibility[oConfig.name] = false
        }
      }
      // Only trigger update action if there are overlays to update.
      if (Object.keys(overlayVisibility).length > 0) {
        this.props.updateOverlayVisibility(overlayVisibility)
      }
    }
  }

  /* React Lifecycle methods */

  componentDidMount () {
    this._updateBounds(null, this.props)

    const lmap = this.refs.map.leafletElement
    lmap.options.singleClickTimeout = 250
    lmap.on('singleclick', (e) => { this._onLeftClick(e) })
  }

  componentDidUpdate (prevProps) {
    this._updateBounds(prevProps, this.props)
    // Check if any overlays should be toggled due to mode change
    this._handleQueryChange(prevProps.query, this.props.query)
  }

  // remove custom overlays on unmount
  // TODO: Is this needed? It may have something to do with mobile vs desktop views
  componentWillUnmount () {
    const lmap = this.refs.map.leafletElement
    lmap.eachLayer((layer) => {
      lmap.removeLayer(layer)
    })
  }

  render () {
    const { config, children, diagramLeg, elevationPoint, popupLocation } = this.props
    const { baseLayers } = config.map
    const showElevationProfile = Boolean(config.elevationProfile)
    // Separate overlay layers into user-controlled (those with a checkbox in
    // the layer control) and those that are needed by the app (e.g., stop viewer
    // and itinerary overlay).
    const userControlledOverlays = []
    const fixedOverlays = []
    React.Children
      .toArray(children)
      .forEach(child => {
        if (child.props.name) userControlledOverlays.push(child)
        else fixedOverlays.push(child)
      })

    const center = config.map && config.map.initLat && config.map.initLon
      ? [config.map.initLat, config.map.initLon]
      : null

    // Compute the elevation point marker, if activeLeg and elevation profile is enabled.
    let elevationPointMarker = null
    if (showElevationProfile && diagramLeg && elevationPoint) {
      const pos = legLocationAtDistance(diagramLeg, elevationPoint)
      if (pos) {
        elevationPointMarker = (
          <CircleMarker
            center={pos}
            fillColor='#084c8d'
            weight={6}
            color='#555'
            opacity={0.4}
            radius={5}
            fill
            fillOpacity={1} />
        )
      }
    }

    return (
      <Map
        ref='map'
        className='map'
        center={center}
        // onClick={this._onLeftClick}
        zoom={config.map.initZoom || 13}
        maxZoom={config.map.maxZoom}
        onOverlayAdd={this._onOverlayAdd}
        onOverlayRemove={this._onOverlayRemove}
        onViewportChanged={this._onViewportChanged}
        /* Note: Map-click is handled via single-click plugin, set up in componentDidMount() */
      >
        {/* Create the layers control, including base map layers and any
          * user-controlled overlays. */}
        <LayersControl position='topright'>
          {/* base layers */
            baseLayers && baseLayers.map((layer, i) => {
              // Fix tile size/zoom offset: https://stackoverflow.com/a/37043490/915811
              const retinaProps = L.Browser.retina && layer.hasRetinaSupport
                ? { tileSize: 512, zoomOffset: -1 }
                : {}
              return (
                <LayersControl.BaseLayer
                  name={layer.name}
                  checked={i === 0}
                  key={i}>
                    <MapBoxGLLayer style={layer.url}
                    accessToken=""
                    attribution={layer.attribution}
                    maxZoom={layer.maxZoom}
                    {...retinaProps}
                    detectRetina />
                  {/* <TileLayer
                    url={layer.url}
                    attribution={layer.attribution}
                    maxZoom={layer.maxZoom}
                    {...retinaProps}
                    detectRetina /> */}
                </LayersControl.BaseLayer>
              )
            })
          }

          {/* user-controlled overlay layers (e.g., vehicle locations, stops) */
            userControlledOverlays.map((child, i) => {              
              return (
                <LayersControl.Overlay
                  key={i}
                  name={child.props.name}
                  checked={child.props.visible}
                >
                  {child}
                </LayersControl.Overlay>
              )
            })
          }
        </LayersControl>

        {/* Add the fixed, i.e. non-user-controllable, overlays (e.g., itinerary overlay) */}
        {fixedOverlays}

        {/* Add the location selection popup, if visible */}
        {popupLocation && (
          <Popup ref='clickPopup'
            position={[popupLocation.lat, popupLocation.lon]}
            onClose={this._popupClosed}
          >
            <div style={{ width: 240 }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                {popupLocation.name.split(',').length > 3
                  ? popupLocation.name.split(',').splice(0, 3).join(',')
                  : popupLocation.name
                }
              </div>
              <div>
                Plan a trip:
                <span style={{ margin: '0px 5px' }}><LocationIcon type='from' /></span>
                <button className='link-button'
                  onClick={this._onClickFrom}>
                  From here
                </button>{' '}|{' '}
                <span style={{ margin: '0px 5px' }}><LocationIcon type='to' /></span>
                <button className='link-button'
                  onClick={this._onClickTo}>
                  To here
                </button>
              </div>
            </div>
          </Popup>
        )}

        {/* Add the elevation point marker */}
        {elevationPointMarker}
      </Map>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  const activeSearch = getActiveSearch(state.otp)
  const overlays = state.otp.config.map && state.otp.config.map.overlays
    ? state.otp.config.map.overlays
    : []
  return {
    activeLeg: activeSearch && activeSearch.activeLeg,
    activeStep: activeSearch && activeSearch.activeStep,
    config: state.otp.config,
    diagramLeg: state.otp.ui.diagramLeg,
    elevationPoint: state.otp.ui.elevationPoint,
    mapState: state.otp.mapState,
    isFromSet:
      state.otp.currentQuery.from &&
      state.otp.currentQuery.from.lat !== null &&
      state.otp.currentQuery.from.lon !== null,
    isToSet:
      state.otp.currentQuery.to &&
      state.otp.currentQuery.to.lat !== null &&
      state.otp.currentQuery.to.lon !== null,
    itinerary: getActiveItinerary(state.otp),
    overlays,
    popupLocation: state.otp.ui.mapPopupLocation,
    query: state.otp.currentQuery
  }
}

const mapDispatchToProps = {
  setLocation,
  setMapPopupLocation,
  setMapPopupLocationAndGeocode,
  setMapZoom,
  updateOverlayVisibility
}

export default connect(mapStateToProps, mapDispatchToProps)(BaseMap)
