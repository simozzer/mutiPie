# Restarting building a K3s cluster on some Raspberry Pis #



## Machines in cluster ##
| Name | Type | WLAN IP | ETH IP | RAM | STORAGE | BOOT MEDIA | EXTRAS | ROLE |
| - | - | - | - | - | - | - | - | - |
| piserver | Pi 5 | 10.10.0.20 | 192.168.1.90 | 8GB | 128GB NVME (USB) | | Hailo8 | Master |
| pi4node1 | Pi 4b | 10.90.90.91 | 192.168.1.29 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node2 | Pi 4b | 10.90.90.92 | 192.168.1.28 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node3 | Pi 4b | 10.90.90.93 | 192.168.1.27 | 4GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node4 | Pi 4b | 10.90.90.99 | 192.168.1.24 | 8GB | 128GB NVME (USB) | | | Backup |
| pi4node5 | Pi 4b | 10.90.90.98 | 192.168.1.22 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |





# mutiPie
bits and pieces for messing with raspberry Pis

To setup sensors

supt apt install lm-sensors sysstat


