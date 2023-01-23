import { css } from '@emotion/css';
import React from 'react';

import {
  CoreApp,
  DataQuery,
  DataQueryResponse,
  DataSourceApi,
  GrafanaTheme2,
  hasSupplementaryQuerySupport,
  LoadingState,
  LogsDedupStrategy,
  SplitOpen,
  SupplementaryQueryType,
  TimeZone,
} from '@grafana/data';
import { reportInteraction } from '@grafana/runtime';
import { Button, Collapse, useStyles2 } from '@grafana/ui';
import { dataFrameToLogsModel } from 'app/core/logsModel';
import store from 'app/core/store';

import { LogRows } from '../logs/components/LogRows';

import { SupplementaryResultError } from './SupplementaryResultError';
import { SETTINGS_KEYS } from './utils/logs';

type Props = {
  data: DataQueryResponse | undefined;
  enabled: boolean;
  timeZone: TimeZone;
  queries: DataQuery[];
  datasourceInstance: DataSourceApi | null | undefined;
  splitOpen: SplitOpen;
  setLogsSampleEnabled: (enabled: boolean) => void;
};

export function LogsSamplePanel(props: Props) {
  const { data, timeZone, enabled, setLogsSampleEnabled, datasourceInstance, splitOpen, queries } = props;

  const styles = useStyles2(getStyles);
  const onToggleLogsSampleCollapse = (isOpen: boolean) => {
    setLogsSampleEnabled(isOpen);
    reportInteraction('grafana_explore_logs_sample_toggle_clicked', {
      datasourceType: datasourceInstance ? datasourceInstance?.type : 'unknown',
      type: isOpen ? 'open' : 'close',
    });
  };

  const OpenInSplitViewButton = () => {
    if (!hasSupplementaryQuerySupport(datasourceInstance, SupplementaryQueryType.LogsSample)) {
      return null;
    }

    const logSampleQueries = queries
      .map((query) => datasourceInstance.getSupplementaryQuery(SupplementaryQueryType.LogsSample, query))
      .filter((query): query is DataQuery => !!query);

    if (!logSampleQueries.length) {
      return null;
    }

    return (
      <Button
        size="sm"
        className={styles.logSamplesButton}
        // TODO: support multiple queries
        // This currently works only for the first query as splitOpen supports only 1 query
        onClick={() => splitOpen({ query: logSampleQueries[0], datasourceUid: datasourceInstance.uid })}
      >
        Open logs in split view
      </Button>
    );
  };

  let LogsSamplePanelContent: JSX.Element | null;

  if (data === undefined) {
    LogsSamplePanelContent = null;
  } else if (data?.error !== undefined) {
    LogsSamplePanelContent = (
      <SupplementaryResultError error={data.error} title="Failed to load log samples for this query" />
    );
  } else if (data?.state === LoadingState.Loading) {
    LogsSamplePanelContent = <span>Log samples are loading...</span>;
  } else if (data?.data.length === 0 || data?.data[0].length === 0) {
    LogsSamplePanelContent = <span>No logs sample data.</span>;
  } else {
    const logs = dataFrameToLogsModel(data.data, undefined);
    LogsSamplePanelContent = (
      <>
        <OpenInSplitViewButton />
        <LogRows
          logRows={logs.rows}
          dedupStrategy={LogsDedupStrategy.none}
          showLabels={store.getBool(SETTINGS_KEYS.showLabels, false)}
          showTime={store.getBool(SETTINGS_KEYS.showTime, true)}
          wrapLogMessage={store.getBool(SETTINGS_KEYS.wrapLogMessage, true)}
          prettifyLogMessage={store.getBool(SETTINGS_KEYS.prettifyLogMessage, false)}
          timeZone={timeZone}
          enableLogDetails={true}
          app={CoreApp.Explore}
        />
      </>
    );
  }

  return (
    <Collapse label="Logs sample" isOpen={enabled} collapsible={true} onToggle={onToggleLogsSampleCollapse}>
      {LogsSamplePanelContent}
    </Collapse>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  logSamplesButton: css`
    position: absolute;
    top: ${theme.spacing(1)};
    right: ${theme.spacing(1)}; ;
  `,
});
