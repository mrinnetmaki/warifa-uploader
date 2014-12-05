/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

var _ = require('lodash');
var React = require('react');
var appState = require('../state/appState');
var appActions = require('../state/appActions');

var Loading = require('./Loading.jsx');
var Login = require('./Login.jsx');
var LoggedInAs = require('./LoggedInAs.jsx');
var Scan = require('./Scan.jsx');
var UploadList = require('./UploadList.jsx');
var ViewDataLink = require('./ViewDataLink.jsx');

var config = require('../config');

var App = React.createClass({
  getInitialState: function() {
    return appState.getInitial();
  },

  componentWillMount: function() {
    appState.bindApp(this);
    appActions.bindApp(this);

    appActions.load(_.noop);

    this.appState = appState;
    this.appActions = appActions;
    this.localStore = require('../core/localStore');
    this.api = require('../core/api');
    this.device = require('../core/device');
  },

  render: function() {
    return (
      <div className={'App App--' + this.state.page}>
        <div className="App-header">{this.renderHeader()}</div>
        <div className="App-page">{this.renderPage()}</div>
      </div>
    );
  },

  renderHeader: function() {
    if (this.state.page === 'loading') {
      return null;
    }

    if (!this.appState.isLoggedIn()) {
      return this.renderSignupLink();
    }

    return <LoggedInAs
      user={this.state.user}
      onLogout={this.appActions.logout.bind(this.appActions)} />;
  },

  renderPage: function() {
    var page = this.state.page;

    if (page === 'loading') {
      return <Loading />;
    }

    if (page === 'login') {
      return <Login onLogin={this.appActions.login.bind(this.appActions)} />;
    }

    if (page === 'main') {
      return (
        <div>
          {this.renderScan()}
          <UploadList
            uploads={this.appState.uploadsWithFlags()}
            onUpload={this.appActions.upload.bind(this.appActions)} />
          {this.renderViewDataLink()}
        </div>
      );
    }

    return null;
  },

  renderSignupLink: function() {
    return (
      <div>
        <a href={config.BLIP_URL + '#/signup'} target="_blank">Sign up</a>
      </div>
    );
  },

  renderScan: function() {
    if (this.appState.hasUploadInProgress()) {
      return null;
    }

    return <Scan
      showInstructions={this.appState.isShowingDeviceInstructions()}
      onDetectDevices={this.appActions.detectDevices.bind(this.appActions)} />;
  },

  renderViewDataLink: function() {
    if (!this.appState.hasSuccessfulUpload()) {
      return null;
    }

    return <ViewDataLink
      href={config.BLIP_URL + '/#/patients/' + this.state.targetId + '/data'} />;
  },

  renderAppState: function() {
    return (
      <div>
        <br />
        <pre>{JSON.stringify(this.state, null, 2)}</pre>
      </div>
    );
  }
});

module.exports = App;
