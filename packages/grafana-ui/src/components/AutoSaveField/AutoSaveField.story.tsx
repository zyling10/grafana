import { useArgs } from '@storybook/client-api';
import { Story, Meta } from '@storybook/react';
import React, { useState } from 'react';

import { withCenteredStory } from '../../utils/storybook/withCenteredStory';
import { WeekStartPicker } from '../DateTimePickers/WeekStartPicker';
import { Checkbox } from '../Forms/Checkbox';
import { RadioButtonGroup } from '../Forms/RadioButtonGroup/RadioButtonGroup';
import { Input } from '../Input/Input';

import { AutoSaveField } from './AutoSaveField';
import mdx from './AutoSaveField.mdx';

const meta: Meta = {
  title: 'AutoSaveField',
  component: AutoSaveField,
  decorators: [withCenteredStory],
  parameters: {
    docs: {
      page: mdx,
    },
    controls: {
      exclude: [
        'prefix',
        'width',
        'loading',
        'suffix',
        'addonBefore',
        'addonAfter',
        'onFinishChange',
        'invalid',
        'weekPickerValue',
      ],
    },
  },
  argTypes: {
    saveErrorMessage: { control: 'text' },
    label: { control: 'text' },
    required: {
      control: { type: 'select', options: [true, false] },
    },
  },
  args: {
    saveErrorMessage: 'This is a custom error message',
    label: 'Custom label',
    required: false,
    themeOptions: '',
  },
};

export default meta;

const getSuccess = () => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 1000);
  });
};
const getError = () => {
  return new Promise<void>((resolve, reject) => {
    reject();
  });
};

export const AutoSaveFieldError: Story = (args) => {
  const themeOptions = [
    { value: '', label: 'Default' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ];
  const [selected, setSelected] = useState('');
  const [autoFit, setAutofit] = useState(false);

  return (
    <div>
      <AutoSaveField onFinishChange={getError} {...args}>
        {(onChange) => <Input onChange={(e) => onChange(e.currentTarget.value)} />}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getError} label={'WeekStartPicker as child'}>
        {(onChange) => (
          <WeekStartPicker
            value={args.weekPickerValue}
            onChange={(weekPickerValue) => {
              onChange(weekPickerValue);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getError} label={'UI Theme'}>
        {(onChange) => (
          <RadioButtonGroup
            options={themeOptions}
            value={selected}
            onChange={(themeOption) => {
              setSelected(themeOption);
              onChange(themeOption);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label={'Checkbox'}>
        {(onChange) => (
          <Checkbox
            label="Autofit"
            description="Panel heights will be adjusted to fit screen size"
            name="autofix"
            value={autoFit}
            onChange={(e) => {
              const value = e.currentTarget.checked.toString();
              onChange(value);
              setAutofit(e.currentTarget.checked);
            }}
          />
        )}
      </AutoSaveField>
    </div>
  );
};
AutoSaveFieldError.args = {
  label: 'With error',
  required: false,
};

export const AutoSaveFieldSuccess: Story = (args) => {
  const themeOptions = [
    { value: '', label: 'Default' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ];
  const [autoFit, setAutofit] = useState(false);

  return (
    <div>
      <AutoSaveField onFinishChange={getSuccess} {...args}>
        {(onChange) => <Input onChange={(e) => onChange(e.currentTarget.value)} />}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label="WeekStartPicker as child">
        {(onChange) => (
          <WeekStartPicker
            value={args.weekPickerValue}
            onChange={(newValue) => {
              onChange(newValue);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label={'UI Theme'}>
        {(onChange) => (
          <RadioButtonGroup
            options={themeOptions}
            value={args.themeOptions}
            onChange={(newTheme) => {
              onChange(newTheme);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label={'Checkbox'}>
        {(onChange) => (
          <Checkbox
            label="Autofit"
            description="Panel heights will be adjusted to fit screen size"
            name="autofix"
            value={autoFit}
            onChange={(e) => {
              const value = e.currentTarget.checked.toString();
              onChange(value);
              setAutofit(e.currentTarget.checked);
            }}
          />
        )}
      </AutoSaveField>
    </div>
  );
};
AutoSaveFieldSuccess.args = {
  label: 'With success',
  required: true,
};
