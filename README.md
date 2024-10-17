# Restarting building a K3s cluster on some Raspberry Pis #

(Most information is from https://rpi4cluster.com/k3s-kubernetes-install/)

I'm starting from a point where I've already built up and tore down this cluster many times, so there will be packages that
I'm using which might not be part of the standard install for Raspberry Pi OS. Don't expect to follow these instructions 
without finding a few undocumented steps.

## Machines in cluster ##
| Name | Type | WLAN IP | ETH IP | RAM | STORAGE | BOOT MEDIA | EXTRAS | ROLE |
| - | - | - | - | - | - | - | - | - |
| piserver | Pi 5 | 10.10.0.20 | 192.168.1.90 | 8GB | 256GB NVME (USB) | | Hailo8 | Worker |
| pi4node1 | Pi 4b | 10.90.90.91 | 192.168.1.29 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node2 | Pi 4b | 10.90.90.92 | 192.168.1.28 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node3 | Pi 4b | 10.90.90.93 | 192.168.1.27 | 4GB | 32GB USB3 | 128GB MicroSD | | Worker |
| pi4node4 | Pi 4b | 10.90.90.99 | 192.168.1.24 | 8GB | 256GB NVME (USB) + 32GB USB | 256GB NVME | | Backup |
| pi4node5 | Pi 4b | 10.90.90.98 | 192.168.1.22 | 8GB | 32GB USB3 | 128GB MicroSD | 7 Inch LCD | Master |

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
#192.168.1.90    piserver piserver.dev.com
</pre>

### Install K3S on the master node ###
(piserver)

<pre>export CONTROL_PLANE_IP=10.90.90.98 && export MY_K3S_TOKEN=dsfuyasdfahjskt234524</pre>

//try this  
<pre>curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644 --disable servicelb --token ${MY_K3S_TOKEN} --node-taint CriticalAddonsOnly=true:NoExecute --bind-address ${CONTROL_PLANE_IP} --tls-san ${CONTROL_PLANE_IP} --node-ip ${CONTROL_PLANE_IP} --disable-cloud-controller --disable local-storage<pre>

Check it is installed <pre>kubectl version</pre>

### Install K3S on the worker nodes ###

<pre>ansible workers -b -m shell -a "curl -sfL https://get.k3s.io | K3S_URL=https://${CONTROL_PLANE_IP}:6443 K3S_TOKEN=${MY_K3S_TOKEN} sh -"</pre>

After this ensure that each node is bound to the correct adapter: Edit '/etc/systemd/system/k3s-agent.service' and add '--node-ip x.x.x.x' to 'ExecStart'.




When this has finished run <pre>kubectl get nodes</pre>. The output should look something like this:
<pre>pi4node1.dev.com   Ready    <none>                      91s     v1.30.5+k3s1
pi4node2.dev.com   Ready    <none>                      84s     v1.30.5+k3s1
pi4node3.dev.com   Ready    <none>                      94s     v1.30.5+k3s1
pi4node5.dev.com   Ready    <none>                      53s     v1.30.5+k3s1
piserver.dev.com   Ready    control-plane,etcd,master   4m58s   v1.30.5+k3s1</pre>

Note that most of the nodes have no Role. Create a file with the names of the workers (worker_names)<pre>
pi4node1.dev.com
pi4node2.dev.com
pi4node3.dev.com
pi4node5.dev.com
</pre>
Run this bash line to assign the label nodes:
<pre>(readarray -t ARRAY < worker_names; IFS=','; kubectl label nodes "${ARRAY[@]}" kubernetes.io/role=worker)</pre>
Check that the node labels have been applied
<pre>kubectl get nodes</pre>
<pre>pi4node1.dev.com   Ready    worker                      43m    v1.30.5+k3s1
pi4node2.dev.com   Ready    worker                      33m    v1.30.5+k3s1
pi4node3.dev.com   Ready    worker                      33m    v1.30.5+k3s1
pi4node5.dev.com   Ready    worker                      32m    v1.30.5+k3s1
piserver.dev.com   Ready    control-plane,etcd,master   105m   v1.30.5+k3s1</pre>
Add another custom label:
<pre>(readarray -t ARRAY < worker_names; IFS=','; kubectl label nodes "${ARRAY[@]}" node-type=worker)</pre>

Adjust '/etc/environment' so that Helm and other programs know where K8s config is found.
<pre>ansible cube -b -m lineinfile -a "path='/etc/environment' line='KUBECONFIG=/etc/rancher/k3s/k3s.yaml'"</pre>

### Install Helm ###
(https://rpi4cluster.com/k3s-helm-arkade/)
<pre>./install_helm.sh</pre>

### Install Arkade ####
<pre>curl -sLS https://get.arkade.dev | sudo sh</pre>

### Install MetalLB ###
(https://rpi4cluster.com/k3s-network-setting/)

This step failed first time because the metrics API was not available.Check if you can run <pre>kubectl top nodes</pre>. If you can't then reboot the control node and try again.

## PROBLEMS WITH METRICS SERVER NOT LAUNCHING!!! ##
The issue I had with the metrics-server was that it was binding to the wong network adapter.  I was able to fix this by editing '/etc/systemd/system/k3s.service' and adding '--node-ip 10.90.90.98' to the ExecStart. Then restart k3s <pre>sudo systemctl daemon-reload && sudo systemctl restart k3s</pre>. Since seeing this i'ce added node-ip to the install line.


<pre>./install_metallb.sh</pre>

#### Configure MetalLB ####
<pre>./configure_metallb.sh</pre>
Then test
<pre>kubectl get pods -n metallb-system</pre>

### Install Longhorn ###
<pre>./install_longhorn_deps.sh</pre>

The volumes to be used are:
pi4node1 KIOXIA 09FC-5F3D                             28.9G     0% /media/simozzer/KIOXIA
pi4node2 KIOXIA 09FC-5F3D                              28.9G     0% /media/simozzer/KIOXIA
pi4node5 KIOXIA 01F5-6177                              28.9G     0% /media/simozzer/KIOXIA
pi4node3 KIOXIA 17B9-7980                             28.9G     0% /media/simozzer/KIOXIA


THE NEXT 4 LINES ARE TO PREPARE THE VOLUMES (Shouldn't need to do this on rebuild)
Unmount <pre>ansible workers_usb -b -m shell -a "umount /dev/{{ var_disk }}"</pre>
Wipe <pre>ansible workers_usb -b -m shell -a "wipefs -a /dev/{{ var_disk }}"</pre>
Format <pre>ansible workers_usb -b -m filesystem -a "fstype=ext4 dev=/dev/{{ var_disk }}"</pre>
Get blkIds <pre>ansible workers_usb -b -m shell -a "blkid -s UUID -o value /dev/{{ var_disk }}"</pre>

Add ids to hosts

Mount <pre>ansible workers_usb -m ansible.posix.mount -a "path=/storage01 src=UUID={{ var_uuid }} fstype=ext4 state=mounted" -b</pre>
<pre>ansible workers_nvme -m ansible.posix.mount -a "path=/storage02 src=UUID={{ var_uuid }} fstype=ext4 state=mounted" -b</pre>

### Install Longhorn ##
<pre>./install_longhorn.sh</pre> 
After this check everything is running (this might take a while for everything to enter the 'running' state)
<pre>kubectl -n longhorn-system get pods</pre>

#### Setup service for longhorn UI ####
<pre>kubectl apply -f ./longhorn-service.yaml</pre>
After this open the UI in a browser <pre>http://192.168.1.201/</pre>


##### TROUBLE DELETING LONGHORN #####
Attempt1: <pre>for crd in $(kubectl get crd -o name | grep longhorn); do kubectl patch $crd -p '{"metadata":{"finalizers":[]}}' --type=merge; done;</pre>
Attempt2 WORKED: <pre>for crd in $(kubectl get crd -o name | grep longhorn); do kubectl delete $crd; done;</pre>

#### Make Longorn the default storage class ####
<pre>kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'</pre>

## Create Docker Registry ##
<pre>kubectl create namespace docker-registry</pre>
<pre>cd docker-registry</pre>
<pre>kubectl apply -f pvc.yml && kubectl apply -f deployment.yml && kubectl apply -f service.yml</pre>




# mutiPie
bits and pieces for messing with raspberry Pis

To setup sensors

supt apt install lm-sensors sysstat


