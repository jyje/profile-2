export type NetworkNode = {
  id: string; title: string; path?: string; isTag?: boolean; tags?: string[];
  kind?: string; group: string; incoming: number; outgoing: number;
  koreanFallback?: boolean;
};
export type Network = {nodes: NetworkNode[]; edges: {source: string; target: string; kind: string}[]};

export function neighborhood(graph: Network, id: string): Network {
  const ids = new Set([id]);
  for (const edge of graph.edges) {
    if (edge.source === id) ids.add(edge.target);
    if (edge.target === id) ids.add(edge.source);
  }
  const seen = new Set<string>();
  return {
    nodes: graph.nodes.filter(node => ids.has(node.id)),
    edges: graph.edges.filter(edge => {
      if (!ids.has(edge.source) || !ids.has(edge.target)) return false;
      const key = [edge.source, edge.target].sort().join('\0');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }),
  };
}
