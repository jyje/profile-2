import {useEffect, useMemo, useState, type ReactElement} from 'react';
import {useLocation} from '@docusaurus/router';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {Button} from '@site/src/components/ui/button';
import {Input} from '@site/src/components/ui/input';

import GraphCanvas, {type GraphCanvasEdge, type GraphCanvasNode} from './GraphCanvas';
import styles from '../../pages/wiki/graph.module.css';

type GraphNode = GraphCanvasNode & {
  path?: string;
  koreanPath?: string;
  koreanFallback: boolean;
};

type Graph = {nodes: GraphNode[]; edges: GraphCanvasEdge[]};
type PageProps = {graphData: Graph};

const COPY = {
  ko: {
    introduction: '문서와 태그의 연결을 탐색하세요. 노드를 잡아 움직이면 주변 문서도 함께 반응합니다.',
    all: '전체 그래프',
    local: '주변 문서',
    search: '문서 검색',
    searchPlaceholder: '제목으로 찾기',
    noteCount: '문서',
    linkCount: '연결',
    fallbackCount: '영문 대체 문서',
    zoomIn: '확대',
    zoomOut: '축소',
    reset: '초기화',
    selected: '선택한 노드',
    noSelection: '노드를 선택하면 문서 정보가 여기에 표시됩니다.',
    incoming: '들어오는 연결',
    outgoing: '나가는 연결',
    related: '연결된 문서와 태그',
    open: '문서 열기',
    openKorean: '한국어 원문 열기',
    koreanOriginal: '한국어 원문',
    browserTranslation: '브라우저 번역 권장',
    browse: '문서 목록으로 탐색하기',
    graphLabel: '문서와 태그의 상호작용 그래프',
    noResults: '검색 결과가 없습니다.',
    rendererError: '그래프 렌더러를 불러오지 못했습니다. 네트워크에서 jsDelivr 접근을 허용해주세요.',
    groups: {knowledge: '지식', design: '디자인', guide: '가이드', home: '홈', tag: '태그', blog: '블로그'},
  },
  en: {
    introduction: 'Explore the connections between notes and tags. Grab a node and move it to set its neighbors in motion.',
    all: 'Global graph',
    local: 'Nearby notes',
    search: 'Search notes',
    searchPlaceholder: 'Find a title',
    noteCount: 'notes',
    linkCount: 'links',
    fallbackCount: 'Korean originals',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset view',
    selected: 'Selected node',
    noSelection: 'Select a node to see its details here.',
    incoming: 'Incoming connections',
    outgoing: 'Outgoing connections',
    related: 'Connected notes and tags',
    open: 'Open note',
    openKorean: 'Open Korean original',
    koreanOriginal: 'Korean original',
    browserTranslation: 'Browser translation recommended',
    browse: 'Browse notes as a list',
    graphLabel: 'Interactive graph of documents and tags',
    noResults: 'No notes match that search.',
    rendererError: 'The graph renderer could not load. Allow access to jsDelivr in your network.',
    groups: {knowledge: 'Knowledge', design: 'Design', guide: 'Guide', home: 'Home', tag: 'Tag', blog: 'Blog'},
  },
} as const;

function visualEdges(edges: GraphCanvasEdge[]): GraphCanvasEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = [edge.source, edge.target].sort().join('\0');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function displayGroup(group: string, copy: (typeof COPY)['ko'] | (typeof COPY)['en']): string {
  return copy.groups[group as keyof typeof copy.groups] ?? group;
}

export default function WikiGraphPage({graphData}: PageProps): ReactElement {
  const {i18n} = useDocusaurusContext();
  const locale = i18n.currentLocale === 'ko' ? 'ko' : 'en';
  const copy = COPY[locale];
  const graph = graphData;
  const documents = useMemo(() => graph.nodes.filter((node) => !node.isTag), [graph]);
  const highestDegreeNode = [...documents].sort((a, b) => (b.incoming + b.outgoing) - (a.incoming + a.outgoing))[0];
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<'global' | 'local'>('global');
  const [search, setSearch] = useState('');
  const location = useLocation();
  useEffect(() => {
    const nodeId = new URLSearchParams(location.search).get('node');
    if (nodeId && graph.nodes.some(node => node.id === nodeId)) {
      setSelectedId(nodeId);
      setMode('local');
    }
  }, [location.search, graph]);

  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph]);
  const selectedNode = nodeById.get(selectedId);
  const neighbors = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const result = new Set<string>([selectedId]);
    graph.edges.forEach((edge) => {
      if (edge.source === selectedId) result.add(edge.target);
      if (edge.target === selectedId) result.add(edge.source);
    });
    return result;
  }, [graph, selectedId]);
  const visibleNodes = useMemo(
    () => mode === 'local' ? graph.nodes.filter((node) => neighbors.has(node.id)) : graph.nodes,
    [graph, mode, neighbors],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => visualEdges(graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))),
    [graph, visibleIds],
  );
  const matchingIds = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale === 'ko' ? 'ko-KR' : 'en-US');
    return new Set(query ? graph.nodes.filter((node) => node.title.toLocaleLowerCase(locale === 'ko' ? 'ko-KR' : 'en-US').includes(query)).map((node) => node.id) : []);
  }, [graph, locale, search]);
  const selectedNeighbors = useMemo(() => {
    if (!selectedId) return [];
    return [...neighbors]
      .filter((id) => id !== selectedId)
      .map((id) => nodeById.get(id))
      .filter((node): node is GraphNode => Boolean(node))
      .sort((a, b) => a.title.localeCompare(b.title, locale));
  }, [locale, neighbors, nodeById, selectedId]);
  const fallbackCount = documents.filter((node) => node.koreanFallback).length;
  const graphHasMatches = !search.trim() || matchingIds.size > 0;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (value.trim()) setMode('global');
  }

  return (
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.introduction}>{copy.introduction}</p>
          <div className={styles.stats} aria-label={`${documents.length} ${copy.noteCount}, ${graph.edges.length} ${copy.linkCount}`}>
            <span><strong>{documents.length}</strong> {copy.noteCount}</span>
            <span><strong>{graph.edges.length}</strong> {copy.linkCount}</span>
            {locale === 'en' && <span><strong>{fallbackCount}</strong> {copy.fallbackCount}</span>}
          </div>
        </header>

        <section className={styles.workspace} aria-label={copy.graphLabel}>
          <div className={styles.graphColumn}>
            <div className={styles.toolbar}>
              <div className={styles.modeSwitch} role="group" aria-label={locale === 'ko' ? '그래프 범위' : 'Graph scope'}>
                <Button type="button" shape="pill" size="sm" variant={mode === 'global' ? 'default' : 'ghost'} aria-pressed={mode === 'global'} onClick={() => setMode('global')}>{copy.all}</Button>
                <Button
                  type="button"
                  shape="pill"
                  size="sm"
                  variant={mode === 'local' ? 'default' : 'ghost'}
                  aria-pressed={mode === 'local'}
                  onClick={() => {
                    if (!selectedId && highestDegreeNode) setSelectedId(highestDegreeNode.id);
                    setMode('local');
                  }}
                >{copy.local}</Button>
              </div>
              <label className={styles.search}>
                <span className={styles.visuallyHidden}>{copy.search}</span>
                <span aria-hidden="true" className={styles.searchIcon}>⌕</span>
                <Input aria-label={copy.search} value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder={copy.searchPlaceholder} type="search" />
                {search && <Button type="button" variant="ghost" size="icon" onClick={() => setSearch('')} aria-label={locale === 'ko' ? '검색 지우기' : 'Clear search'}>×</Button>}
              </label>
            </div>

            <div className={styles.canvasFrame}>
              <div className={styles.canvasLegend} aria-hidden="true">
                {(['knowledge', 'design', 'guide', 'blog'] as const).map((group) => (
                  <span key={group}><i className={styles[`dot_${group}`]} />{displayGroup(group, copy)}</span>
                ))}
                <span><i className={styles.dot_tag} />{displayGroup('tag', copy)}</span>
              </div>
              <GraphCanvas
                nodes={visibleNodes}
                edges={visibleEdges}
                selectedId={selectedId}
                matchingIds={matchingIds}
                searchActive={Boolean(search.trim())}
                enableRadial={mode === 'global'}
                label={copy.graphLabel}
                zoomInLabel={copy.zoomIn}
                zoomOutLabel={copy.zoomOut}
                resetLabel={copy.reset}
                onSelect={setSelectedId}
                loadErrorLabel={copy.rendererError}
              />
              {!graphHasMatches && <p className={styles.emptySearch}>{copy.noResults}</p>}
            </div>
          </div>

          <aside className={styles.details} aria-live="polite">
            <p className={styles.detailEyebrow}>{copy.selected}</p>
            {selectedNode ? (
              <>
                <div className={styles.nodeHeading}>
                  <span className={`${styles.detailDot} ${styles[`dot_${selectedNode.group}`] ?? styles.dot_home}`} />
                  <span>{displayGroup(selectedNode.group, copy)}</span>
                  {selectedNode.koreanFallback && <span className={styles.fallbackBadge}>{copy.koreanOriginal}</span>}
                </div>
                <h2>{selectedNode.title}</h2>
                {selectedNode.koreanFallback && <p className={styles.fallbackHint}>{copy.browserTranslation}</p>}
                <div className={styles.degreeStats}>
                  <div><strong>{selectedNode.incoming}</strong><span>{copy.incoming}</span></div>
                  <div><strong>{selectedNode.outgoing}</strong><span>{copy.outgoing}</span></div>
                </div>
                {selectedNode.path && <Button asChild className={styles.openLink}><Link to={selectedNode.path}>{copy.open}<span aria-hidden="true">↗</span></Link></Button>}
                {locale === 'en' && selectedNode.koreanFallback && selectedNode.koreanPath && (
                  <Button asChild variant="outline" className={styles.originalLink}><a href={selectedNode.koreanPath}>
                    {copy.openKorean}<span aria-hidden="true">↗</span>
                  </a></Button>
                )}
                {selectedNeighbors.length > 0 && (
                  <div className={styles.neighborList}>
                    <h3>{copy.related}</h3>
                    <ul>
                      {selectedNeighbors.slice(0, 7).map((node) => (
                        <li key={node.id}>
                          <Button type="button" variant="link" size="text" onClick={() => setSelectedId(node.id)}>{node.title}</Button>
                          {node.koreanFallback && <span>{copy.koreanOriginal}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : <p>{copy.noSelection}</p>}
          </aside>
        </section>

        <details className={styles.pageIndex}>
          <summary>{copy.browse}</summary>
          <ul>
            {documents.map((node) => (
              <li key={node.id}>
                {node.path && <Link to={node.path}>{node.title}</Link>}
                {node.koreanFallback && <span>{copy.koreanOriginal}</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
  );
}
