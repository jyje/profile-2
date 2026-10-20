---
title: "🖥️ 클러스터"
tags:
  - devops
  - infra
type: Reference
status: draft
image: /img/figures/pi-cluster-rack/thumbnail.png
sources:
  - uri: https://github.com/jyje/blog/blob/34752ed2db6859c9d98f7d197276f4e46549e3a2/content/docs/cluster.md
profile_template: {kind: wiki, version: 1}
profile_layout: {kind: reference, version: 1}
profile_format: 1
---

```anatomy
/img/figures/pi-cluster-rack
```

## Definition

> [!Quote] Kubernetes 공식 용어집
> A set of worker machines, called nodes, that run containerized applications.

- 해석: 같은 목적을 위해 연결된 컴퓨팅 도구들의 집합입니다.

## Understanding

- 이 사이트에서 말하는 클러스터는 주로 [쿠버네티스](./k8s.md)의 클러스터입니다.
- 한 번의 명령으로 여러 장비를 모두 활용할 수 있다면 클러스터라고 봅니다.
- 홈 클러스터는 자원이 너무 모자라서 단일 컨트롤 플레인을 감수하기로 했습니다.

## Usage

- 라즈베리파이 4대로 홈 클러스터를 운영합니다. Pi 4 2대(1대는 컨트롤 플레인)와 Pi 5 2대이고, 배포판은 [MicroK8s](./microk8s.md)입니다. 구성은 [jyje/cluster](https://github.com/jyje/cluster)에 정리했습니다.
- 처음에는 4대를 모두 워커로 쓰면서 그중 3대를 컨트롤 플레인으로 두었지만, 자원이 너무 모자라서 지금은 컨트롤 플레인 하나로 운영합니다.
- 처음에는 노드를 와이파이로 연결했습니다. 헬스체크가 너무 느려 관리가 어려워서 지금은 모두 유선입니다.
- 프론티어 모델이 매우 강력해서, 지금은 컨테이너 기반 에이전트 하네스를 배포하는 워크로드 중심으로 운영합니다. Codex 구독을 연결해서 개인 목적으로 쓰고 있습니다.

## Details

### 예시

- **같은 네트워크에 설치된 10대의 컴퓨터**: 사용자는 한 번의 명령으로 10대의 컴퓨터를 모두 활용할 수 있습니다.
- **한 컴퓨터 속에 생성된 5개의 가상 머신**: 사용자는 한 번의 명령으로 5개의 가상 머신을 모두 활용할 수 있습니다.
- **두 컴퓨터에 각각 3개씩 생성된 가상 머신**: 모든 가상 머신은 서로 통신할 수 있게 설정되어 있고, 사용자는 한 번의 명령으로 모든 가상 머신을 활용할 수 있습니다.
- **우리 집 공유기에 설치된 라즈베리파이, 최근에 산 노트북 그리고 오래된 데스크탑**: 한 번의 명령으로 모든 장비를 사용할 수 있다면 클러스터라 할 수 있습니다.
- **회사에서 4대의 컴퓨터로 구성된 쿠버네티스**: 컴퓨터들이 쿠버네티스라는 하나의 그룹이 되어서 문제 해결을 위한 [컨테이너](./container.md)를 실행합니다.

## References

- 공식 용어집: https://kubernetes.io/docs/reference/glossary/?all=true#term-cluster
- 관련 문서: [쿠버네티스](./k8s.md), [MicroK8s](./microk8s.md), [라즈베리파이](./raspberry-pi.md), [컨테이너](./container.md)
- 제 클러스터: https://github.com/jyje/cluster
