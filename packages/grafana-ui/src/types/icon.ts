import { availableIconsIndex, Field, FieldType, IconName } from '@grafana/data';

import { ComponentSize } from './size';

// Exported from here for backwards compatibility
export type { IconName } from '@grafana/data';
export { toIconName } from '@grafana/data';

export type IconType = 'mono' | 'default' | 'solid';
export type IconSize = ComponentSize | 'xl' | 'xxl' | 'xxxl';

// function remains for backwards compatibility
export const getAvailableIcons = () => Object.keys(availableIconsIndex);

/**
 * Get the icon for a given field type
 * @deprecated use `getIconForFieldType`
 */
export function getFieldTypeIcon(field?: Field): IconName {
  return getIconForFieldType(field?.type);
}

export function getIconForFieldType(type?: FieldType): IconName {
  if (type) {
    switch (type) {
      case FieldType.time:
        return 'clock';
      case FieldType.string:
        return 'font';
      case FieldType.number:
        return 'calculator-alt';
      case FieldType.boolean:
        return 'toggle-on';
      case FieldType.trace:
        return 'info-circle';
      case FieldType.enum:
        return 'list-ol';
      case FieldType.geo:
        return 'map-marker';
      case FieldType.timeOffset:
        return 'stopwatch';
      case FieldType.other:
        return 'brackets-curly';
    }
  }
  return 'question-circle';
}

/** Get the icon for a given field type */
export function getFieldTypeIconName(fieldType?: FieldType): IconName {
  switch (fieldType) {
    case FieldType.time:
      return 'clock-nine';
    case FieldType.string:
      return 'font';
    case FieldType.number:
      return 'calculator-alt';
    case FieldType.boolean:
      return 'toggle-on';
    case FieldType.trace:
      return 'info-circle';
    case FieldType.geo:
      return 'map-marker';
    case FieldType.other:
      return 'brackets-curly';
  }
  return 'question-circle';
}
