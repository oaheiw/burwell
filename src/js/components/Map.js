import React from 'react';
import ReactDOM from 'react-dom';
import xhr from 'xhr';
import async from 'async';
import Config from './Config';

var Map = React.createClass({
  getInitialState: function() {
    return {
      requests: {
        gmna: null,
        gmus: null,
        macrostrat: null,
        articles: null,
        burwell: null
      }
    }
  },

  locate: function() {
    this.map.locate();
  },

  updateView: function(coords, z) {
    this.map.setView(coords, z);
  },

  componentDidMount: function() {
    var map = this.map = L.map(ReactDOM.findDOMNode(this), {
      attributionControl: false,
      minZoom: 1
    }).setView([40.8, -94.1], 3);

    // If there is a hash location, go there immediately
    if (window.location.hash.length > 3) {
      var hashLocation = L.Hash.parseHash(window.location.hash);
      map.setView(hashLocation.center, hashLocation.zoom);
      this.props.shareState('zoom', hashLocation.zoom);
    }

    // Make map states linkable
    var hash = new L.Hash(map);

    // Add our basemap
    this.stamen = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png', {
      zIndex: 1
    });

    this.burwell = L.tileLayer(Config.apiUrl + '/maps/burwell/vanilla/{z}/{x}/{y}/tile.png', {
      maxZoom: 19,
      opacity: 0.6,
      zIndex: 100
      //detectRetina: true
    });

    this.emphasized = L.tileLayer(Config.apiUrl + '/maps/burwell/emphasized/{z}/{x}/{y}/tile.png', {
      maxZoom: 19,
      opacity: 0.6,
      zIndex: 100
      //detectRetina: true
    }).addTo(map);

    this.satellite = L.tileLayer('https://api.mapbox.com/styles/v1/jczaplewski/cigmamq4n000xaaknfpuj1zdk/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiWnQxSC01USJ9.oleZzfREJUKAK1TMeCD0bg', {
      zIndex: 1,
      maxZoom: 19
    }).addTo(map);


    // Create the marker that will be used when user clicks
    this.marker = L.marker([0, 0], {
      icon: L.icon({
        iconUrl: 'img/marker-icon-bw-2x.png',
        shadowUrl: 'img/marker-shadow.png',
        iconSize: [25,41],
        iconAnchor: [12, 41]
      })
    });

    // Attach interaction handlers
    map.on('click', this.onClick);
    map.on('zoomstart, movestart', this.onMove);
    map.on('zoomend', this.adjustInterface);

    map.on('locationfound', (event) => {
      map.setView(event.latlng, 11);
      this.onClick(event);
    });

    this.props.locate(this.locate);
    this.props.updateView(this.updateView);
  },

  componentWillUpdate: function(nextProps) {
    // Handle burwell
    if (nextProps.data.hasBurwell && !(this.map.hasLayer(this.burwell))) {
      this.map.addLayer(this.burwell);
      this.map.removeLayer(this.emphasized);
      this.props.shareState('hasBurwell', true);
      this.props.shareState('hasEmphasized', false);
      return;

    } else if (!(nextProps.data.hasBurwell) && this.map.hasLayer(this.burwell)) {
      this.map.removeLayer(this.burwell);
      this.props.shareState('hasGeology', false);
    }

    // Handle emphasized
    if (nextProps.data.hasEmphasized && !(this.map.hasLayer(this.emphasized))) {
      this.map.addLayer(this.emphasized);
      this.map.removeLayer(this.burwell);
      this.props.shareState('hasEmphasized', true);
      this.props.shareState('hasBurwell', false);

    } else if (!(nextProps.data.hasEmphasized) && this.map.hasLayer(this.emphasized)) {
      this.map.removeLayer(this.emphasized);
      this.props.shareState('hasEmphasized', false);
    }

    // Handle satellite
    if (nextProps.data.hasSatellite && !(this.map.hasLayer(this.satellite))) {
      this.map.addLayer(this.satellite);
      this.map.removeLayer(this.stamen);
    } else if (!(nextProps.data.hasSatellite) && this.map.hasLayer(this.satellite)) {
      this.map.addLayer(this.stamen);
      this.map.removeLayer(this.satellite);
    }

    // Handle burwell opacity
    if (nextProps.data.burwellOpacity != this.props.data.burwellOpacity) {
      this.burwell.setOpacity(nextProps.data.burwellOpacity/100);
    }

    // Handle emphasized opacity
    if (nextProps.data.emphasizedOpacity != this.props.data.emphasizedOpacity) {
      this.emphasized.setOpacity(nextProps.data.emphasizedOpacity/100);
    }


  },

  onClick: function(d) {
    // Set the marker on the click location and add it to the map
    this.marker.setLatLng(d.latlng).addTo(this.map);
    this.props.shareState({
      lat: null,
      lng: null,
      elevation: null,
      active: true,
      burwell: [],
      articles: {journals: []},
      macrostrat: {
        names: [],
        strat_names: [{id: null, name: null}],
        rank_names: [],
        ids: []
      },
      lines: {
        name: '',
        type: '',
        direction: '',
        descrip: '',
        ref: {}
      },
      showMenu: false
    });

    // Abort pending requests so that interface stays consistent
    if (this.state.requests.articles && this.state.requests.articles.readyState != 4) {
      this.state.requests.articles.abort();
    }
    if (this.state.requests.burwell && this.state.requests.burwell.readyState != 4) {
      this.state.requests.burwell.abort();
    }

    // Jigger the map so that we can open the info display and still show the marker
    if (window.innerHeight < window.innerWidth) {
      this.map.panToOffset(d.latlng, [ -((window.innerWidth*0.6)/2), 0 ]);
    }

    // Fetch data
    this.getBurwell(d.latlng, this.map.getZoom());

  },

  onMove: function() {
    if (this.map.hasLayer(this.marker)) {
      this.map.removeLayer(this.marker);
      this.props.shareState('active', false);
    }
    if (this.props.data.showMenu) {
      this.props.shareState('showMenu', false);
    }
  //  this.props.shareState('lat', this.map.getCenter().lat);
  //  this.props.shareState('lng', this.map.getCenter().lng);
  },

  adjustInterface: function() {
    this.props.shareState('zoom', this.map.getZoom());
  },

  getBurwell: function(latlng, z) {
    this.state.requests.burwell = xhr({
      uri: `${Config.apiUrl}/mobile/map_query?lat=${latlng.lat.toFixed(5)}&lng=${latlng.lng.toFixed(5)}&z=${z}`
    }, (error, response, body) => {
      var data = JSON.parse(body);
      if (data.success.data) {
        if (data.success.data.macrostrat.rank_names) {
          this.getArticles([data.success.data.macrostrat.rank_names])
        }

        this.props.shareState({
          lat: latlng.lat,
          lng: latlng.lng,
          elevation: data.success.data.elevation,
          burwell: data.success.data.burwell,
          macrostrat: data.success.data.macrostrat,
          lines: data.success.data.lines
        })

        // Hack to get articles for Australia, UK medium, and South Africa in the absence of Macrostrat matches
        data.success.data.burwell.forEach(unit => {
          if ((unit.ref.source_id === 5 || unit.ref.source_id === 23 || unit.ref.source_id === 41) && unit.strat_name.length) {
            var name = (unit.strat_name.indexOf(' of ') > -1) ? unit.strat_name.split(' of ')[0] : unit.strat_name;
            this.getArticles([name]);
          }
        })
      }
    });
  },

  getArticles: function(strat_names) {
    this.state.requests.articles = xhr({
      uri: `${Config.geodeepdiveURL}/excerpts?term=${strat_names.join(',')}`
    }, (error, response, body) => {
      var data;
      if (body) {
        data = JSON.parse(response.body);
        if (data.error) {
          data = []
        } else {
          data = data.success.data
        }
      } else {
        data = []
      }

      var parsed = {
        journals: []
      };

      for (var i = 0; i < data.length; i++) {
        var found = false;
        for (var j = 0; j < parsed.journals.length; j++) {
          if (parsed.journals[j].name === data[i].journal) {
            parsed.journals[j].articles.push(data[i]);
            found = true;
          }
        }

        if (!found) {
          parsed.journals.push({
            name: data[i].journal,
            source: data[i].publisher,
            articles: [data[i]]
          });
        }
      }
      this.props.shareState('articles', parsed);

    });

  },

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.data.zoom != this.props.data.zoom) {
      return false;
    } else {
      return true;
    }
  },

  render: function() {
    return <div id='map'></div>
  }
});

export default Map;
