# Restarting building a K3s cluster on some Raspberry Pis #

### LINKS ###
System is still fairly unstable and may require <pre>sudo systemctl restart k3s</pre>

* (Portainer)[http://192.168.1.203:9000/]
* (Longhorn)[http://192.168.1.201/]
* (ArgoCD)[https://192.168.1.208/]
* (Grafana)[http://192.168.1.206:3000/]
* (Prometheus)[http://192.168.1.205:9090]
* (MySQL)[http://192.168.1.210:3306]
* (PhpMyAdmin)[http://192.168kubect.1.213]

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

I've created an SSH key on the 'master' node (pi4node5) and copied it to each of the other nodes in the cluster so that I can SSH into them.

I've edited /etc/hosts on pi4node5: (Note that I've commented out the WLAN IPs because I want all the machines in the cluster to use Ethernet and not Wireless - I may have to fiddle with dhcppd.conf to do this properly). 

Edited /boot/firmware/cmdline.txt to contain 'cgroup_memory=1 cgroup_enable=memory group_enable=cpuset'

I want to keep 'pi4node5' accessible by machines on my network (those that are not in the cluster) but all the other nodes in the cluster should remain hidden.



<pre>127.0.0.1       localhost
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


~~curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644 --disable servicelb --token ${MY_K3S_TOKEN} --node-taint CriticalAddonsOnly=true:NoExecute --bind-address ${CONTROL_PLANE_IP} --tls-san ${CONTROL_PLANE_IP} --node-ip ${CONTROL_PLANE_IP} --disable-cloud-controller --disable local-storage<~~
Remove node-taint due to error messages
<pre>
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644 --disable servicelb --token ${MY_K3S_TOKEN} --node-taint CriticalAddonsOnly=true:NoExecute --bind-address ${CONTROL_PLANE_IP} --tls-san ${CONTROL_PLANE_IP} --node-ip ${CONTROL_PLANE_IP} --external-ip 192.168.1.22  --disable-cloud-controller --disable local-storage
</pre>

Check it is installed <pre>kubectl version</pre>

### Install K3S on the worker nodes ###

~~ansible workers -b -m shell -a "curl -sfL https://get.k3s.io | K3S_URL=https://${CONTROL_PLANE_IP}:6443 K3S_TOKEN=${MY_K3S_TOKEN} sh -"~~
Use the following to assign the ethernet adapter ip address to the node ip
<pre>ansible workers -b -m shell -a "curl -sfL https://get.k3s.io | K3S_URL=https://${CONTROL_PLANE_IP}:6443 K3S_TOKEN=${MY_K3S_TOKEN} sh -s - --node-ip {{ var_ip_eth  }}"</pre>


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
The issue I had with the metrics-server was that it was binding to the wong network adapter.  I was able to fix this by editing '/etc/systemd/system/k3s.service' and adding '--node-ip 10.90.90.98' to the ExecStart. Then restart k3s <pre>sudo systemctl daemon-reload && sudo systemctl restart k3s</pre>. Since seeing this i've added node-ip to the install line. (Node ip also needs adding to all the worker nodes in /etc/systemd/system/k3s-agent.service)


<pre>./install_metallb.sh</pre>

#### Configure MetalLB ####
<pre>./configure_metallb.sh</pre>
Then test
<pre>kubectl get pods -n metallb-system</pre>

### Install Longhorn ###
<pre>./install_longhorn_deps.sh</pre>


THE NEXT 6 LINES ARE TO PREPARE THE VOLUMES (Shouldn't need to do this on rebuild)
Unmount <pre>ansible workers_usb -b -m shell -a "umount /dev/{{ var_disk }}"</pre>
Wipe <pre>ansible workers_usb -b -m shell -a "wipefs -a /dev/{{ var_disk }}"</pre>
Format <pre>ansible workers_usb -b -m filesystem -a "fstype=ext4 dev=/dev/{{ var_disk }}"</pre>
Get blkIds <pre>ansible workers_usb -b -m shell -a "blkid -s UUID -o value /dev/{{ var_disk }}"</pre>
Add ids to hosts
Mount <pre>ansible workers_usb -m ansible.posix.mount -a "path=/storage01 src=UUID={{ var_uuid }} fstype=ext4 state=mounted" -b</pre>
<pre>ansible workers_nvme -m ansible.posix.mount -a "path=/storage02 src=UUID={{ var_uuid }} fstype=ext4 state=mounted" -b</pre>

TODO: Add instructions on cluster rebuild for storage

### Install Longhorn ##
<pre>./install_longhorn.sh</pre> 
After this check everything is running (this might take a while for everything to enter the 'running' state - 9 minutes on my cluster!!)
<pre>kubectl -n longhorn-system get pods</pre>

#### Setup service for longhorn UI ####
<pre>kubectl apply -f ./longhorn-service.yaml</pre>
After this open the UI in a browser <pre>http://192.168.1.201/</pre>

At this point the setting of the extenal IP for service/longhorn-ingress-lb was stuck at 'pending'. The following resolved this.
<pre>kubectl patch svc longhorn-ingress-lb  -p '{"spec": {"type": "LoadBalancer", "externalIPs":["192.168.1.201"]}}' -n longhorn-system</pre>
same thing happens with portainer:
<pre>kubectl patch svc portainer -p '{"spec": {"type": "LoadBalancer", "externalIPs":["192.168.1.203"]}}' -n portainer</pre>
##### Remember!!! Add fstab entries on each node #####
TODOTODOTODOTODOTODOTODOTODO -tag nodes



##### TROUBLE DELETING LONGHORN #####
Attempt1: <pre>for crd in $(kubectl get crd -o name | grep longhorn); do kubectl patch $crd -p '{"metadata":{"finalizers":[]}}' --type=merge; done;</pre>
Attempt2 WORKED: <pre>for crd in $(kubectl get crd -o name | grep longhorn); do kubectl delete $crd; done;</pre>

#### Make Longorn the default storage class ####
<pre>kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'</pre>

## Create Docker Registry ##
<pre>kubectl create namespace docker-registry</pre>
<pre>cd docker-registry</pre>
<pre>kubectl apply -f pvc.yml && kubectl apply -f deployment.yml && kubectl apply -f service.yml</pre>

## Create Redis Server ##
<pre>kubectl create namespace redis-server</pre>
<pre>cd redis-server</pre>
<pre>kubectl apply -f pvc.yml && kubectl apply -f deployment.yml && kubectl apply -f service.yml</pre>

## Install Portainer ##
<pre>cd portainer</pre>
<pre>./install_portainer.sh</pre>
<pre>kubectl apply -f svc.yml</pre>
If not assigned an external IP <pre>kubectl patch svc portainer -p '{"spec": {"type": "LoadBalancer", "externalIPs":["192.168.1.203"]}}' -n portainer</pre>


## Install ArgoCD (Not installed) ##
<pre>cd argocd</pre>
<pre>kubectl create namespace argocd</pre>
<pre>kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml</pre>
<pre>kubectl patch service argocd-server -n argocd --patch '{ "spec": { "type": "LoadBalancer", "loadBalancerIP": "192.168.1.208" } }'</pre>
Get password: <pre>kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo</pre>
<pre>sudo curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-arm64</pre>
<pre>sudo chmod +x /usr/local/bin/argocd</pre>
<pre>argocd login 192.168.1.208</pre> (using password from above)
Change password: <pre>argocd account update-password --account admin</pre>

AT THIS POINT ARGOCD IS INSTALLED.. need to read up more to find out how to use it!!!????

## Monitoring (NOT INSTALLED) ##
<pre>cd prometheus-operator</pre>
<pre>kubectl create namespace monitoring</pre>
<pre>wget https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml</pre>
<pre>sed -i 's/namespace: default/namespace: monitoring/g' bundle.yaml</pre>
<pre>kubectl apply --server-side -f bundle.yaml</pre>
<pre>kubectl apply -f ./longhorn-service-monitor.yml</pre>
<pre>cd .. && kubectl apply -f prometheus-operator</pre>
<pre>cd kube-state-metrics</pre>
<pre>cd .. && kubectl apply -f kube-state-metrics</pre>
<pre>cd .. && kubectl apply -f kubelet</pre>
<pre>kubectl apply -f monitoring</pre>


# MySQL #
(Adapted from https://zaher.dev/blog/mysql-on-k3s-cluster)

<pre>kubectl create namespace mysql-server</pre>
<pre>kubectl apply -f ./pvc.yml</pre>
<pre>kubectl create configmap mysql-config --from-file=main-config=my-custom.cnf -n mysql-server<pre>
<pre>kubectl apply -f ./deployment.yml</pre>
<pre>kubectl apply -f ./service.yml</pre>




# Wiki #
Create secrets:
Encode username
<pre>echo 'somevalueorother' | base64</pre>
Encode password
<pre>echo 'someothervalue' | base64</pre>

Create secrets file.  Use values from above for username and password
<pre>nano wikimedia-db-secrets.yml</pre>
<pre>apiVersion: v1
kind: Secret
metadata:
  name: wikimedia-db-secrets
type: Opaque
data:
  username: fdgdf==
  password: d2lrhaQ==
</pre>
<pre>kubectl apply -f ./wikimedia-db-secrets</pre>
<pre>kubectl apply -f wiki-deployment.yaml</pre>
<pre>kubectl apply -f wiki-service.yaml</pre>
Open 'http://192.168.1.212' in a browser, complete the questionaire and once complete download 'LocalSettings.php'.
Using Portainer open ConfigMags & Secrets and create a with the name 'wikimedia-secrets'. Add a value named 'main-config' and paste in the contents of 'LocalSettings.php'.
<pre>kubectl apply -f wiki-deployment-final.yaml</pre>






root@control01:~/argo_cd# chmod +x /usr/local/bin/argocd
# mutiPie
bits and pieces for messing with raspberry Pis

To setup sensors

supt apt install lm-sensors sysstat


