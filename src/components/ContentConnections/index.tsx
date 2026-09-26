import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './styles.module.css';

type Node = {id: string; title: string; path?: string; isTag?: boolean; tags?: string[]; kind?: string};
type Network = {nodes: Node[]; edges: {source: string; target: string; kind: string}[]};

export default function ContentConnections({permalink}: {permalink: string}): ReactNode {
  const data = usePluginData('docusaurus-plugin-document-graph') as Network;
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const ko = currentLocale === 'ko';
  const current = data.nodes.find(node => node.path === permalink && !node.isTag);
  if (!current || /\/wiki\/graph\/?$/.test(permalink)) return null;
  const incoming = new Set(data.edges.filter(edge => edge.kind === 'link' && edge.target === current.id).map(edge => edge.source));
  const outgoing = new Set(data.edges.filter(edge => edge.kind === 'link' && edge.source === current.id).map(edge => edge.target));
  const linked = new Set([...incoming, ...outgoing, current.id]);
  const related = data.nodes.filter(node => !node.isTag && !linked.has(node.id))
    .map(node => ({node, score: (node.tags ?? []).filter(tag => current.tags?.includes(tag)).length}))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title, currentLocale))
    .slice(0, 5).map(item => item.node);
  const groups = [
    {title: ko ? '이 문서를 참조하는 글' : 'Links to this page', nodes: data.nodes.filter(node => incoming.has(node.id))},
    {title: ko ? '이 문서에서 연결한 글' : 'Links from this page', nodes: data.nodes.filter(node => outgoing.has(node.id))},
    {title: ko ? '같은 태그의 글' : 'Related by shared tags', nodes: related},
  ].filter(group => group.nodes.length);
  return <aside className={styles.connections} aria-label={ko ? '문서 연결' : 'Content connections'}>
    <Link to={`/wiki/graph?node=${encodeURIComponent(current.id)}`}>{ko ? '그래프에서 보기' : 'Explore in graph'}</Link>
    {groups.map(group => <section key={group.title}>
      <h2>{group.title}</h2>
      <ul>{group.nodes.map(node => <li key={node.id}><Link to={node.path}>{node.title}</Link>
        <span>{node.kind === 'blog' ? (ko ? '블로그' : 'Blog') : (ko ? '위키' : 'Wiki')}</span></li>)}</ul>
    </section>)}
  </aside>;
}
