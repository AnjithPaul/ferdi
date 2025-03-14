import { systemPreferences } from '@electron/remote';
import { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import prettyBytes from 'pretty-bytes';
import { defineMessages, injectIntl } from 'react-intl';

import { mdiGithub, mdiInformation, mdiOpenInNew } from '@mdi/js';
import Form from '../../../lib/Form';
import Button from '../../ui/Button';
import Toggle from '../../ui/Toggle';
import ToggleRaw from '../../ui/ToggleRaw';
import Select from '../../ui/Select';
import Input from '../../ui/Input';

import {
  DEFAULT_APP_SETTINGS,
  FRANZ_TRANSLATION,
  GITHUB_FRANZ_URL,
} from '../../../config';
import { isMac, isWindows, lockFerdiShortcutKey } from '../../../environment';
import {
  ferdiVersion,
  userDataPath,
  userDataRecipesPath,
} from '../../../environment-remote';
import { openPath } from '../../../helpers/url-helpers';
import globalMessages from '../../../i18n/globalMessages';
import { Icon } from '../../ui/icon';

const debug = require('debug')('Ferdi:EditSettingsForm');

const messages = defineMessages({
  headlineGeneral: {
    id: 'settings.app.headlineGeneral',
    defaultMessage: 'General',
  },
  sentryInfo: {
    id: 'settings.app.sentryInfo',
    defaultMessage:
      'Sending telemetry data allows us to find errors in Ferdi - we will not send any personal information like your message data!',
  },
  hibernateInfo: {
    id: 'settings.app.hibernateInfo',
    defaultMessage:
      'By default, Ferdi will keep all your services open and loaded in the background so they are ready when you want to use them. Service Hibernation will unload your services after a specified amount. This is useful to save RAM or keeping services from slowing down your computer.',
  },
  inactivityLockInfo: {
    id: 'settings.app.inactivityLockInfo',
    defaultMessage:
      'Minutes of inactivity, after which Ferdi should automatically lock. Use 0 to disable',
  },
  todoServerInfo: {
    id: 'settings.app.todoServerInfo',
    defaultMessage: 'This server will be used for the "Ferdi Todo" feature.',
  },
  lockedPassword: {
    id: 'settings.app.lockedPassword',
    defaultMessage: 'Password',
  },
  lockedPasswordInfo: {
    id: 'settings.app.lockedPasswordInfo',
    defaultMessage:
      "Please make sure to set a password you'll remember.\nIf you loose this password, you will have to reinstall Ferdi.",
  },
  lockInfo: {
    id: 'settings.app.lockInfo',
    defaultMessage:
      'Password Lock allows you to keep your messages protected.\nUsing Password Lock, you will be prompted to enter your password everytime you start Ferdi or lock Ferdi yourself using the lock symbol in the bottom left corner or the shortcut {lockShortcut}.',
  },
  scheduledDNDTimeInfo: {
    id: 'settings.app.scheduledDNDTimeInfo',
    defaultMessage:
      'Times in 24-Hour-Format. End time can be before start time (e.g. start 17:00, end 09:00) to enable Do-not-Disturb overnight.',
  },
  scheduledDNDInfo: {
    id: 'settings.app.scheduledDNDInfo',
    defaultMessage:
      'Scheduled Do-not-Disturb allows you to define a period of time in which you do not want to get Notifications from Ferdi.',
  },
  headlineLanguage: {
    id: 'settings.app.headlineLanguage',
    defaultMessage: 'Language',
  },
  headlineUpdates: {
    id: 'settings.app.headlineUpdates',
    defaultMessage: 'Updates',
  },
  headlineAppearance: {
    id: 'settings.app.headlineAppearance',
    defaultMessage: 'Appearance',
  },
  universalDarkModeInfo: {
    id: 'settings.app.universalDarkModeInfo',
    defaultMessage:
      'Universal Dark Mode tries to dynamically generate dark mode styles for services that are otherwise not currently supported.',
  },
  accentColorInfo: {
    id: 'settings.app.accentColorInfo',
    defaultMessage:
      'Write your accent color in a CSS-compatible format. (Default: {defaultAccentColor})',
  },
  headlinePrivacy: {
    id: 'settings.app.headlinePrivacy',
    defaultMessage: 'Privacy',
  },
  headlineAdvanced: {
    id: 'settings.app.headlineAdvanced',
    defaultMessage: 'Advanced',
  },
  translationHelp: {
    id: 'settings.app.translationHelp',
    defaultMessage: 'Help us to translate Ferdi into your language.',
  },
  spellCheckerLanguageInfo: {
    id: 'settings.app.spellCheckerLanguageInfo',
    defaultMessage:
      "Ferdi uses your Mac's build-in spellchecker to check for typos. If you want to change the languages the spellchecker checks for, you can do so in your Mac's System Preferences.",
  },
  subheadlineCache: {
    id: 'settings.app.subheadlineCache',
    defaultMessage: 'Cache',
  },
  cacheInfo: {
    id: 'settings.app.cacheInfo',
    defaultMessage: 'Ferdi cache is currently using {size} of disk space.',
  },
  cacheNotCleared: {
    id: 'settings.app.cacheNotCleared',
    defaultMessage: "Couldn't clear all cache",
  },
  buttonClearAllCache: {
    id: 'settings.app.buttonClearAllCache',
    defaultMessage: 'Clear cache',
  },
  subheadlineFerdiProfile: {
    id: 'settings.app.subheadlineFerdiProfile',
    defaultMessage: 'Ferdi Profile',
  },
  buttonOpenFerdiProfileFolder: {
    id: 'settings.app.buttonOpenFerdiProfileFolder',
    defaultMessage: 'Open Profile folder',
  },
  buttonOpenFerdiServiceRecipesFolder: {
    id: 'settings.app.buttonOpenFerdiServiceRecipesFolder',
    defaultMessage: 'Open Service Recipes folder',
  },
  buttonSearchForUpdate: {
    id: 'settings.app.buttonSearchForUpdate',
    defaultMessage: 'Check for updates',
  },
  buttonInstallUpdate: {
    id: 'settings.app.buttonInstallUpdate',
    defaultMessage: 'Restart & install update',
  },
  updateStatusSearching: {
    id: 'settings.app.updateStatusSearching',
    defaultMessage: 'Is searching for update',
  },
  updateStatusAvailable: {
    id: 'settings.app.updateStatusAvailable',
    defaultMessage: 'Update available, downloading...',
  },
  updateStatusUpToDate: {
    id: 'settings.app.updateStatusUpToDate',
    defaultMessage: 'You are using the latest version of Ferdi',
  },
  currentVersion: {
    id: 'settings.app.currentVersion',
    defaultMessage: 'Current version:',
  },
  appRestartRequired: {
    id: 'settings.app.restartRequired',
    defaultMessage: 'Changes require restart',
  },
  languageDisclaimer: {
    id: 'settings.app.languageDisclaimer',
    defaultMessage:
      'Official translations are English & German. All other languages are community based translations.',
  },
});

const Hr = () => <hr style={{ marginBottom: 20 }} />;

@observer
class EditSettingsForm extends Component {
  static propTypes = {
    checkForUpdates: PropTypes.func.isRequired,
    installUpdate: PropTypes.func.isRequired,
    form: PropTypes.instanceOf(Form).isRequired,
    onSubmit: PropTypes.func.isRequired,
    isCheckingForUpdates: PropTypes.bool.isRequired,
    isUpdateAvailable: PropTypes.bool.isRequired,
    noUpdateAvailable: PropTypes.bool.isRequired,
    updateIsReadyToInstall: PropTypes.bool.isRequired,
    isClearingAllCache: PropTypes.bool.isRequired,
    onClearAllCache: PropTypes.func.isRequired,
    getCacheSize: PropTypes.func.isRequired,
    isTodosActivated: PropTypes.bool.isRequired,
    automaticUpdates: PropTypes.bool.isRequired,
    isDarkmodeEnabled: PropTypes.bool.isRequired,
    isAdaptableDarkModeEnabled: PropTypes.bool.isRequired,
    isNightlyEnabled: PropTypes.bool.isRequired,
    hasAddedTodosAsService: PropTypes.bool.isRequired,
    isOnline: PropTypes.bool.isRequired,
  };

  state = {
    activeSetttingsTab: 'general',
    clearCacheButtonClicked: false,
  };

  setActiveSettingsTab(tab) {
    this.setState({
      activeSetttingsTab: tab,
    });
  }

  onClearCacheClicked = () => {
    this.setState({ clearCacheButtonClicked: true });
  };

  submit(e) {
    e.preventDefault();
    this.props.form.submit({
      onSuccess: form => {
        const values = form.values();
        this.props.onSubmit(values);
      },
      onError: () => {},
    });
  }

  render() {
    const {
      checkForUpdates,
      installUpdate,
      form,
      isCheckingForUpdates,
      isAdaptableDarkModeEnabled,
      isUpdateAvailable,
      noUpdateAvailable,
      updateIsReadyToInstall,
      isClearingAllCache,
      onClearAllCache,
      getCacheSize,
      automaticUpdates,
      isDarkmodeEnabled,
      isTodosActivated,
      isNightlyEnabled,
      hasAddedTodosAsService,
      isOnline,
    } = this.props;
    const { intl } = this.props;

    let updateButtonLabelMessage = messages.buttonSearchForUpdate;
    if (isCheckingForUpdates) {
      updateButtonLabelMessage = messages.updateStatusSearching;
    } else if (isUpdateAvailable) {
      updateButtonLabelMessage = messages.updateStatusAvailable;
    } else {
      updateButtonLabelMessage = messages.buttonSearchForUpdate;
    }

    const { lockingFeatureEnabled, scheduledDNDEnabled } =
      window['ferdi'].stores.settings.all.app;

    let cacheSize;
    let notCleared;
    if (this.state.activeSetttingsTab === 'advanced') {
      const cacheSizeBytes = getCacheSize();
      debug('cacheSizeBytes:', cacheSizeBytes);
      if (typeof cacheSizeBytes === 'number') {
        cacheSize = prettyBytes(cacheSizeBytes);
        debug('cacheSize:', cacheSize);
        notCleared =
          this.state.clearCacheButtonClicked &&
          isClearingAllCache === false &&
          cacheSizeBytes !== 0;
      } else {
        cacheSize = '…';
        notCleared = false;
      }
    }

    const profileFolder = userDataPath();
    const recipeFolder = userDataRecipesPath();

    return (
      <div className="settings__main">
        <div className="settings__header">
          <h1>{intl.formatMessage(globalMessages.settings)}</h1>
        </div>
        <div className="settings__body">
          <form
            onSubmit={e => this.submit(e)}
            onChange={e => this.submit(e)}
            id="form"
          >
            {/* Titles */}
            <div className="recipes__navigation">
              <h2
                id="general"
                className={
                  this.state.activeSetttingsTab === 'general'
                    ? 'badge badge--primary'
                    : 'badge'
                }
                onClick={() => {
                  this.setActiveSettingsTab('general');
                }}
              >
                {intl.formatMessage(messages.headlineGeneral)}
              </h2>
              <h2
                id="appearance"
                className={
                  this.state.activeSetttingsTab === 'appearance'
                    ? 'badge badge--primary'
                    : 'badge'
                }
                onClick={() => {
                  this.setActiveSettingsTab('appearance');
                }}
              >
                {intl.formatMessage(messages.headlineAppearance)}
              </h2>
              <h2
                id="privacy"
                className={
                  this.state.activeSetttingsTab === 'privacy'
                    ? 'badge badge--primary'
                    : 'badge'
                }
                onClick={() => {
                  this.setActiveSettingsTab('privacy');
                }}
              >
                {intl.formatMessage(messages.headlinePrivacy)}
              </h2>
              <h2
                id="language"
                className={
                  this.state.activeSetttingsTab === 'language'
                    ? 'badge badge--primary'
                    : 'badge'
                }
                onClick={() => {
                  this.setActiveSettingsTab('language');
                }}
              >
                {intl.formatMessage(messages.headlineLanguage)}
              </h2>
              <h2
                id="advanced"
                className={
                  this.state.activeSetttingsTab === 'advanced'
                    ? 'badge badge--primary'
                    : 'badge'
                }
                onClick={() => {
                  this.setActiveSettingsTab('advanced');
                }}
              >
                {intl.formatMessage(messages.headlineAdvanced)}
              </h2>
              <h2
                id="updates"
                className={
                  this.state.activeSetttingsTab === 'updates'
                    ? 'badge badge--primary'
                    : 'badge'
                }
                onClick={() => {
                  this.setActiveSettingsTab('updates');
                }}
              >
                {intl.formatMessage(messages.headlineUpdates)}
              </h2>
            </div>

            {/* General */}
            {this.state.activeSetttingsTab === 'general' && (
              <div>
                <Toggle field={form.$('autoLaunchOnStart')} />
                <Toggle field={form.$('runInBackground')} />
                <Toggle field={form.$('confirmOnQuit')} />
                <Toggle field={form.$('enableSystemTray')} />
                <Toggle field={form.$('reloadAfterResume')} />
                <Toggle field={form.$('startMinimized')} />
                {isWindows && <Toggle field={form.$('minimizeToSystemTray')} />}
                {isWindows && <Toggle field={form.$('closeToSystemTray')} />}
                <Select field={form.$('navigationBarBehaviour')} />

                <Hr />

                <Select field={form.$('hibernationStrategy')} />
                <Toggle field={form.$('hibernateOnStartup')} />
                <p
                  className="settings__message"
                  style={{
                    borderTop: 0,
                    marginTop: 0,
                    paddingTop: 0,
                    marginBottom: '2rem',
                  }}
                >
                  <span>{intl.formatMessage(messages.hibernateInfo)}</span>
                </p>

                <Select field={form.$('wakeUpStrategy')} />

                <Hr />

                <>
                  <Toggle field={form.$('keepAllWorkspacesLoaded')} />
                  <Hr />
                </>

                {!hasAddedTodosAsService && (
                  <>
                    <Toggle field={form.$('enableTodos')} />
                    {isTodosActivated && (
                      <div>
                        <Select field={form.$('predefinedTodoServer')} />
                        {form.$('predefinedTodoServer').value ===
                          'isUsingCustomTodoService' && (
                          <div>
                            <Input
                              placeholder="Todo Server"
                              onChange={e => this.submit(e)}
                              field={form.$('customTodoServer')}
                            />
                            <p
                              className="settings__message"
                              style={{
                                borderTop: 0,
                                marginTop: 0,
                                paddingTop: 0,
                                marginBottom: '2rem',
                              }}
                            >
                              {intl.formatMessage(messages.todoServerInfo)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <Hr />
                  </>
                )}

                <Toggle field={form.$('scheduledDNDEnabled')} />
                {scheduledDNDEnabled && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          padding: '0 1rem',
                          width: '100%',
                        }}
                      >
                        <Input
                          placeholder="17:00"
                          onChange={e => this.submit(e)}
                          field={form.$('scheduledDNDStart')}
                          type="time"
                        />
                      </div>
                      <div
                        style={{
                          padding: '0 1rem',
                          width: '100%',
                        }}
                      >
                        <Input
                          placeholder="09:00"
                          onChange={e => this.submit(e)}
                          field={form.$('scheduledDNDEnd')}
                          type="time"
                        />
                      </div>
                    </div>
                    <p>{intl.formatMessage(messages.scheduledDNDTimeInfo)}</p>
                  </>
                )}
                <p
                  className="settings__message"
                  style={{
                    borderTop: 0,
                    marginTop: 0,
                    paddingTop: 0,
                    marginBottom: '2rem',
                  }}
                >
                  <span>{intl.formatMessage(messages.scheduledDNDInfo)}</span>
                </p>
              </div>
            )}

            {/* Appearance */}
            {this.state.activeSetttingsTab === 'appearance' && (
              <div>
                <Toggle field={form.$('showDisabledServices')} />
                <Toggle field={form.$('showServiceName')} />
                <Toggle field={form.$('showMessageBadgeWhenMuted')} />

                {isMac && <Toggle field={form.$('showDragArea')} />}

                <Hr />

                <Toggle field={form.$('adaptableDarkMode')} />
                {!isAdaptableDarkModeEnabled && (
                  <Toggle field={form.$('darkMode')} />
                )}
                {(isDarkmodeEnabled || isAdaptableDarkModeEnabled) && (
                  <>
                    <Toggle field={form.$('universalDarkMode')} />
                    <p
                      className="settings__message"
                      style={{
                        borderTop: 0,
                        marginTop: 0,
                        paddingTop: 0,
                        marginBottom: '2rem',
                      }}
                    >
                      <span>
                        {intl.formatMessage(messages.universalDarkModeInfo)}
                      </span>
                    </p>
                  </>
                )}

                <Hr />

                <Toggle field={form.$('splitMode')} />

                <Hr />

                <Select field={form.$('serviceRibbonWidth')} />

                <Toggle field={form.$('useVerticalStyle')} />

                <Toggle field={form.$('alwaysShowWorkspaces')} />

                <Hr />
                <Select field={form.$('iconSize')} />
                <Toggle field={form.$('enableLongPressServiceHint')} />

                <Hr />

                <Input
                  placeholder="Accent Color"
                  onChange={e => this.submit(e)}
                  field={form.$('accentColor')}
                />
                <p>
                  {intl.formatMessage(messages.accentColorInfo, {
                    defaultAccentColor: DEFAULT_APP_SETTINGS.accentColor,
                  })}
                </p>
              </div>
            )}

            {/* Privacy */}
            {this.state.activeSetttingsTab === 'privacy' && (
              <div>
                <Toggle field={form.$('privateNotifications')} />
                <Toggle field={form.$('clipboardNotifications')} />
                {(isWindows || isMac) && (
                  <Toggle field={form.$('notifyTaskBarOnMessage')} />
                )}

                <Hr />

                <Select field={form.$('searchEngine')} />

                <Hr />

                <Toggle field={form.$('sentry')} />
                <p className="settings__help">
                  {intl.formatMessage(messages.sentryInfo)}
                </p>
                <p className="settings__help">
                  {intl.formatMessage(messages.appRestartRequired)}
                </p>

                <Hr />

                <Toggle field={form.$('lockingFeatureEnabled')} />
                {lockingFeatureEnabled && (
                  <>
                    {isMac && systemPreferences.canPromptTouchID() && (
                      <Toggle field={form.$('useTouchIdToUnlock')} />
                    )}

                    <Input
                      placeholder={intl.formatMessage(messages.lockedPassword)}
                      onChange={e => this.submit(e)}
                      field={form.$('lockedPassword')}
                      type="password"
                      scorePassword
                      showPasswordToggle
                    />
                    <p>{intl.formatMessage(messages.lockedPasswordInfo)}</p>

                    <Input
                      placeholder="Lock after inactivity"
                      onChange={e => this.submit(e)}
                      field={form.$('inactivityLock')}
                      autoFocus
                    />
                    <p>{intl.formatMessage(messages.inactivityLockInfo)}</p>
                  </>
                )}
                <p
                  className="settings__message"
                  style={{
                    borderTop: 0,
                    marginTop: 0,
                    paddingTop: 0,
                    marginBottom: '2rem',
                  }}
                >
                  <span>
                    {intl.formatMessage(messages.lockInfo, {
                      lockShortcut: `${lockFerdiShortcutKey(false)}`,
                    })}
                  </span>
                </p>
              </div>
            )}

            {/* Language */}
            {this.state.activeSetttingsTab === 'language' && (
              <div>
                <Select field={form.$('locale')} showLabel={false} />

                <Hr />

                <Toggle field={form.$('enableSpellchecking')} />
                {!isMac && form.$('enableSpellchecking').value && (
                  <Select field={form.$('spellcheckerLanguage')} />
                )}
                {isMac && form.$('enableSpellchecking').value && (
                  <p className="settings__help">
                    {intl.formatMessage(messages.spellCheckerLanguageInfo)}
                  </p>
                )}
                <p className="settings__help">
                  {intl.formatMessage(messages.appRestartRequired)}
                </p>

                <Hr />

                <a
                  href={FRANZ_TRANSLATION}
                  target="_blank"
                  className="link"
                  rel="noreferrer"
                >
                  {intl.formatMessage(messages.translationHelp)}{' '}
                  <Icon icon={mdiOpenInNew} />
                </a>
              </div>
            )}

            {/* Advanced */}
            {this.state.activeSetttingsTab === 'advanced' && (
              <div>
                <Toggle field={form.$('enableGPUAcceleration')} />
                <Toggle field={form.$('enableGlobalHideShortcut')} />
                <p className="settings__help indented__help">
                  {intl.formatMessage(messages.appRestartRequired)}
                </p>

                <Hr />

                <Input
                  placeholder="User Agent"
                  onChange={e => this.submit(e)}
                  field={form.$('userAgentPref')}
                />
                <p className="settings__help">
                  {intl.formatMessage(globalMessages.userAgentHelp)}
                </p>
                <p className="settings__help">
                  {intl.formatMessage(messages.appRestartRequired)}
                </p>

                <Hr />

                <div className="settings__settings-group">
                  <h3>{intl.formatMessage(messages.subheadlineCache)}</h3>
                  <p>
                    {intl.formatMessage(messages.cacheInfo, {
                      size: cacheSize,
                    })}
                  </p>
                  {notCleared && (
                    <p>{intl.formatMessage(messages.cacheNotCleared)}</p>
                  )}
                  <p>
                    <Button
                      buttonType="secondary"
                      label={intl.formatMessage(messages.buttonClearAllCache)}
                      onClick={() => {
                        onClearAllCache();
                        this.onClearCacheClicked();
                      }}
                      disabled={isClearingAllCache}
                      loaded={!isClearingAllCache}
                    />
                  </p>
                </div>

                <Hr />

                <div className="settings__settings-group">
                  <h3>
                    {intl.formatMessage(messages.subheadlineFerdiProfile)}
                  </h3>
                  <p>
                    <div className="settings__open-settings-file-container">
                      <Button
                        buttonType="secondary"
                        label={intl.formatMessage(
                          messages.buttonOpenFerdiProfileFolder,
                        )}
                        className="settings__open-settings-file-button"
                        onClick={() => openPath(profileFolder)}
                      />
                      <Button
                        buttonType="secondary"
                        label={intl.formatMessage(
                          messages.buttonOpenFerdiServiceRecipesFolder,
                        )}
                        className="settings__open-settings-file-button"
                        onClick={() => openPath(recipeFolder)}
                      />
                    </div>
                  </p>
                </div>
              </div>
            )}

            {/* Updates */}
            {this.state.activeSetttingsTab === 'updates' && (
              <div>
                <Toggle field={form.$('automaticUpdates')} />
                {automaticUpdates && (
                  <div>
                    <Toggle field={form.$('beta')} />
                    <ToggleRaw
                      field={{
                        value: isNightlyEnabled,
                        id: 'nightly',
                        label: 'Include nightly versions',
                        name: 'Nightly builds',
                      }}
                      onChange={
                        window['ferdi'].features.nightlyBuilds.toggleFeature
                      }
                    />
                    {updateIsReadyToInstall ? (
                      <Button
                        label={intl.formatMessage(messages.buttonInstallUpdate)}
                        onClick={installUpdate}
                      />
                    ) : (
                      <Button
                        buttonType="secondary"
                        label={intl.formatMessage(updateButtonLabelMessage)}
                        onClick={checkForUpdates}
                        disabled={
                          !automaticUpdates ||
                          isCheckingForUpdates ||
                          isUpdateAvailable ||
                          !isOnline
                        }
                        loaded={!isCheckingForUpdates || !isUpdateAvailable}
                      />
                    )}
                    <br />
                  </div>
                )}
                {intl.formatMessage(messages.currentVersion)} {ferdiVersion}
                {noUpdateAvailable && (
                  <>
                    <br />
                    <br />
                    {intl.formatMessage(messages.updateStatusUpToDate)}
                  </>
                )}
                <p className="settings__message">
                  <Icon icon={mdiGithub} />
                  <span>
                    Ferdi is based on{' '}
                    <a
                      href={`${GITHUB_FRANZ_URL}/franz`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Franz
                    </a>
                    , a project published under the{' '}
                    <a
                      href={`${GITHUB_FRANZ_URL}/franz/blob/master/LICENSE`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apache-2.0 License
                    </a>
                  </span>
                  <br />
                  <Icon icon={mdiInformation} />
                  {intl.formatMessage(messages.languageDisclaimer)}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }
}

export default injectIntl(EditSettingsForm);
