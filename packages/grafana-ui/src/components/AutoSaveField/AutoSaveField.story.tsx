import { Story, Meta } from '@storybook/react';
import React, { useState } from 'react';

import { withCenteredStory } from '../../utils/storybook/withCenteredStory';
import { Checkbox } from '../Forms/Checkbox';
import { RadioButtonGroup } from '../Forms/RadioButtonGroup/RadioButtonGroup';
import { Input } from '../Input/Input';
import { Select } from '../Select/Select';
import { TextArea } from '../TextArea/TextArea';

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
const themeOptions = [
  { value: '', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export const AutoSaveFieldError: Story = (args) => {
  const [selected, setSelected] = useState('');
  const [checkBoxTest, setCheckBoxTest] = useState(false);
  const [textAreaValue, setTextAreaValue] = useState('');

  return (
    <div>
      <AutoSaveField onFinishChange={getError} {...args}>
        {(onChange) => <Input onChange={(e) => onChange(e.currentTarget.value)} />}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getError} label={'Select as child'} {...args}>
        {(onChange) => (
          <Select
            options={themeOptions}
            value={args.weekPickerValue}
            onChange={(v) => {
              onChange(v.value);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getError} label={'RadioButtonGroup as a child'} {...args}>
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
      <AutoSaveField onFinishChange={getError} label={'Checkbox as a child'} {...args}>
        {(onChange) => (
          <Checkbox
            label="Checkbox test"
            description="This should trigger an error message"
            name="checkbox-test"
            value={checkBoxTest}
            onChange={(e) => {
              const value = e.currentTarget.checked.toString();
              onChange(value);
              setCheckBoxTest(e.currentTarget.checked);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getError} label={'TextArea as a child'} {...args}>
        {(onChange) => (
          <TextArea
            value={textAreaValue}
            onChange={(e) => {
              const value = e.currentTarget.value;
              onChange(value);
              setTextAreaValue(e.currentTarget.value);
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
  const [selected, setSelected] = useState('');
  const [checkBoxTest, setCheckBoxTest] = useState(false);
  const [textAreaValue, setTextAreaValue] = useState('');
  return (
    <div>
      <AutoSaveField onFinishChange={getSuccess} {...args}>
        {(onChange) => <Input onChange={(e) => onChange(e.currentTarget.value)} />}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label="Select as child">
        {(onChange) => (
          <Select
            options={themeOptions}
            value={args.weekPickerValue}
            onChange={(v) => {
              onChange(v.value);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label={'RadioButtonGroup as a child'}>
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
      <AutoSaveField onFinishChange={getSuccess} label={'Checkbox as a child'}>
        {(onChange) => (
          <Checkbox
            label="Checkbox test"
            description="This should show the 'Saved!' toast"
            name="checkbox-test"
            value={checkBoxTest}
            onChange={(e) => {
              const value = e.currentTarget.checked.toString();
              onChange(value);
              setCheckBoxTest(e.currentTarget.checked);
            }}
          />
        )}
      </AutoSaveField>
      <AutoSaveField onFinishChange={getSuccess} label={'TextArea as a child'}>
        {(onChange) => (
          <TextArea
            value={textAreaValue}
            onChange={(e) => {
              const value = e.currentTarget.value;
              onChange(value);
              setTextAreaValue(e.currentTarget.value);
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
