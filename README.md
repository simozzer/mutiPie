# Restarting building a K3s cluster on some Raspberry Pis #

I'm starting from a point where I've already built up and tore down this cluster many times, so there will be packages that
I'm using which might not be part of the standard install for Raspberry Pi OS. Don't expect to follow these instructions 
without finding a few undocumented steps.

## Machines in cluster ##
| Name | Type | WLAN IP | ETH IP | RAM | STORAGE | BOOT MEDIA | EXTRAS | ROLE |
| - | - | - | - | - | - | - | - | - |
| piserver | Pi 5 | 10.10.0.20 | 192.168.1.90 | 8GB | 128GB NVME (USB) | | Hailo8 | Master |
| pi4node1 | Pi 4b | 10.90.90.91 | 192.168.1.29 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node2 | Pi 4b | 10.90.90.92 | 192.168.1.28 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node3 | Pi 4b | 10.90.90.93 | 192.168.1.27 | 4GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node4 | Pi 4b | 10.90.90.99 | 192.168.1.24 | 8GB | 128GB NVME (USB) | | | Backup |
| pi4node5 | Pi 4b | 10.90.90.98 | 192.168.1.22 | 8GB | 32GB USB3 | 128GB MicroSD | 7 Inch LCD | Worker |

I'm using the domain 'dev.com' (e.g. the FQDN for pi4node1 is pi4node1.dev.com).

The machines in this cluster are all running Raspberry Pi OS. Only the 'Master' node has a graphical desktop, the rest are just running a server edition with no desktop.

I've created an SSH key on 'piserver' and copied it to each of the other nodes in the cluster so that I can SSH into them.

I've edited /etc/hosts on piserver: (Note that I've commented out the WLAN IPs because I want all the machines in the cluster to use Ethernet and not Wireless - I may have to fiddle with dhcppd.conf to do this properly). 

I want to keep 'piserver' accessible by machines on my network that are not in the cluster but all the other nodes in the cluster should remain hidden.

<pre>127.0.0.1       localhost piserver piserver.dev.com
::1             localhost ip6-localhost ip6-loopback
ff02::1         ip6-allnodes
ff02::2         ip6-allrouters

10.90.90.91     pi4node1 pi4node1.dev.com
#192.168.1.29   pi4node1 pi4node1.dev.com

10.90.90.92     pi4node2 pi4node2.dev.com
#192.168.1.28   pi4node2 pi4node2.dev.com

10.90.90.93     pi4node3 pi4node3.dev.com
#192.168.1.27   pi4node3 pi4node3.dev.com

10.90.90.99     pi4node4 pi4node4.dev.com
#192.168.1.24   pi4node4 pi4node4.dev.com

10.90.90.98     pi4node5 pi4node5.dev.com
#192.168.1.22    pi4node5 pi4node5.dev.com

10.10.0.20      piserver piserver.dev.com
192.168.1.90    piserver piserver.dev.com
</pre>

### Install K3S on the master node ###
(piserver)
//try this  (using wlan address ro4 --advertise-address?)
<pre>curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --disable=traefik --flannel-backend=host-gw --tls-san=10.10.0.20 --bind-address=10.10.0.20 --advertise-address=192.168.1.90 --node-ip=10.10.0.20 --cluster-init" sh -s -</pre>

##### To run without sudo ##### <pre>sudo chown -R $USER $HOME/.kube && sudo chown -R $USER /usr/local/bin/kubectl</pre>
The above line might not be needed. <pre>sudo chmod 644 /etc/rancher/k3s/k3s.yaml</pre>

Check it is installed <pre>kubectl version</pre>

### Install K3S on the worker nodes ###
For this we'll create an ansible job. For this, and other ansible stuff, we'll need a hosts file (I've called mine mypis). <pre>[pi4s]
10.90.90.91
10.90.90.92
10.90.90.93
10.90.90.99
10.90.90.98

[controllers]
10.90.90.91

[workers]
10.90.90.91
10.90.90.92
10.90.90.93
10.90.90.98

[storage]
10.90.90.99
</pre>



# mutiPie
bits and pieces for messing with raspberry Pis

To setup sensors

supt apt install lm-sensors sysstat


