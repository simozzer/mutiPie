# Restarting building a K3s cluster on some Raspberry Pis #

## LINKS ##
System is still fairly unstable and may require <pre>sudo systemctl restart k3s</pre>

* (Portainer)[http://192.168.1.203:9000/]
* (Longhorn)[http://192.168.1.201/]
* (ArgoCD)[https://192.168.1.208/]
* (Grafana)[http://192.168.1.206:3000/]
* (Prometheus)[http://192.168.1.205:9090]
* (MySQL) 192.168.1.210:3306
* (PhpMyAdmin)[http://192.168.1.213]
* (Prometheus-external)[http://192.168.1.217:9090]
* (Redis-Server) 192.168.1.204:6379
* (Docker-Registry) 192.168.1.207:5000
* (Wiki) [http://192.168.1.218]
* (Backup) [cifs://10.90.90.96/sharing]


(Most information is from https://rpi4cluster.com/k3s-kubernetes-install/)

I'm starting from a point where I've already built up and tore down this cluster many times, so there will be packages that
I'm using which might not be part of the standard install for Raspberry Pi OS. Don't expect to follow these instructions 
without finding a few undocumented steps.

## Machines in cluster ##
| Name | Type | WLAN IP | ETH IP | RAM | STORAGE | BOOT MEDIA | EXTRAS | ROLE | DESCIPTION \
| - | - | - | - | - | - | - | - | - | - |
| piserver | Pi 5 | 10.10.0.20 | 192.168.1.90 | 8GB | 256GB NVME (USB) | | Hailo8 | AI | Not a Worker. Reserved for AI 
| pi4node1 | Pi 4b | 10.90.90.91 | 192.168.1.29 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker | |
| pi4node2 | Pi 4b | 10.90.90.92 | 192.168.1.28 | 8GB | 32GB USB3 | 128GB MicroSD | | Worker | |
| pi4node3 | Pi 4b | 10.90.90.93 | 192.168.1.27 | 4GB | 32GB USB3 | 128GB MicroSD | | Worker | |
| pi4node4 | Pi 4b | 10.90.90.99 | 192.168.1.24 | 8GB | 256GB NVME (USB) + 32GB USB | 256GB NVME | | Backup | CIFS backup
| pi4node5 | Pi 4b | 10.90.90.98 | 192.168.1.22 | 8GB | 32GB USB3 | 128GB MicroSD | 7 Inch LCD | Master | |
| pi52 | Pi 5 |  | 192.168.1.36 | 8GB | | | | |

I'm using the domain 'dev.com' (e.g. the FQDN for pi4node1 is pi4node1.dev.com).

The machines in this cluster are all running Raspberry Pi OS. Only the 'Master' node has a graphical desktop, the rest are just running a server edition with no desktop.

I've created an SSH key on the 'master' node (pi4node5) and copied it to each of the other nodes in the cluster so that I can SSH into them.

I've edited /etc/hosts on pi4node5: (Note that I've commented out the WLAN IPs because I want all the machines in the cluster to use Ethernet and not Wireless - I may have to fiddle with dhcppd.conf to do this properly). 

Edited /boot/firmware/cmdline.txt to contain 'cgroup_memory=1 cgroup_enable=memory group_enable=cpuset'

I want to keep 'pi4node5' accessible by machines on my network (those that are not in the cluster) but all the other nodes in the cluster should remain hidden.


### /etc/hosts ###
<pre>sudo cp ./etc_hosts /etc/hosts</pre>


#### Instal IP Tables ####
<pre>ansible cube -m apt -a "name=iptables state=present" --become</pre>
I'm guessing this uninstalls UFW
<pre>ansible cube -m apt -a "name=ufw state=absent" --become</pre>

### Install K3S on the cluster ###
(piserver)
<pre>export CONTROL_PLANE_IP=10.90.90.98 && export MY_K3S_TOKEN=dsfuyasdfahjskt234524 && curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644 --disable servicelb --token ${MY_K3S_TOKEN} --node-taint CriticalAddonsOnly=true:NoExecute --tls-san ${CONTROL_PLANE_IP} --node-ip ${CONTROL_PLANE_IP} --disable-cloud-controller --disable local-storage && ansible workers -b -m shell -a "curl -sfL https://get.k3s.io | K3S_URL=https://${CONTROL_PLANE_IP}:6443 K3S_TOKEN=${MY_K3S_TOKEN} sh -s - --node-ip {{ var_ip_eth  }}"</pre>


### Label the worker nodes ###
<pre>(readarray -t ARRAY < worker_names; IFS=','; kubectl label nodes "${ARRAY[@]}" kubernetes.io/role=worker)</pre>
Add another custom label:
<pre>(readarray -t ARRAY < worker_names; IFS=','; kubectl label nodes "${ARRAY[@]}" node-type=worker)</pre>

### Further configuration ###
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

<pre>./prepare_volumes.sh</pre>
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
TODOTODOTODOTODOTODOTODOTODO -tag nodes in portainer


<pre>kubectl apply -f ./longhorn-usb-storage-class.yaml</pre>
<pre>kubectl apply -f ./longhorn-nvme-storage-class.yaml</pre>


##### TROUBLE DELETING LONGHORN #####
Attempt1: <pre>for crd in $(kubectl get crd -o name | grep longhorn); do kubectl patch $crd -p '{"metadata":{"finalizers":[]}}' --type=merge; done;</pre>
Attempt2 WORKED: <pre>for crd in $(kubectl get crd -o name | grep longhorn); do kubectl delete $crd; done;</pre>

#### Make Longorn the default storage class ####
<pre>kubectl patch storageclass local-path -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'</pre>

## Create Docker Registry ##
<pre>kubectl create namespace docker-registry</pre>
<pre>cd docker-registry</pre>
<pre>kubectl apply -f pvc.yml && kubectl apply -f deployment.yml && kubectl apply -f service.yml</pre>
Again this fails
<pre># kubectl get all -n docker-registry
...NAME                       TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)          AGE
...service/registry-service   LoadBalancer   10.43.67.31   <pending>     5000:32447/TCP   69s
</pre>
<pre>fix with 


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

# Monitoring #
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

## install a test dashboard in grafana ##
In grafana load the json from 'starter_dashboard.json'.



# MySQL #
(Adapted from https://zaher.dev/blog/mysql-on-k3s-cluster)

<pre>kubectl create namespace mysql-server</pre>
<pre>kubectl apply -f ./pvc.yml</pre>
<pre>kubectl create configmap mysql-config --from-file=main-config=my-custom.cnf -n mysql-server<pre>
<pre>kubectl apply -f ./deployment.yml</pre>
<pre>kubectl apply -f ./service.yml</pre>

# phpMyAdmin #
<pre>kubectl apply -f deployment.yml</pre>
<pre>kubectl apply -f service.yml</pre>

## Setup Northwind ##
use phpmyadmin (http://192.168.1.213) and run the sql in 'northwind.sql'





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
  username: d2lraQo=
  password: d2lraQo=
</pre>
<pre>kubectl apply -f ./wikimedia-db-secrets</pre>
<pre>kubectl apply -f wiki-deployment.yaml</pre>
<pre>kubectl apply -f wiki-service.yaml</pre>
Open 'http://192.168.1.218' in a browser, complete the questionaire and once complete download 'LocalSettings.php'.
Using Portainer open ConfigMags & Secrets and create a with the name 'wikimedia-secrets'. Add a value named 'main-config' and paste in the contents of 'LocalSettings.php'.
<pre>kubectl apply -f wiki-deployment-final.yaml</pre>
<pre>kubectl cp -n wikiserver LocalSettings.php /wikiserver-86477d8c84-nwkc5:/var/www/html/LocalSettings.php</pre>
<pre>kubectl cp -n wikiserver LocalSettings.php /wikiserver-86477d8c84-nwkc5:~<pre>

kubectl cp -n wikiserver LocalSettings.php /wikiserver-6cc64b58fc-t95gs:/var/www/html/LocalSettings.php
pod/

# Backup #
TODO:  Add instructions on settings up raid array, sharing it with samba, and using it as a cifs backup target cifs://10.90.90.96/sharing










root@control01:~/argo_cd# chmod +x /usr/local/bin/argocd
# mutiPie
bits and pieces for messing with raspberry Pis

To setup sensors

supt apt install lm-sensors sysstat


