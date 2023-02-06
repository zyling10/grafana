import { isNumber } from 'lodash';

import {
  DataFrame,
  ReducerID,
  FieldDisplay,
  NumericRange,
  FieldType,
  getFieldDisplayValues,
  InterpolateFunction,
  FieldConfigSource,
} from '@grafana/data';
import { findNumericFieldMinMax } from '@grafana/data/src/field/fieldOverrides';
import { config } from '@grafana/runtime';
import {
  BigValueColorMode,
  BigValueGraphMode,
  BigValueJustifyMode,
  BigValueTextMode,
  VizOrientation,
} from '@grafana/schema';

import { PanelOptions as StatPanelOptions } from '../stat/panelcfg.gen';

export interface StatsInfo {
  fields: FieldDisplay[];
  options: StatPanelOptions;
  width: number;
}

export function getStatInfo(
  data: DataFrame[] | null,
  fieldConfig: FieldConfigSource,
  replaceVariables: InterpolateFunction,
  timeZone: string,
  width: number
): StatsInfo | undefined {
  if (!data?.length) {
    return undefined;
  }

  let statwidth = width * 0.2;
  if (statwidth < 100) {
    statwidth = 100;
  }
  if (width - statwidth < 150) {
    return undefined; // too small
  }

  let globalRange: NumericRange | undefined = undefined;

  for (let frame of data) {
    for (let field of frame.fields) {
      let { config } = field;
      // mostly copied from fieldOverrides, since they are skipped during streaming
      // Set the Min/Max value automatically
      if (field.type === FieldType.number) {
        if (field.state?.range) {
          continue;
        }
        if (!globalRange && (!isNumber(config.min) || !isNumber(config.max))) {
          globalRange = findNumericFieldMinMax(data);
        }
        const min = config.min ?? globalRange!.min;
        const max = config.max ?? globalRange!.max;
        field.state = field.state ?? {};
        field.state.range = { min, max, delta: max! - min! };
      }
    }
  }

  return {
    width: statwidth,
    fields: getFieldDisplayValues({
      fieldConfig,
      reduceOptions: {
        calcs: [ReducerID.lastNotNull],
      },
      replaceVariables,
      theme: config.theme2,
      data: data,
      sparkline: false,
      timeZone,
    }),
    options: {
      colorMode: BigValueColorMode.Background,
      graphMode: BigValueGraphMode.None,
      justifyMode: BigValueJustifyMode.Auto,
      reduceOptions: {
        calcs: [ReducerID.lastNotNull],
      },
      textMode: BigValueTextMode.Auto,
      orientation: VizOrientation.Vertical,
    },
  };
}
