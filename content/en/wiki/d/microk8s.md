---
title: "☸️ MicroK8s"
tags:
  - kubernetes
type: Reference
status: draft
profile_template: {kind: wiki, version: 1}
profile_format: 1
---

## Definition

> [!Quote] MicroK8s, from Canonical
> Zero-ops, pure-upstream, HA Kubernetes, from developer workstations to production.

- Reading: Kubernetes without the effort. The official site's headline says the same: "The effortless Kubernetes".

## Understanding

- I chose it because it is a well-made Kubernetes with a simple lifecycle. I find Canonical's stack systematic, and I was already familiar with it.
- An active community was another reason.

## Details

### The slogan, read closely

- ZeroOps: simple install and management (snap), automatic updates (kubelet), and many plugins (addons).
- Pure Upstream: one of the [CNCF](./cncf.md) certified Kubernetes distributions, updated in step with Kubernetes. It ships almost as soon as official Kubernetes does.
- HA Kubernetes: supports multiple nodes, so high availability is possible.
- From Developer Workstations to Production: usable from a dev machine to production.

### A tuned Kubernetes

It is a kind of [tuned Kubernetes](./k8s.md), and the only tuning is for a smaller footprint.

### Effort and fit

- It can run production on a high-availability setup, and the technical effort for that is low.
- Rather than large enterprises, it suits individuals and small projects that want production-grade Kubernetes.

## References

- Official site: https://canonical.com/microk8s
- Documentation: https://canonical.com/microk8s/docs
- GitHub: https://github.com/canonical/microk8s
- Related pages: [Kubernetes](./k8s.md), [CNCF](./cncf.md)
- Where I use it: [Cluster](./cluster.md)
