import {useId, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import GraphCanvas from './GraphCanvas';
import {neighborhood, type Network} from './neighborhood';
import styles from './inline.module.css';

export default function InlineGraph({graph, currentId, ko}: {graph: Network; currentId: string; ko: boolean}) {
  const local = useMemo(() => neighborhood(graph, currentId), [graph, currentId]);
  const [selectedId, setSelectedId] = useState(currentId);
  const selected = local.nodes.find(node => node.id === selectedId);
  const matches = useMemo(() => new Set<string>(), []);
  const selectId = useId();
  return <section className={styles.section} data-document-graph="local" aria-label={ko ? '이 문서의 그래프' : 'Graph of this document'}>
    <h2>{ko ? '문서 그래프' : 'Document graph'}</h2>
    <div className={styles.frame}>
      <GraphCanvas nodes={local.nodes} edges={local.edges} selectedId={selectedId}
        matchingIds={matches} searchActive={false} enableRadial={false} onSelect={setSelectedId}
        label={ko ? '이 문서의 연결 그래프' : 'Connections to this document'}
        zoomInLabel={ko ? '확대' : 'Zoom in'} zoomOutLabel={ko ? '축소' : 'Zoom out'}
        resetLabel={ko ? '초기화' : 'Reset view'}
        loadErrorLabel={ko ? '그래프를 불러오지 못했습니다. 아래 문서 목록은 계속 이용할 수 있습니다.' : 'The graph could not load. Document links below remain available.'}
        retryLabel={ko ? '다시 시도' : 'Retry'} compact />
    </div>
    <div className={styles.selection}>
      <label htmlFor={selectId}>{ko ? '노드 선택' : 'Select a node'}</label>
      <select id={selectId} value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        {local.nodes.map(node => <option value={node.id} key={node.id}>{node.title}</option>)}
      </select>
      {selected?.path && <Link to={selected.path}>{ko ? '선택한 문서 열기' : 'Open selected page'}</Link>}
    </div>
  </section>;
}
