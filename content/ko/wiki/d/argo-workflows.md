---
title: Argo Workflows
tags:
  - argo-proj
type: Reference
status: draft
sources:
  - uri: https://github.com/jyje/blog/blob/34752ed2db6859c9d98f7d197276f4e46549e3a2/content/docs/argo-workflows.md
---

## Name
- Argo Workflows; 아르고 워크플로우

### Origin
- 애플리케이션의 이름인 아르고의 어원은 [아르고 프로젝트](./argo-proj.md#origin)에서 찾을 수 있다.


## Definition
- [쿠버네티스](./k8s.md)의 [컨테이너](./container.md) 기반 [워크플로우](./workflow.md) 엔진


## Objectives 
- 쿠버네티스 파드를 원하는 순서대로 실행하여 문제를 해결한다.


## Example 
- [아르고 이벤트](./argo-events.md)와 연동해 이벤트 감지 후 파이프라인을 수행한다.
	- 구체적인 예시:
		- 깃허브에서 푸시 이벤트를 감지해 CI/CD 파이프라인을 수행한다.
