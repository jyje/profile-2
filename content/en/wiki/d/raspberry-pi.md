---
title: "🍓 Raspberry Pi"
tags:
  - infra
  - mini-pc
  - raspberry-pi
type: Reference
status: draft
image: /img/figures/raspberry-pi/thumbnail.png
profile_template: {kind: wiki, version: 1}
profile_layout: {kind: reference, version: 1}
profile_format: 1
---

```anatomy
/img/figures/raspberry-pi
```

## Definition

> [!Quote] Raspberry Pi, about
> Raspberry Pi makes inexpensive, small computers for home, industry, education and much more.

- Reading: it makes small, low-cost computers that fit homes, industry and education alike.
- Also written: Raspberry Pi; 라즈베리파이

## Understanding

- I bought it for Linux development, Kubernetes practice, IoT and edge AI.
- I serve it on a public domain, and use it to verify my own technical skills and to prove out ideas.
- To me, a Raspberry Pi is a small, split-up mini computer. I chose it because GPIO makes hardware expansion easy, there is plenty of material online, and it was cheap at the time. I have not done IoT with it myself; I use it as an ARM64 Linux machine.
- What I miss is CPU speed. I felt it in build times and container virtualization, so I rebuilt the cluster as v2 when I bought the Pi 5.
- No expansion boards: just microSD cards and USB disks.

## Usage

- I use them as cluster nodes. The setup is on the [Cluster](./cluster.md) page.
- I served small models with [Ollama](https://ollama.com). I ran a 1B LLM and an embedding model and built a pipeline on them.
- Frontier models are very capable, so I have reorganized the workloads around agent harnesses. That is on the [Cluster](./cluster.md) page.

## Details

### Raspberry Pi 4 Model B

The model in the figure above. Its official tagline is "Your tiny, dual-display, desktop computer".

| Item         | Detail                                                   |
| ------------ | -------------------------------------------------------- |
| SoC          | Broadcom BCM2711, quad-core Cortex-A72 (64-bit ARM)      |
| Memory       | LPDDR4, 1 to 8 GB depending on the model                 |
| Video        | 2 micro-HDMI ports, MIPI DSI, MIPI CSI                   |
| Connectivity | 2 USB 3.0, 2 USB 2.0, Gigabit Ethernet, Wi-Fi, Bluetooth |
| Power        | USB-C, 5 V                                               |
| Storage      | microSD                                                  |
| Size         | 85 × 56 mm                                               |
| Expansion    | 40-pin GPIO header                                       |

### GPIO header

A 40-pin header (2 × 20, 2.54 mm pitch) on one edge of the board connects it to external circuits.

- Odd pins sit on the inner row and even pins on the outer row. Pin 1 is at the microSD end.
- Pins are 3.3 V power, 5 V power, ground, or GPIO.
- Each GPIO pin can also take an alternate function such as I2C, SPI, UART or PWM.

> [!warning] Warning
> GPIO is 3.3 V logic. Wiring a 5 V signal straight to a GPIO pin can damage the board.

## References

- Official site: https://www.raspberrypi.com
- About: https://www.raspberrypi.com/about/
- Raspberry Pi 4 Model B: https://www.raspberrypi.com/products/raspberry-pi-4-model-b/
- Documentation: https://www.raspberrypi.com/documentation/
- Pinout: https://pinout.xyz
