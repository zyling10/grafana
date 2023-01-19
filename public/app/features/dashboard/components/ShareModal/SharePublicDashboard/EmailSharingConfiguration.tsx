import { css } from '@emotion/css';
import React from 'react';
import { UseFormRegister } from 'react-hook-form';

import { selectors as e2eSelectors } from '@grafana/e2e-selectors/src';
import { Button, ButtonGroup, Icon, Input, Label, Spinner, Switch, useStyles2, VerticalGroup } from '@grafana/ui/src';
import { Layout } from '@grafana/ui/src/components/Layout/Layout';

import { useIsDesktop } from '../../../utils/screen';

import { SharePublicDashboardInputs } from './SharePublicDashboard';

export const EmailSharingConfiguration = ({
  register,
  isEnabled,
}: {
  register: UseFormRegister<SharePublicDashboardInputs>;
  isEnabled: boolean;
}) => {
  const selectors = e2eSelectors.pages.ShareDashboardModal.PublicDashboard;

  const isDesktop = useIsDesktop();
  const styles = useStyles2(getStyles);

  return (
    <VerticalGroup spacing="md">
      <Layout orientation={isDesktop ? 0 : 1} spacing="xs" justify="space-between">
        <Label description="Invite people by email">Make public for only specified people</Label>
        <Switch {...register('isEmailSharingEnabled')} data-testid={selectors.EnableEmailSharingSwitch} />
      </Layout>
      {isEnabled && (
        <VerticalGroup spacing="sm">
          <VerticalGroup spacing="sm">
            <div
              className={css`
                display: flex;
                flex-grow: 1;
                gap: 10px;
              `}
            >
              <Input />
              <Button variant="primary">Invite</Button>
            </div>
            <Label>Invite people or groups (e.g. *@example.com) by email</Label>
          </VerticalGroup>
          <table className="filter-table">
            <thead>
              <tr>
                <th className={styles.emailTh}>
                  <span>Email</span>
                </th>
                <th>
                  <Spinner
                    className={css`
                      display: flex;
                      justify-content: end;
                      margin-right: 15px;
                    `}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {['juanicabanas58@gmail.com', 'juani_cabanas@hotmail.com']?.map((email) => (
                <tr key={email}>
                  <td>{email}</td>
                  <td>
                    <ButtonGroup
                      className={css`
                        display: flex;
                        justify-content: end;
                      `}
                    >
                      <Button variant="primary" fill="text" aria-label="Resend" title="Resend" onClick={() => {}}>
                        <Icon name="repeat" />
                      </Button>
                      <Button variant="destructive" fill="text" aria-label="Resend" title="Resend" onClick={() => {}}>
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
