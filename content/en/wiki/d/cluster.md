---
title: "🖥️ Cluster"
tags:
  - devops
  - infra
type: Reference
status: draft
image: /img/figures/pi-cluster-rack/thumbnail.png
profile_template: {kind: wiki, version: 1}
profile_layout: {kind: reference, version: 1}
profile_format: 1
---

```anatomy
/img/figures/pi-cluster-rack
```

## Definition

> [!Quote] Kubernetes glossary
> A set of worker machines, called nodes, that run containerized applications.

- Reading: a set of computing machines connected for the same purpose.

## Understanding

- On this site, a cluster mostly means a [Kubernetes](./k8s.md) cluster.
- If one command can use several machines at once, I call it a cluster.
- My home cluster is so short on resources that I accept a single control plane.

## Usage

- I run a home cluster on four Raspberry Pi boards: two Pi 4 (one is the control plane) and two Pi 5, on [MicroK8s](./microk8s.md). The setup is documented in [jyje/cluster](https://github.com/jyje/cluster).
- At first all four nodes were workers and three of them were also control plane. Resources ran out, so I now run a single control plane.
- The nodes first joined over Wi-Fi, but health checks were too slow to manage, so everything is wired now.
- Frontier models have become very capable, so the cluster now centers on workloads that deploy container-based agent harnesses. I connect a Codex subscription and use them for personal purposes.

## Details

### Examples

- **Ten computers on the same network**: one command can use all ten.
- **Five virtual machines inside one computer**: one command can use all five.
- **Three virtual machines on each of two computers**: every virtual machine can talk to the others, and one command can use them all.
- **A Raspberry Pi on the home router, a recent laptop and an old desktop**: if one command can use all of them, it is a cluster.
- **A Kubernetes cluster of four computers at work**: the computers form one group and run [containers](./container.md) to solve a problem.

## References

- Official glossary: https://kubernetes.io/docs/reference/glossary/?all=true#term-cluster
- Related pages: [Kubernetes](./k8s.md), [MicroK8s](./microk8s.md), [Raspberry Pi](./raspberry-pi.md), [Container](./container.md)
- My cluster: https://github.com/jyje/cluster
