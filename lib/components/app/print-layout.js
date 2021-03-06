import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Button } from 'react-bootstrap'

import BaseMap from '../map/base-map'
import EndpointsOverlay from '../map/endpoints-overlay'
import TransitiveOverlay from '../map/transitive-overlay'
import PrintableItinerary from '../narrative/printable/printable-itinerary'
import { parseUrlQueryString } from '../../actions/form'
import { routingQuery } from '../../actions/api'
import { getActiveItinerary } from '../../util/state'
import { getTimeFormat } from '../../util/time'

class PrintLayout extends Component {
  static propTypes = {
    itinerary: PropTypes.object,
    parseQueryString: PropTypes.func
  }

  constructor (props) {
    super(props)
    this.state = {
      mapVisible: true
    }
  }

  _toggleMap = () => {
    this.setState({ mapVisible: !this.state.mapVisible })
  }

  _print = () => {
    window.print()
  }

  componentDidMount () {
    const { location } = this.props
    // Add print-view class to html tag to ensure that iOS scroll fix only applies
    // to non-print views.
    const root = document.getElementsByTagName('html')[0]
    root.setAttribute('class', 'print-view')
    // Parse the URL query parameters, if present
    if (location && location.search) {
      this.props.parseUrlQueryString()
    }
  }

  /**
   * Remove class attribute from html tag on clean up.
   */
  componentWillUnmount () {
    const root = document.getElementsByTagName('html')[0]
    root.removeAttribute('class')
  }

  render () {
    const { configCompanies, customIcons, itinerary, timeFormat } = this.props
    return (
      <div className='otp print-layout'>
        {/* The header bar, including the Toggle Map and Print buttons */}
        <div className='header'>
          <div style={{ float: 'right' }}>
            <Button bsSize='small' onClick={this._toggleMap}>
              <i className='fa fa-map' /> Toggle Map
            </Button>
            {' '}
            <Button bsSize='small' onClick={this._print}>
              <i className='fa fa-print' /> Print
            </Button>
          </div>
          Itinerary
        </div>

        {/* The map, if visible */}
        {this.state.mapVisible &&
          <div className='map-container'>
            <BaseMap>
              <TransitiveOverlay />
              <EndpointsOverlay />
            </BaseMap>
          </div>
        }

        {/* The main itinerary body */}
        {itinerary
          ? <PrintableItinerary
            configCompanies={configCompanies}
            customIcons={customIcons}
            itinerary={itinerary}
            timeFormat={timeFormat} />
          : null
        }
      </div>
    )
  }
}

// connect to the redux store

const mapStateToProps = (state, ownProps) => {
  return {
    itinerary: getActiveItinerary(state.otp),
    configCompanies: state.otp.config.companies,
    timeFormat: getTimeFormat(state.otp.config)
  }
}

const mapDispatchToProps = {
  parseUrlQueryString,
  routingQuery
}

export default connect(mapStateToProps, mapDispatchToProps)(PrintLayout)
