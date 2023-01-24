import { css } from '@emotion/css';
import React from 'react';
import { UseFormRegister } from 'react-hook-form';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors/src';
import {
  Button,
  ButtonGroup,
  Field,
  Form,
  Icon,
  Input,
  Label,
  Spinner,
  Switch,
  useStyles2,
  VerticalGroup,
} from '@grafana/ui/src';
import { Layout } from '@grafana/ui/src/components/Layout/Layout';

import { useSelector } from '../../../../../types';
import { useAddSharingRecipientMutation, useGetPublicDashboardQuery } from '../../../api/publicDashboardApi';
import { useIsDesktop } from '../../../utils/screen';

import { SharePublicDashboardInputs } from './SharePublicDashboard';

interface FormData {
  email: string;
}

const validEmailRegex = /^[A-Z\d._%+-]+@[A-Z\d.-]+\.[A-Z]{2,}$/i;
const selectors = e2eSelectors.pages.ShareDashboardModal.PublicDashboard;

export const EmailSharingConfiguration = ({
  register,
  isEnabled,
}: {
  register: UseFormRegister<SharePublicDashboardInputs>;
  isEnabled: boolean;
}) => {
  const dashboardState = useSelector((store) => store.dashboard);
  const { data: publicDashboard } = useGetPublicDashboardQuery(dashboardState.getModel()!.uid);
  const [addRecipient, { isLoading }] = useAddSharingRecipientMutation();

  const isDesktop = useIsDesktop();
  const styles = useStyles2(getStyles);

  const handleSubmit = (data: FormData) => {
    addRecipient({
      recipient: data.email,
      dashboardUid: dashboardState.getModel()!.uid,
      publicDashboardUid: publicDashboard!.uid,
    });
  };

  return (
    <VerticalGroup spacing="md">
      <Layout orientation={isDesktop ? 0 : 1} spacing="xs" justify="space-between">
        <Label description="Invite people by email">Make public for only specified people</Label>
        <Switch {...register('isEmailSharingEnabled')} data-testid={selectors.EnableEmailSharingSwitch} />
      </Layout>
      {isEnabled && (
        <VerticalGroup spacing="sm">
          <VerticalGroup spacing="sm">
            <Form
              className={css`
                display: flex;
                gap: 10px;
                align-items: center;
                flex-grow: 1;
              `}
              onSubmit={handleSubmit}
              validateOn="onChange"
            >
              {({ register, errors, formState: { isSubmitSuccessful } }) => (
                <>
                  <Field
                    className={css`
                      flex-grow: 1;
                    `}
                    label="Email"
                    error={errors?.email?.message}
                    invalid={!!errors.email}
                  >
                    <Input
                      // data-testid="requestAccessEmail"
                      placeholder="email"
                      autoCapitalize="none"
                      {...register('email', {
                        required: 'Email is required',
                        pattern: { value: validEmailRegex, message: 'Invalid email' },
                      })}
                    />
                  </Field>
                  <Button type="submit" variant="primary">
                    Invite
                  </Button>
                </>
              )}
            </Form>
            <Label>Invite people or groups (e.g. *@example.com) by email</Label>
          </VerticalGroup>
          <table className="filter-table">
            <thead>
              <tr>
                <th className={styles.emailTh}>
                  <span>Email</span>
                </th>
                {isLoading && (
                  <th>
                    <Spinner
                      className={css`
                        display: flex;
                        justify-content: end;
                        margin-right: 15px;
                      `}
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {publicDashboard?.share.recipients?.map((recipient) => (
                <tr key={recipient.uid}>
                  <td>{recipient.recipient}</td>
                  <td>
                    <ButtonGroup
                      className={css`
                        display: flex;
                        justify-content: end;
                      `}
                    >
                      <Button
                        type="button"
                        variant="primary"
                        fill="text"
                        aria-label="Resend"
                        title="Resend"
                        onClick={() => {}}
                      >
                        <Icon name="repeat" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        fill="text"
                        aria-label="Resend"
                        title="Resend"
                        onClick={() => {}}
                      >
                        <Icon name="trash-alt" />
                      </Button>
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </VerticalGroup>
      )}
    </VerticalGroup>
  );
};

function getStyles() {
  return {
    emailTh: css`
      display: flex;
      justify-content: space-between;
    `,
  };
}
