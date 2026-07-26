import {
  Button,
  Icon,
  Icons,
  Indicator,
  Flex,
  FlexRestricter,
  Pad,
  Text,
  TextBlock,
  Title,
} from '@cfx-dev/ui-components';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useLegalService } from 'cfx/apps/mpMenu/services/legal/legal.service';
import { CurrentGameBrand } from 'cfx/base/gameRuntime';

import { mpMenu } from '../../mpMenu';

import s from './LegalAccepter.module.scss';

const PDFRenderer = React.lazy(async () => ({
  default: (await import('./PDFRenderer')).PDFRenderer,
}));

function PDFRendererFallback() {
  return (
    <Flex fullWidth fullHeight centered vertical>
      <Text>Loading the document</Text>

      <Indicator />
    </Flex>
  );
}

export const LegalAccepter = observer(function TOSAccepter() {
  const legalService = useLegalService();

  React.useEffect(() => {
    legalService.accept();
  }, [legalService]);

  return null;
});
