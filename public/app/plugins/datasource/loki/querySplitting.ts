import { partition } from 'lodash';
import { Subscriber, Observable, Subscription } from 'rxjs';

import { DataQueryRequest, DataQueryResponse, dateTime, TimeRange } from '@grafana/data';
import { LoadingState } from '@grafana/schema';

import { LokiDatasource } from './datasource';
import { getRangeChunks as getLogsRangeChunks } from './logsTimeSplit';
import { getRangeChunks as getMetricRangeChunks } from './metricTimeSplit';
import { combineResponses, isLogsQuery } from './queryUtils';
import { LokiQuery } from './types';

/**
 * Purposely exposing it to support doing tests without needing to update the repo.
 * TODO: remove.
 * Hardcoded to 1 day.
 */
(window as any).lokiChunkDuration = 24 * 60 * 60 * 1000;

export function partitionTimeRange(
  isLogsQuery: boolean,
  originalTimeRange: TimeRange,
  intervalMs: number,
  resolution: number
): TimeRange[] {
  // the `step` value that will be finally sent to Loki is rougly the same as `intervalMs`,
  // but there are some complications.
  // we need to replicate this algo:
  //
  // https://github.com/grafana/grafana/blob/main/pkg/tsdb/loki/step.go#L23

  const start = originalTimeRange.from.toDate().getTime();
  const end = originalTimeRange.to.toDate().getTime();

  const safeStep = Math.ceil((end - start) / 11000);
  const step = Math.max(intervalMs * resolution, safeStep);

  const duration: number = (window as any).lokiChunkDuration;

  const ranges = isLogsQuery
    ? getLogsRangeChunks(start, end, duration)
    : getMetricRangeChunks(start, end, step, duration);

  // if the split was not possible, go with the original range
  if (ranges == null) {
    return [originalTimeRange];
  }

  return ranges.map(([start, end]) => {
    const from = dateTime(start);
    const to = dateTime(end);
    return {
      from,
      to,
      raw: { from, to },
    };
  });
}

/**
 * Based in the state of the current response, if any, adjust target parameters such as `maxLines`.
 * For `maxLines`, we will update it as `maxLines - current amount of lines`.
 * At the end, we will filter the targets that don't need to be executed in the next request batch,
 * becasue, for example, the `maxLines` have been reached.
 */

function adjustTargetsFromResponseState(targets: LokiQuery[], response: DataQueryResponse | null): LokiQuery[] {
  if (!response) {
    return targets;
  }

  return targets
    .map((target) => {
      if (!target.maxLines || !isLogsQuery(target.expr)) {
        return target;
      }
      const targetFrame = response.data.find((frame) => frame.refId === target.refId);
      if (!targetFrame) {
        return target;
      }
      const updatedMaxLines = target.maxLines - targetFrame.length;
      return {
        ...target,
        maxLines: updatedMaxLines < 0 ? 0 : updatedMaxLines,
      };
    })
    .filter((target) => target.maxLines === undefined || target.maxLines > 0);
}

type LokiGroupedRequest = Array<{ request: DataQueryRequest<LokiQuery>; partition: TimeRange[] }>;

export function runGroupedQueries(datasource: LokiDatasource, requests: LokiGroupedRequest) {
  let mergedResponse: DataQueryResponse | null;
  const totalRequests = Math.max(...requests.map(({ partition }) => partition.length));

  let shouldStop = false;
  let subquerySubsciption: Subscription | null = null;
  const runNextRequest = (subscriber: Subscriber<DataQueryResponse>, requestN: number, requestGroup: number) => {
    if (shouldStop) {
      subscriber.complete();
      return;
    }

    const done = (response: DataQueryResponse) => {
      response.state = LoadingState.Done;
      subscriber.next(response);
      subscriber.complete();
    };

    const nextRequest = () => {
      mergedResponse = mergedResponse || { data: [] };
      const { nextRequestN, nextRequestGroup } = getNextRequestPointers(requests, requestGroup, requestN);
      if (nextRequestN > 0) {
        mergedResponse.state = LoadingState.Streaming;
        subscriber.next(mergedResponse);

        runNextRequest(subscriber, nextRequestN, nextRequestGroup);
        return;
      }
      done(mergedResponse);
    };

    const group = requests[requestGroup];
    const requestId = `${group.request.requestId}_${requestN}`;
    const range = group.partition[requestN - 1];
    const targets = adjustTargetsFromResponseState(group.request.targets, mergedResponse);

    if (!targets.length && mergedResponse) {
      nextRequest();
      return;
    }

    subquerySubsciption = datasource
      .runQuery({ ...requests[requestGroup].request, range, requestId, targets })
      .subscribe({
        next: (partialResponse) => {
          if (partialResponse.error) {
            subscriber.error(partialResponse.error);
          }
          mergedResponse = combineResponses(mergedResponse, partialResponse);
        },
        complete: () => {
          nextRequest();
        },
        error: (error) => {
          subscriber.error(error);
        },
      });
  };

  const response = new Observable<DataQueryResponse>((subscriber) => {
    runNextRequest(subscriber, totalRequests, 0);
    return () => {
      shouldStop = true;
      if (subquerySubsciption != null) {
        subquerySubsciption.unsubscribe();
      }
    };
  });

  return response;
}

function getNextRequestPointers(requests: LokiGroupedRequest, requestGroup: number, requestN: number) {
  // There's a pending request from the next group:
  if (requests[requestGroup + 1]?.partition[requestN - 1]) {
    return {
      nextRequestGroup: requestGroup + 1,
      nextRequestN: requestN,
    };
  }
  return {
    nextRequestGroup: 0,
    nextRequestN: requestN - 1,
  };
}

export function runPartitionedQueries(datasource: LokiDatasource, request: DataQueryRequest<LokiQuery>) {
  const queries = request.targets.filter((query) => !query.hide);
  const [logQueries, metricQueries] = partition(queries, (query) => isLogsQuery(query.expr));

  const requests = [];
  if (logQueries.length) {
    requests.push({
      request: { ...request, targets: logQueries },
      partition: partitionTimeRange(true, request.range, request.intervalMs, logQueries[0].resolution ?? 1),
    });
  }
  if (metricQueries.length) {
    requests.push({
      request: { ...request, targets: metricQueries },
      partition: partitionTimeRange(false, request.range, request.intervalMs, metricQueries[0].resolution ?? 1),
    });
  }
  return runGroupedQueries(datasource, requests);
}
