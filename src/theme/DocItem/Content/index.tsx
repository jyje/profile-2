import OriginalContent from '@theme-original/DocItem/Content';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import type {Props} from '@theme/DocItem/Content';
import ContentConnections from '@site/src/components/ContentConnections';

export default function DocContent(props: Props) {
  const {metadata} = useDoc();
  return <><OriginalContent {...props} /><ContentConnections permalink={metadata.permalink} /></>;
}
