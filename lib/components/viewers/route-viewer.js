import React, { Component, PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Label, Button } from 'react-bootstrap'
import { VelocityTransitionGroup } from 'velocity-react'
import { connect } from 'react-redux'

import Icon from '../narrative/icon'

import { setMainPanelContent, setViewedRoute } from '../../actions/ui'
import { findRoutes, findRoute } from '../../actions/api'
import { routeComparator } from '../../util/itinerary'

function operatorIndexForRoute (operators, route) {
  if (!route.agency) return 0
  const index = operators.findIndex(o =>
    o.id.toLowerCase() === route.agency.id.split(':')[0].toLowerCase())
  if (index !== -1 && typeof operators[index].order !== 'undefined') return operators[index].order
  else return 0
}

/**
 * Determine the appropriate contrast color for text (white or black) based on
 * the input hex string (e.g., '#ff00ff') value.
 *
 * From https://stackoverflow.com/a/11868398/915811
 *
 * TODO: Move to @opentripplanner/core-utils once otp-rr uses otp-ui library.
 */
function getContrastYIQ (hexcolor) {
  hexcolor = hexcolor.replace('#', '')
  const r = parseInt(hexcolor.substr(0, 2), 16)
  const g = parseInt(hexcolor.substr(2, 2), 16)
  const b = parseInt(hexcolor.substr(4, 2), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? '000000' : 'ffffff'
}

class RouteViewer extends Component {
  static propTypes = {
    hideBackButton: PropTypes.bool,
    routes: PropTypes.object
  }
  state={
    selectedAgency:'',
  }
  _backClicked = () => this.props.setMainPanelContent(null)

  constructor(){
    super();
    this.onRouteClick=this.onRouteClick.bind(this);
    this.createGroupRow=this.createGroupRow.bind(this);
  }
  componentDidMount () {
    this.props.findRoutes()
  }
  componentDidUpdate(prevProps, prevState, snapshot){
    const {
      routes,
      viewedRoute
    } = this.props    
    const sortedRoutes = routes
    ? Object.values(routes).sort(routeComparator)
    : []

    if (prevState.selectedAgency!=this.state.selectedAgency){
      var h=this.state.selectedAgency || '';
      if (h=='')
        this.props.setViewedRoute({ routeId: null })
    }
    else if (sortedRoutes && viewedRoute && 
        (prevProps.viewedRoute!=viewedRoute || (viewedRoute!=null && viewedRoute.routeId!='' && this.state.selectedAgency==''))){
      var route=sortedRoutes.find(r=>r.id==viewedRoute.routeId);
      if (route){
        var agencyName= route.agencyName || route.agency.name;
        if (agencyName && agencyName!='') this.setState({selectedAgency:agencyName})
      }      
    }
  }

  onRouteClick(header){
    this.setState((state)=>{
      let h=state.selectedAgency==header?'':header;
      return {selectedAgency:h};
    });
      
  }
  createGroupRow(header, allRoutes){
    const {
      findRoute,
      setViewedRoute,
      viewedRoute
    } = this.props    
    const padLeft=(str)=>{
      str=str || '';
      return str.padLeft(50, '0');
    }
    const isNumeric=(n)=> {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }
    const sort=(n1,n2)=>{
      if (n1==n2)
        return 0;
      if (n1.shortName && n2.shortName){
        var isn1Number=isNumeric(n1.shortName);
        var isn2Number=isNumeric(n2.shortName);
        //debugger;
        if (isn1Number && isn2Number){
          return padLeft(n1.shortName)>padLeft(n2.shortName)?1:-1;
        }
        if (isn1Number && !isn2Number) return -1;
        if (!isn1Number && isn2Number) return 1;  
        return padLeft(n1.shortName)>padLeft(n2.shortName)?1:-1;
      }
      return padLeft(n1.id)>padLeft(n2.id)?1:-1;
    }
    return (
      <div key={"group_" + header}>
        <h3 style={{textDecoration:'underline', cursor:'pointer'}} onClick={()=>this.onRouteClick(header)}>{header}</h3>
        <div style={{display:this.state.selectedAgency==header?'block':'none'}}>            
        {allRoutes[header].sort(sort)
        .map(r=>
          <RouteRow
              findRoute={findRoute}
              isActive={viewedRoute && viewedRoute.routeId === r.id}
              key={r.id}
              // operator={operator}
              route={r}
              setViewedRoute={setViewedRoute}
            />)
        }
        </div>
      </div>
    );
  }
  render () {
    const {
      findRoute,
      hideBackButton,
      languageConfig,
      operators,
      routes,
      setViewedRoute,
      viewedRoute
    } = this.props
    const sortedRoutes = routes
      ? Object.values(routes).sort(routeComparator)
      : []
    const agencySortedRoutes = operators.length > 0
      ? sortedRoutes.sort((a, b) => {
        return operatorIndexForRoute(operators, a) - operatorIndexForRoute(operators, b)
      })
      : sortedRoutes

    var routesPerAgency={};
    for(var i=0;i<sortedRoutes.length;i++){      
      var agencyName= sortedRoutes[i].agencyName || sortedRoutes[i].agency.name;
      if (agencyName!==undefined && agencyName!=null && agencyName!=''){
        if (routesPerAgency[agencyName]==undefined) routesPerAgency[agencyName]=[];
        routesPerAgency[agencyName].push(sortedRoutes[i]);  
      }
    }
    //const routesPerAgencyOrdered = {};
    let routesElements=[];
    Object.keys(routesPerAgency).sort().forEach((key)=> {
      routesElements.push( this.createGroupRow(key, routesPerAgency));
      //routesPerAgencyOrdered[key] = routesPerAgency[key];
    });

    
    // for(var a in routesPerAgencyOrdered){
    //   if (routesPerAgencyOrdered.hasOwnProperty(a)){
    //     routesElements.push( this.createGroupRow(a, routesPerAgencyOrdered));
    //   }
    // }
    
    return (
      <div className='route-viewer'>
        {/* Header Block */}
        <div className='route-viewer-header'>
          {/* Back button */}
          {!hideBackButton && (
            <div className='back-button-container'>
              <Button
                bsSize='small'
                onClick={this._backClicked}
              ><Icon type='arrow-left' />Back</Button>
            </div>
          )}

          {/* Header Text */}
          <div className='header-text'>
            {languageConfig.routeViewer || 'Route Viewer'}
          </div>
          <div className=''>
            {languageConfig.routeViewerDetails}
          </div>
          <div style={{ clear: 'both' }} />
        </div>

        <div className='route-viewer-body'>
          {
            routesElements && routesElements.length>0 && 
            routesElements
          }
          {
            (routesElements==undefined || routesElements.length==0) && 
          agencySortedRoutes
            .map(route => {
              // Find operator based on agency_id (extracted from OTP route ID).
              // TODO: re-implement multi-agency logos for route viewer.
              // const operator = operatorForRoute(operators, route) || {}
              return (
                <RouteRow
                  findRoute={findRoute}
                  isActive={viewedRoute && viewedRoute.routeId === route.id}
                  key={route.id}
                  // operator={operator}
                  route={route}
                  setViewedRoute={setViewedRoute}
                />
              )
            })
          }
        </div>
      </div>
    )
  }
}

class RouteRow extends PureComponent {
  _onClick = () => {
    const { findRoute, isActive, route, setViewedRoute } = this.props
    if (isActive) {
      // Deselect current route if active.
      setViewedRoute({ routeId: null })
    } else {
      // Otherwise, set active and fetch route patterns.
      findRoute({ routeId: route.id })
      setViewedRoute({ routeId: route.id })
    }
  }

  render () {
    const {isActive, route, operator} = this.props
    const {defaultRouteColor, defaultRouteTextColor, longNameSplitter} = operator || {}
    const backgroundColor = `#${defaultRouteColor || route.color || 'ffffff'}`
    // NOTE: text color is not a part of short response route object, so there
    // is no way to determine from OTP what the text color should be if the
    // background color is, say, black. Instead, determine the appropriate
    // contrast color and use that if no text color is available.
    const contrastColor = getContrastYIQ(backgroundColor)
    const color = `#${defaultRouteTextColor || route.textColor || contrastColor}`
    // Default long name is empty string (long name is an optional GTFS value).
    let longName = ''
    if (route.longName) {
      // Attempt to split route name if splitter is defined for operator (to
      // remove short name value from start of long name value).
      const nameParts = route.longName.split(longNameSplitter)
      longName = (longNameSplitter && nameParts.length > 1)
        ? nameParts[1]
        : route.longName
      // If long name and short name are identical, set long name to be an empty
      // string.
      if (longName === route.shortName) longName = ''
    }
    return (
      <div
        style={{
          borderBottom: '1px solid gray',
          backgroundColor: isActive ? '#f6f8fa' : 'white'
        }}>
        <Button className='clear-button-formatting' style={{ padding: 8, width: '100%' }}
          onClick={this._onClick}
        >
          <div style={{display: 'inline-block'}}>
            {// TODO: re-implement multi-agency logos for route viewer.
              // Currently, the agency object is not nested within the get all
              // routes endpoint and causing this to only display operators for
              // the selected route.
              // operator && <img src={operator.logo} style={{marginRight: '5px'}} height={25} />
            }
          </div>
          <div style={{display: 'inline-block', marginTop: '2px'}}>
            <Label
              style={{
                backgroundColor: backgroundColor === '#ffffff' ? 'rgba(0,0,0,0)' : backgroundColor,
                fontSize: 'medium',
                fontWeight: 400,
                color
              }}>
              <b>{route.shortName}</b> {longName}
            </Label>
          </div>
        </Button>
        <VelocityTransitionGroup enter={{animation: 'slideDown'}} leave={{animation: 'slideUp'}}>
          {isActive && (
            <div style={{ padding: 8 }}>
              {route.url
                ? <a href={route.url} target='_blank'>Route Details</a>
                : 'No route URL provided.'
              }
            </div>
          )}
        </VelocityTransitionGroup>
      </div>
    )
  }
}
// connect to redux store

const mapStateToProps = (state, ownProps) => {
  return {
    operators: state.otp.config.operators,
    routes: state.otp.transitIndex.routes,
    viewedRoute: state.otp.ui.viewedRoute,
    languageConfig: state.otp.config.language
  }
}

const mapDispatchToProps = {
  findRoute,
  findRoutes,
  setMainPanelContent,
  setViewedRoute
}

export default connect(mapStateToProps, mapDispatchToProps)(RouteViewer)
