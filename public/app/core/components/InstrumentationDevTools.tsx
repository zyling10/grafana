import React from 'react';

import { logInfo, logDebug, logWarning, logError } from '@grafana/runtime';
import { Button, PanelContainer } from '@grafana/ui';

export function InstrumentationDevTools() {
  return (
    <>
      <PanelContainer style={{ marginTop: 15, padding: 15 }}>
        <h3>Console Instrumentation</h3>
        <Button data-cy="btn-log-info" onClick={() => logInfo('This is a console Info message')}>
          Info
        </Button>{' '}
        <Button data-cy="btn-log-log" onClick={() => logDebug('This is a console Debug message')}>
          Debug
        </Button>{' '}
        <Button data-cy="btn-log-warn" onClick={() => logWarning('This is a console Warning message')}>
          Warn
        </Button>{' '}
        <Button data-cy="btn-log-error" onClick={() => logError(new Error('This is a console Error message'))}>
          Error
        </Button>
      </PanelContainer>
    </>
  );
}
