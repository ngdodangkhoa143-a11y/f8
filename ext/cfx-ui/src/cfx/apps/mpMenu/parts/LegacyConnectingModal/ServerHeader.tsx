import {
  Box,
  Flex,
  Pad,
  ui,
} from '@cfx-dev/ui-components';
import { observer } from 'mobx-react-lite';

import { ServerIcon } from 'cfx/common/parts/Server/ServerIcon/ServerIcon';
import { ServerTitle } from 'cfx/common/parts/Server/ServerTitle/ServerTitle';
import { getServerLegalRatingImageURL } from 'cfx/common/services/servers/helpers';
import { IServerView } from 'cfx/common/services/servers/types';

import s from './ServerHeader.module.scss';

export interface ServerHeaderProps {
  server: IServerView;
}
export const ServerHeader = observer(function ServerHeader(props: ServerHeaderProps) {
  const {
    server,
  } = props;

  const ratingImageURL = getServerLegalRatingImageURL(server);

  return (
    <Flex vertical>
      <Box style={getStyle(server)}>
        <Pad top size="xlarge" />

        <Pad size="large">
          <Flex vertical gap="large">
            <Flex centered="axis">
              <ServerIcon type="details" size="small" server={server} />

              <Flex vertical>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 900,
                  background: 'linear-gradient(45deg, #00a8ff, #005f99)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
                  textAlign: 'center',
                  fontFamily: 'Montserrat, sans-serif'
                }}>
                  GTA5F8
                </div>
              </Flex>
            </Flex>
          </Flex>
        </Pad>
      </Box>

      {ratingImageURL && (
        <div className={s.rating}>
          <div className={s.left} />
          <img className={s.image} src={ratingImageURL} alt="Server Legal Rating" />
          <div className={s.right} />
        </div>
      )}
    </Flex>
  );
});

function getStyle(server: IServerView): React.CSSProperties {
  const clr = 'rgba(14, 20, 25, 0.25)';
  const clr2 = 'rgba(14, 20, 25, 0.4)';
  const clr3 = 'rgba(14, 20, 25, 0.6)';

  const images = [`linear-gradient(${clr}, ${clr2} 75%, ${clr3})`, `url(${server.bannerConnecting})`];

  return {
    backgroundImage: images.join(','),
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
  };
}
