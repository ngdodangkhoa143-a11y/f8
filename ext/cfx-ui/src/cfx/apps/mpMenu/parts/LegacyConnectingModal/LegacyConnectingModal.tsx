import {
  Indicator,
  Box,
  Flex,
  Pad,
  Modal,
} from '@cfx-dev/ui-components';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { $L } from 'cfx/common/services/intl/l10n';

import { AdaptiveCardPresenter } from './AdaptiveCardPresenter/AdaptiveCardPresenter';
import { BuildSwitchInfo } from './BuildSwitchInfo';
import { BuildSwitchRequest } from './BuildSwitchRequest';
import { ConnectFailed } from './ConnectFailed';
import { ConnectStatus } from './ConnectStatus';
import { ServerHeader } from './ServerHeader';
import { useMpMenuServersConnectService } from '../../services/servers/serversConnect.mpMenu';

export const LegacyConnectingModal = observer(function LegacyConnectingModal() {
  const service = useMpMenuServersConnectService();

  if (!service.showModal) {
    return null;
  }

  // HIDE MODAL ENTIRELY for connecting and status states so it can be handled by HomePage inline!
  if (service.resolvingServer) {
    return null;
  }
  if (service.state && (service.state.type === 'connecting' || service.state.type === 'status')) {
    return null;
  }

  let node: React.ReactNode;

  if (service.resolvingServer) {
    node = (
      <ResolvingServer />
    );
  } else if (service.state) {
    switch (service.state.type) {

      case 'failed': {
        node = (
          <ConnectFailed state={service.state} server={service.server!} onClose={service.cancel} />
        );
        break;
      }

      case 'card': {
        node = (
          <AdaptiveCardPresenter card={service.state.card} onCancel={service.cancel} />
        );
        break;
      }

      case 'buildSwitchRequest': {
        node = (
          <BuildSwitchRequest state={service.state} onCancel={service.cancel} />
        );
        break;
      }
      case 'buildSwitchInfo': {
        node = (
          <BuildSwitchInfo state={service.state} onCancel={service.cancel} />
        );
        break;
      }
    }
  }

  return (
    <Modal
      disableBackdropClose
      onClose={service.canCancel
        ? service.cancel
        : undefined}
    >
      <Box 
        width="calc(var(--width) / 2.5)"
        style={{
          background: 'rgba(20, 20, 20, 0.65)',
          backdropFilter: 'blur(15px)',
          WebkitBackdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px 0 20px 20px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {!!service.server && service.showServer && (
          <ServerHeader server={service.server} />
        )}

        {node}
      </Box>
    </Modal>
  );
});

function ResolvingServer() {
  return (
    <Pad size="xlarge">
      <Flex centered>
        <Indicator />

        {$L('#Servers_ConnectingToServer')}
      </Flex>
    </Pad>
  );
}
