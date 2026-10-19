---
title: "🍓 라즈베리파이"
tags:
  - infra
  - mini-pc
  - raspberry-pi
type: Reference
template: wiki-reference@1
status: draft
image: /anatomy/raspberry-pi/thumbnail.png
---

```anatomy-figure
- name: raspberry-pi
  title: Raspberry Pi 4 Model B 인터랙티브 그림
```

## Definition

> [!Quote] Raspberry Pi 공식 소개
> Raspberry Pi makes inexpensive, small computers for home, industry, education and much more.

- 해석: 집, 산업, 교육 등에 두루 쓸 수 있는 저렴하고 작은 컴퓨터를 만든다.
- 표기: Raspberry Pi; 라즈베리파이

## Understanding

- 리눅스 개발, 쿠버네티스 연습, IoT와 Edge AI를 위해 구매했습니다.
- 공개 도메인으로 서비스하면서, 개인의 전문 기술을 검증하고 아이디어를 실증하는 용도로 씁니다.
- 저에게 라즈베리파이는 작게 나뉜 미니 컴퓨터입니다. GPIO로 하드웨어를 확장하기 쉽고, 자료를 쉽게 찾을 수 있고, 당시에는 가격도 저렴해서 골랐습니다. IoT는 직접 해보지 않았고, ARM64 리눅스 머신으로 씁니다.
- 아쉬운 점은 CPU 성능입니다. 빌드 속도와 컨테이너 가상화 속도에서 체감했고, 그래서 Pi 5를 들이면서 클러스터를 v2로 새로 올렸습니다.
- 확장 보드 없이 microSD 카드와 USB 디스크만 연결해서 씁니다.

## Usage

- MicroK8s 홈 클러스터를 4대로 운영합니다. Pi 4 2대(1대는 컨트롤 플레인)와 Pi 5 2대입니다. 구성은 [jyje/cluster](https://github.com/jyje/cluster)에 정리했습니다.
- 처음에는 노드를 와이파이로 연결했습니다. 헬스체크가 너무 느려 관리가 어려워서 지금은 모두 유선입니다.
- [Ollama](https://ollama.com)로 작은 모델을 서빙해 봤습니다. 1B LLM이나 임베딩 모델을 올려서 파이프라인을 구성했습니다.
- 다만 프론티어 모델이 매우 강력해서, 지금은 컨테이너 기반 에이전트 하네스를 배포하는 워크로드 중심으로 재편했습니다. Codex 구독을 연결해서 개인 목적으로 쓰고 있습니다.

## Details

### Raspberry Pi 4 Model B

위 그림의 모델입니다. 공식 제품 소개는 "Your tiny, dual-display, desktop computer"입니다.

| 항목 | 내용 |
|---|---|
| SoC | Broadcom BCM2711, 쿼드코어 Cortex-A72 (ARM 64비트) |
| 메모리 | LPDDR4, 모델에 따라 1~8GB |
| 영상 | 마이크로 HDMI 2개, MIPI DSI, MIPI CSI |
| 연결 | USB 3.0 2개, USB 2.0 2개, 기가비트 이더넷, 무선 랜, 블루투스 |
| 전원 | USB-C 5V |
| 저장장치 | microSD |
| 크기 | 85 × 56 mm |
| 확장 | 40핀 GPIO 헤더 |

### GPIO 헤더

보드 한쪽 가장자리의 40핀 헤더(2×20, 핀 간격 2.54mm)로 외부 회로와 연결합니다.

- 홀수 핀은 보드 안쪽 줄, 짝수 핀은 바깥쪽 줄에 있고, 1번 핀은 microSD 쪽 끝에 있습니다.
- 핀은 3.3V 전원, 5V 전원, 접지, 그리고 GPIO로 나뉩니다.
- 핀마다 I2C, SPI, UART, PWM 같은 대체 기능이 있습니다.

> [!warning] 주의
> GPIO는 3.3V 로직입니다. 5V 신호를 GPIO 핀에 직접 연결하면 보드가 손상될 수 있습니다.

## References

- 공식 사이트: https://www.raspberrypi.com
- 공식 소개: https://www.raspberrypi.com/about/
- Raspberry Pi 4 Model B: https://www.raspberrypi.com/products/raspberry-pi-4-model-b/
- 공식 문서: https://www.raspberrypi.com/documentation/
- 핀 배치: https://pinout.xyz
