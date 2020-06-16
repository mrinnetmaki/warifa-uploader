/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014-2016, Tidepool Project
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

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { remote } from 'electron';
import * as metrics from '../constants/metrics';
import { Route, Switch } from 'react-router-dom';
import dns from 'dns';

const { Menu } = remote;

import bows from 'bows';

import config from '../../lib/config.js';

import carelink from '../../lib/core/carelink.js';
import device from '../../lib/core/device.js';
import localStore from '../../lib/core/localStore.js';

import actions from '../actions/';
const asyncActions = actions.async;
const syncActions = actions.sync;

import * as actionSources from '../constants/actionSources';
import { pages, urls, pagesMap } from '../constants/otherConstants';
import { checkVersion } from '../utils/drivers';
import debugMode from '../utils/debugMode';

import MainPage from './MainPage';
import Login from '../components/Login';
import Loading from '../components/Loading';
import SettingsPage from './SettingsPage';
import ClinicUserSelectPage from './ClinicUserSelectPage';
import ClinicUserEditPage from './ClinicUserEditPage';
import NoUploadTargetsPage from './NoUploadTargetsPage';
import UpdatePlease from '../components/UpdatePlease';
import VersionCheckError from '../components/VersionCheckError';
import Footer from '../components/Footer';
import Header from '../components/Header';
import UpdateModal from '../components/UpdateModal';
import UpdateDriverModal from '../components/UpdateDriverModal';
import DeviceTimeModal from '../components/DeviceTimeModal';
import AdHocModal from '../components/AdHocModal';

import styles from '../../styles/components/App.module.less';

const serverdata = {
  Local: {
    API_URL: 'http://localhost:1300/tpapi',
    UPLOAD_URL: 'http://localhost:1300/tpupload',
    DATA_URL: 'http://localhost:1300/tpdata',
    BLIP_URL: 'http://localhost:1300/'
  },
  Development: {
    API_URL: 'https://dev.sensotrend.fi/tpapi',
    UPLOAD_URL: 'https://dev.sensotrend.fi/tpupload',
    DATA_URL: 'https://dev.sensotrend.fi/tpdata',
    BLIP_URL: 'https://dev.sensotrend.fi/'
  },
  Staging: {
    API_URL: 'https://test.sensotrend.fi/tpapi',
    UPLOAD_URL: 'https://test.sensotrend.fi/tpupload',
    DATA_URL: 'https://test.sensotrend.fi/tpdata',
    BLIP_URL: 'https://test.sensotrend.fi/'
  },
  Integration: {
    API_URL: 'https://test.sensotrend.fi/tpapi',
    UPLOAD_URL: 'https://test.sensotrend.fi/tpupload',
    DATA_URL: 'https://test.sensotrend.fi/tpdata',
    BLIP_URL: 'https://test.sensotrend.fi/'
  },
  Production: {
    API_URL: 'https://connect.sensotrend.fi/tpapi',
    UPLOAD_URL: 'https://connect.sensotrend.fi/tpupload',
    DATA_URL: 'https://connect.sensotrend.fi/tpdata',
    BLIP_URL: 'https://connect.sensotrend.fi/'
  },
  ['Nightscout.fi Staging (dev)']: {
    API_URL: 'https://dev.nightscout.fi/tpapi',
    UPLOAD_URL: 'https://dev.nightscout.fi/tpupload',
    DATA_URL: 'https://dev.nightscout.fi/tpdata',
    BLIP_URL: 'https://dev.nightscout.fi/'
  },
  ['Nightscout.fi Integration (test)']: {
    API_URL: 'https://test.nightscout.fi/tpapi',
    UPLOAD_URL: 'https://test.nightscout.fi/tpupload',
    DATA_URL: 'https://test.nightscout.fi/tpdata',
    BLIP_URL: 'https://test.nightscout.fi/'
  },
  ['Nightscout.fi Production']: {
    API_URL: 'https://connect.nightscout.fi/tpapi',
    UPLOAD_URL: 'https://connect.nightscout.fi/tpupload',
    DATA_URL: 'https://connect.nightscout.fi/tpdata',
    BLIP_URL: 'https://connect.nightscout.fi/'
  }
};

export class App extends Component {
  static propTypes = {
    route: PropTypes.shape({
      api: PropTypes.func.isRequired
    }).isRequired
  };

  constructor(props) {
    super(props);
    this.log = bows('App');
    const initial_server = _.findKey(serverdata, (key) => key.API_URL === config.API_URL);
    this.state = {
      server: initial_server
    };
  }

  componentWillMount(){
    checkVersion(this.props.dispatch);
    let api = this.props.api;
    this.props.async.doAppInit(
      _.assign({ environment: this.state.server }, config), {
      api: api,
      carelink,
      device,
      localStore,
      log: this.log
    });

    const addServers = (servers) => {
      if (servers && servers.length && servers.length > 0) {
        for (let server of servers) {
          const protocol = server.name === 'localhost' ? 'http://' : 'https://';
          const url = protocol + server.name + ':' + server.port;
          serverdata[server.name] = {
            API_URL: url,
            UPLOAD_URL: url,
            DATA_URL: url + '/dataservices',
            BLIP_URL: url,
          };
        }
      } else {
        this.log('No servers found');
      }
    };

    dns.resolveSrv('environments-srv.tidepool.org', (err, servers) => {
      if (err) {
        this.log(`DNS resolver error: ${err}. Retrying...`);
        dns.resolveSrv('environments-srv.tidepool.org', (err2, servers2) => {
          if (!err2) {
           addServers(servers2);
          }
        });
      } else {
        addServers(servers);
      }
    });

    window.addEventListener('contextmenu', this.handleContextMenu, false);
  }

  setServer = info => {
    console.log('will use', info.label, 'server');
    var serverinfo = serverdata[info.label];
    serverinfo.environment = info.label;
    this.props.api.setHosts(serverinfo);
    this.setState({server: info.label});
  };

  render() {
    return (
      <div className={styles.app} onClick={this.handleDismissDropdown}>
        <Header location={this.props.location} />
        <Switch>
          <Route exact strict path="/" component={Loading} />
          <Route path="/login" component={Login}/>
          <Route path="/main" component={MainPage}/>
          <Route path="/settings" component={SettingsPage}/>
          <Route path="/clinic_user_select" component={ClinicUserSelectPage}/>
          <Route path="/clinic_user_edit" component={ClinicUserEditPage}/>
          <Route path="/no_upload_targets" component={NoUploadTargetsPage}/>
        </Switch>
        <Footer version={config.version} />
        {/* VersionCheck as overlay */}
        {this.renderVersionCheck()}
        <UpdateModal />
        <UpdateDriverModal />
        <DeviceTimeModal />
        <AdHocModal />
      </div>
    );
  }

  handleContextMenu = e => {
    e.preventDefault();
    const { clientX, clientY } = e;
    let template = [];
    if (process.env.NODE_ENV === 'development') {
      template.push({
        label: 'Inspect element',
        click() {
          remote.getCurrentWindow().inspectElement(clientX, clientY);
        }
      });
      template.push({
        type: 'separator'
      });
    }
    if (this.props.location.pathname === pagesMap.LOGIN) {
      const submenus = [];
      for (let server of _.keys(serverdata)) {
        submenus.push({
          label: server,
          click: this.setServer,
          type: 'radio',
          checked: this.state.server === server
        });
      }
      template.push({
        label: 'Change server',
        submenu: submenus,
      });
      template.push({
        label: 'Toggle Debug Mode',
        type: 'checkbox',
        checked: debugMode.isDebug,
        click() {
          debugMode.setDebug(!debugMode.isDebug);
        }
      });
    }
    const menu = Menu.buildFromTemplate(template);
    menu.popup(remote.getCurrentWindow());
  };

  handleDismissDropdown = () => {
    const { dropdown } = this.props;
    // only toggle the dropdown by clicking elsewhere if it's open
    if (dropdown === true) {
      this.props.sync.toggleDropdown(dropdown);
    }
  };

  renderVersionCheck() {
    const { readyToRenderVersionCheckOverlay, unsupported } = this.props;
    if (readyToRenderVersionCheckOverlay === false || unsupported === false) {
      return null;
    }
    if (unsupported instanceof Error) {
      return (
        <VersionCheckError errorMessage={unsupported.message || 'Unknown error'}/>
      );
    }
    if (unsupported === true) {
      return (
        <UpdatePlease knowledgeBaseLink={urls.HOW_TO_UPDATE_KB_ARTICLE} />
      );
    }
  }
}

App.propTypes = {};

export default connect(
  (state, ownProps) => {
    return {
      // plain state
      dropdown: state.dropdown,
      unsupported: state.unsupported,
      // derived state
      readyToRenderVersionCheckOverlay: (
        !state.working.initializingApp && !state.working.checkingVersion
      )
    };
  },
  (dispatch) => {
    return {
      async: bindActionCreators(asyncActions, dispatch),
      sync: bindActionCreators(syncActions, dispatch),
      dispatch: dispatch
    };
  }
)(App);
