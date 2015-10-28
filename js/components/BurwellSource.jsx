import React from 'react';
import LongText from './LongText.jsx';

var BurwellSource = React.createClass({
  getInitialState() {
    return {
      source_id: null
    }
  },

  showSource(event) {
    event.preventDefault();
  //  console.log(this.props.sourceMap[this.props.data.source_id]);
    this.props.onInteraction('active', false);
    this.props.onInteraction('currentSource', this.props.sourceMap[this.props.data.source_id]);
    this.props.onInteraction('showSource', true);
  },

  render() {
    return (
      <div className='burwell-source'>
        <h2 className='title-two'>{this.props.data.name}</h2>
        <p className='source-attribution'><small><i>
          Source: <a href='#' onClick={this.showSource}>{this.props.sourceMap[this.props.data.source_id].name}</a> <small>- {this.props.data.map_id}</small>
        </i></small></p>

        <p className='info-attr'><strong>Age: </strong>
        {
          this.props.data.t_int_name === this.props.data.b_int_name
          ? this.props.data.t_int_name
          : this.props.data.b_int_name + ' - ' + this.props.data.t_int_name
        } ({this.props.data.b_int_age} - {this.props.data.t_int_age}<small> Ma</small>)
        </p>

        {
          this.props.data.strat_name
          ? <p className='info-attr'><strong>Stratigraphic name: </strong>{this.props.data.strat_name}</p>
          : ''
        }

        {
          this.props.data.descrip
          ? <LongText
              title="Description"
              text={this.props.data.descrip}
            />
          : ''
        }

        {
          this.props.data.comments
          ? <LongText
              title="Comments"
              text={this.props.data.comments}
            />
          : ''
        }

        {
          this.props.data.lith
          ? <LongText
              title="Lithology"
              text={this.props.data.lith}
            />
          : ''
        }

      </div>
    );
  }
});

export default BurwellSource;
