import React from 'react';
import ReactDOM from 'react-dom';
import AutocompleteResultItem from './AutocompleteResultItem';
import xhr from 'xhr';
import Config from './Config';

class Autocomplete extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      searchTerm: '',
      results: this.resetResults(),
      selectedIndex: 0,
      selectedItem: {},
      tResults: 0,
      showSuggestions: false,
      canClose: true,
      lastHit: new Date()
    }

    this.cache = {}

    this.updateResults = this.updateResults.bind(this);
    this.fetch = this.fetch.bind(this);
    this.fulfillRequest = this.fulfillRequest.bind(this);
    this.update = this.update.bind(this);
    this.navigateResults = this.navigateResults.bind(this);
    this.setSelected = this.setSelected.bind(this);
    this.doit = this.doit.bind(this);
    this.showSuggestions = this.showSuggestions.bind(this);
    this.hideSuggestions = this.hideSuggestions.bind(this);
    this.disableClose = this.disableClose.bind(this);
    this.enableClose = this.enableClose.bind(this);
    this.enableAndHide = this.enableAndHide.bind(this);
  }

  componentDidMount() {
    ReactDOM.findDOMNode(this.refs.autocompleteInput).focus()
  //  this.refs.autocompleteInput.getDOMNode().focus();
  }

  componentDidUpdate() {
    ReactDOM.findDOMNode(this.refs.autocompleteInput).focus()
  //  this.refs.autocompleteInput.getDOMNode().focus();
  }

  resetResults() {
    return [];
  }

  updateResults(data) {
    // Set the data and record the total number of search results returned
    this.setState({
      results: data,
      tResults: data.length
    });
  }

  fetch(query) {
    xhr({
    //  uri: `https://search.mapzen.com/v1/autocomplete?text=${query}&focus.point.lat=${this.props.lat}&focus.point.lon=${this.props.lng}&api_key=${Config.mapzenAPIKey}`
      uri: `https://search.mapzen.com/v1/autocomplete?text=${query}&api_key=${Config.mapzenAPIKey}`
    }, (error, response, body) => {
      var response = JSON.parse(body);

      // Filter
      var categories = ['country', 'region', 'county', 'locality', 'localadmin'];
      var found = [];

      var searchResults = response.features.filter(d => {
        if (categories.indexOf(d.properties.layer) > -1 && found.indexOf(d.properties.label) < 0) {
          found.push(d.properties.label);
          return d;
        }
      });

      // Cache the results so we don't have to make an HTTP request
      // next time we see the same query
      this.cache[query] = searchResults;

      // Update the current result list
      this.updateResults(searchResults);
    });
  }

  fulfillRequest(query) {
    // Rate limit to half a second
    if (new Date() - this.state.lastHit < 500) {
      return;
    } else {
      this.state.lastHit = new Date();
    }
    // Check if the query is long enough to fulfill
    if (query.length >= this.props.minLength) {
      // If it's cached, use the suggestions from there
      if (this.cache[query]) {
        this.updateResults(this.cache[query]);
      // Otherwise request them from the API
      } else {
        this.fetch(query);
      }
    } else {
      this.updateResults(this.resetResults());
    }
  }

  update(event) {
    this.setState({
      searchTerm: event.target.value,
      selectedIndex: 0
    });

    this.fulfillRequest(event.target.value);

    if (event.target.value !== this.state.selectedItem.title) {
      this.setState({showSuggestions: true});
    }
  }

  navigateResults(event) {
    switch(event.which) {
      // Down arrow
      case 40:
        if ((this.state.selectedIndex + 1) <= this.state.tResults) {
          this.setSelected(this.state.selectedIndex += 1);
        }
        break;
      // Up arrow
      case 38:
        if (this.state.selectedIndex > 0) {
          this.setSelected(this.state.selectedIndex -= 1);
        }
        break;
      // ->
      case 39:
        this.setSelected(1);
        break;
      // Enter
      case 13:
        if (this.state.tResults === 1) {
          this.setSelected(1);
        }
        this.doit();
        break;
      // Tab
      case 9:
        if (this.state.tResults) {
          this.setSelected(1);
        }
        break;
      case 27:
        this.hideSuggestions(event);
        break;
      default:
        break;
    }

    if ([9, 13, 38, 39, 40, 27].indexOf(event.which) > -1) {
      event.preventDefault();
    }
  }

  setSelected(idx) {
    this.setState({selectedIndex: idx});
  }

  disableClose() {
    this.setState({canClose: false});
  }

  enableClose() {
    this.setState({canClose: true});
  }

  doit(idx) {
    // Hide the veil
  //  this.props.reportState();
    var i = (idx) ? idx : this.state.selectedIndex;
    // Do something with the selection here
    var selected = this.state.results[i];
    var zoom;

    switch (selected.properties.layer) {
      case 'country':
        zoom = 5;
        break;
      case 'region':
        zoom = 6;
        break;
      case 'county':
        zoom = 8;
        break;
      case 'locality':
        zoom = 12;
        break;
      default:
        zoom = 12;
    }

    this.props.updateView(selected.geometry.coordinates.reverse(), zoom);
    this.props.broadcast('showSearch', false);

    this.setState({
      selectedItem: selected,
      showSuggestions: false,
      searchTerm: '',
      results: this.resetResults()
    });

    document.getElementsByClassName('autocomplete-input')[0].blur();
  }

  showSuggestions() {
    this.setState({showSuggestions: true});
    // Hide the veil
  //  this.props.reportState();
  }

  hideSuggestions(event) {
    if (this.state.canClose) {
      this.setState({showSuggestions: false});
      // Hide the veil
    //  this.props.reportState();
      event.target.blur();
    }
  }

  enableAndHide() {
    this.setState({
      canClose: true,
      showSuggestions: false
    });
  }

  render() {

    return (
      <div className='autocomplete-container'>
        <p className={this.state.searchTerm.length ? 'noDisplay' : 'autocomplete-placeholder-text'}>Enter a place name...</p>
        <div className='autocomplete-input-container'>
          <i className='fa fa-search autocomplete-search-icon'></i>
          <input
            className='autocomplete-input'
            ref='autocompleteInput'
            type='text'
            autoComplete='off'
            spellCheck='false'
            value={this.state.searchTerm}
            onKeyDown={this.navigateResults}
            onChange={this.update}
            onFocus={this.showSuggestions}
            onBlur={this.hideSuggestions}
          />
        </div>

        <div className='autocomplete-results'
          onMouseOver={this.disableClose}
          onMouseOut={this.enableClose}
          >
          <ul className='autocomplete-result-category-list'>
          {this.state.results.map((d, idx) => {
            return (
              <AutocompleteResultItem
                data={d.properties}
                index={idx}
                key={idx}
                ref={idx}
                selected={false}
                notify={this.setSelected}
                select={this.doit}
              />
            );
          })}
          </ul>

        </div>
      </div>
    );
  }
}

Autocomplete.defaultProps = {
  limit: 4,
  minLength: 2
}

export default Autocomplete;
