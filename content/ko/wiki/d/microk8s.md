---
title: "☸️ MicroK8s"
tags:
  - kubernetes
type: Reference
status: draft
sources:
  - uri: https://github.com/jyje/blog/blob/34752ed2db6859c9d98f7d197276f4e46549e3a2/content/docs/microk8s.md
profile_template: {kind: wiki, version: 1}
profile_format: 1
---

## Definition

> [!Quote] MicroK8s 공식 소개 (Canonical)
> Zero-ops, pure-upstream, HA Kubernetes, from developer workstations to production.

- 해석: 노력이 필요 없는 간편한 쿠버네티스입니다. 공식 사이트의 제목도 "The effortless Kubernetes"입니다.

## Understanding

- 라이프사이클이 단순하고 잘 만들어진 쿠버네티스라서 골랐습니다. 평소 Canonical 스택이 체계적이라고 느꼈고, 이미 익숙했습니다.
- 커뮤니티가 활발하다는 점도 이유였습니다.

## Details

### 슬로건 해석

- ZeroOps: 간단한 설치와 관리(snap), 자동 업데이트(kubelet), 다양한 플러그인 지원(addons)을 뜻합니다.
- Pure Upstream: [CNCF](./cncf.md) 공인 쿠버네티스 배포 중 하나로, 쿠버네티스 배포와 동일하게 버전을 갱신합니다. 공식 쿠버네티스가 배포되면 거의 같은 시기에 함께 배포됩니다.
- HA Kubernetes: 멀티 노드를 지원하여 고가용성을 유지할 수 있습니다.
- From Developer Workstations to Production: 개발환경부터 프로덕션까지 사용할 수 있습니다.

### 튜닝 쿠버네티스

[튜닝 쿠버네티스](./k8s.md)의 한 종류이고, 경량화를 위한 튜닝만 적용되어 있습니다.

### 운영 난도와 적합한 규모

- 고가용성 구성을 기반으로 프로덕션으로 사용할 수 있고, 이를 위한 기술적인 난도는 낮은 편입니다.
- 대기업에서 사용하기보다는, 개인이나 소규모 프로젝트에서 프로덕션 수준의 쿠버네티스를 운영하기에 적합합니다.

## References

- 공식 사이트: https://canonical.com/microk8s
- 공식 문서: https://canonical.com/microk8s/docs
- GitHub: https://github.com/canonical/microk8s
- 관련 문서: [쿠버네티스](./k8s.md), [CNCF](./cncf.md)
- 제가 쓰는 곳: [클러스터](./cluster.md)
